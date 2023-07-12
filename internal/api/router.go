package api

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/arthurweinmann/apinator/internal/api/routes"
	"github.com/arthurweinmann/apinator/internal/config"
	"github.com/arthurweinmann/apinator/internal/utils"
	"github.com/arthurweinmann/go-https-hug/pkg/acme"
)

type Router struct {
	apidomain              string
	publicwebsitedomain    string
	publicwebsitedirectory string
}

func (s *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if config.MDP == "" {
		panic("")
	}

	stripedhost := utils.StripPort(r.Host)

	if strings.HasPrefix(r.URL.Path, acme.ACME_CHALLENGE_URL_PREFIX) && len(r.URL.Path) > len(acme.ACME_CHALLENGE_URL_PREFIX) {
		keyauth, err := acme.GetChallenge(stripedhost, r.URL.Path[len(acme.ACME_CHALLENGE_URL_PREFIX):])
		if err != nil {
			fmt.Println("certificates.GetChallenge", err)
			w.WriteHeader(404)
			return
		}

		w.WriteHeader(200)
		w.Write(keyauth)

		return
	}

	if stripedhost == s.apidomain {
		s.api(w, r)
		return
	}

	if stripedhost == s.publicwebsitedomain {
		s.dashboard(w, r)
		return
	}

	utils.SendError(w, "we do not recognize this domain name", "invalidDomainName", 403)
	return
}

func (s *Router) dashboard(w http.ResponseWriter, r *http.Request) {
	// Check for .. in the path and respond with an error if it is present
	// otherwise users could access any file on the server
	if utils.ContainsDotDot(r.URL.Path) {
		utils.SendError(w, "invalid Path", "invalidPath", 400)
		return
	}

	err := s.setupCORS(w, "https://"+s.publicwebsitedomain)
	if err != nil {
		utils.SendError(w, "this origin is not allowed", "invalidOriginHeader", 403)
		return
	}

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	upath := r.URL.Path

	if !strings.HasPrefix(upath, "/") {
		upath = "/" + upath
		r.URL.Path = upath
	}

	const indexPage = "index.html"

	fullName := filepath.Join(s.publicwebsitedirectory, filepath.FromSlash(path.Clean(upath)))

	if fullName[len(fullName)-1] == '/' {
		fullName = filepath.Join(fullName, indexPage)
	}

	info, err := os.Stat(fullName)

	valid := false
	if err != nil || info.IsDir() {
		if err != nil && !os.IsNotExist(err) {
			utils.SendInternalError(w, "router:dashboard", err)
			return
		}

		info, err = os.Stat(fullName + ".html")
		if err != nil || info.IsDir() {
			if err != nil && !os.IsNotExist(err) {
				utils.SendInternalError(w, "router:dashboard", err)
				return
			}

			info, err := os.Stat(filepath.Join(fullName, indexPage))
			if err != nil || info.IsDir() {
				if err != nil && !os.IsNotExist(err) {
					utils.SendInternalError(w, "router:dashboard", err)
					return
				}
			} else {
				fullName = filepath.Join(fullName, indexPage)
				valid = true
			}
		} else {
			fullName = fullName + ".html"
			valid = true
		}
	} else {
		valid = true
	}

	if !valid {
		// TODO: use web 404 dedicated page
		utils.SendError(w, "page not found", "notFound", 404)
		return
	}

	content, err := os.Open(fullName)
	if err != nil {
		utils.SendInternalError(w, "router:dashboard", err)
		return
	}

	ctype := mime.TypeByExtension(filepath.Ext(fullName))
	if ctype == "" {
		var buf [512]byte
		n, _ := io.ReadFull(content, buf[:])
		ctype = http.DetectContentType(buf[:n])

		var nn int
		for nn < n {
			l, err := w.Write(buf[nn:])
			nn += l
			if err != nil {
				utils.SendInternalError(w, "router:dashboard", err)
				return
			}
		}
	}

	w.Header().Set("Content-Type", ctype)
	io.Copy(w, content)
}

type rootResponse struct {
	Success bool `json:"success"`
}

func (s *Router) api(w http.ResponseWriter, r *http.Request) {
	spath := utils.SplitSlash(r.URL.Path)

	err := s.setupCORS(w, "https://"+s.publicwebsitedomain)
	if err != nil {
		utils.SendError(w, "this origin is not allowed", "invalidOriginHeader", 403)
		return
	}

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Header.Get("X-APINATOR-AUTH") != config.MDP && r.Header.Get("Sec-WebSocket-Protocol") != config.MDP {
		utils.SendError(w, "you are not authorized", "forbidden", 403)
		return
	}

	if len(spath) == 0 || (len(spath) == 1 && (spath[0] == "" || spath[0] == "/")) {
		utils.SendSuccess(w, &rootResponse{
			Success: true,
		})
		return
	}

	// Unauthenticated
	switch r.Header.Get("X-APINATOR-APIVERSION") {
	case "", "v1":
		switch spath[0] {
		}
	}

	// Authentication checkpoint
	// user, sessToken, continu := auth.Auth(w, r)
	// if !continu {
	// 	return
	// }

	switch r.Header.Get("X-APINATOR-APIVERSION") {
	case "", "v1":
		switch spath[0] {
		case "createapi":
			routes.CreateAPI(w, r)
			return
		}
	}

	utils.SendError(w, fmt.Sprintf("Route %s with method %s does not exist", r.URL.Path, r.Method), "invalidRoute", 404)
}

func (s *Router) setupCORS(w http.ResponseWriter, origin string) error {
	h := w.Header()

	// allow-Origin as wildcard and allow credentials are not allowed both at the same time.
	if origin == "" {
		return fmt.Errorf("no origin specified")
	}

	h.Add("Access-Control-Allow-Origin", origin)
	h.Add("Access-Control-Allow-Credentials", "true")

	h.Add("Access-Control-Allow-Methods", "POST, PUT, GET, DELETE, OPTIONS")
	h.Add("Access-Control-Allow-Headers", "X-APINATOR-AUTH,Sec-WebSocket-Protocol,Origin,Accept,Access-Control-Allow-Origin,Access-Control-Allow-Methods,Access-Control-Allow-Headers,Access-Control-Allow-Credentials,Accept-Encoding,Accept-Language,Access-Control-Request-Headers,Access-Control-Request-Method,Cache-Control,Connection,Host,Pragma,Referer,Sec-Fetch-Dest,Sec-Fetch-Mode,Sec-Fetch-Site,Set-Cookie,User-Agent,Vary,Method,Content-Type,Content-Length")
	h.Add("Vary", "*")
	h.Add("Cache-Control", "no-store")

	return nil
}
