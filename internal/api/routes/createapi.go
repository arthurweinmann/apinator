package routes

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/arthurweinmann/apinator/internal/config"
	"github.com/arthurweinmann/apinator/internal/utils"
	"github.com/gorilla/websocket"
)

var gptengineerpath string

func init() {
	out, err := exec.Command("which", "gpt-engineer").CombinedOutput()
	if err != nil {
		panic(fmt.Errorf("We could not find gpt-engineer: %v %v", err, string(out)))
	}
	if string(out) == "" {
		panic(fmt.Errorf("We could not find gpt-engineer"))
	}
	gptengineerpath = strings.Trim(string(out), " \n\r\t")
}

var upgrader = websocket.Upgrader{
	HandshakeTimeout: 5 * time.Second,
	Error: func(w http.ResponseWriter, r *http.Request, status int, reason error) {
		utils.SendError(w, reason.Error(), "websocketProtocol", status)
	},
	CheckOrigin: func(r *http.Request) bool {
		if strings.Contains(r.Header.Get("origin"), config.PublicWebsiteDomain) {
			return true
		}
		return false
	},
}

type CreateAPISeed struct {
	Prompt string `json:"prompt"`
}

type MessageFromBackend struct {
	Success          bool   `json:"success"`
	ProjectReference string `json:"project_reference"`
	Chunk            string `json:"chunk"`
	Finished         bool   `json:"finished"`
}

type MessageFromFrontend struct {
	Ack      bool   `json:"ack"`
	Response string `json:"response"`
}

func CreateAPI(w http.ResponseWriter, r *http.Request) {
	var err error

	if !websocket.IsWebSocketUpgrade(r) {
		utils.SendError(w, "you must connect to this route through a websocket", "invalidProtocol", 400)
		return
	}

	var sock *websocket.Conn
	sock, err = upgrader.Upgrade(w, r, nil)
	if err != nil {
		utils.SendError(w, err.Error(), "invalidProtocol", 400)
		return
	}
	defer sock.Close()

	var rawmess []byte
	_, rawmess, err = sock.ReadMessage()
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("could not read message: %v", "invalidMessage", err))
		return
	}

	seed := &CreateAPISeed{}
	err = json.Unmarshal(rawmess, seed)
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("invalid first seed message: could not unmarshal: %v", "invalidMessage", err))
		return
	}

	var projref string
	projref, err = utils.UniqueSecureID60()
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v", "internalError", err))
		return
	}

	err = os.MkdirAll(filepath.Join(config.HOME, "projects", projref), 0700)
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v", "internalError", err))
		return
	}
	defer func() {
		if err != nil {
			os.RemoveAll(filepath.Join(config.HOME, "projects", projref))
		}
	}()

	err = os.WriteFile(filepath.Join(config.HOME, "projects", projref, "prompt"), []byte(seed.Prompt), 0644)
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v", "internalError", err))
		return
	}

	err = sendSockJSON(sock, &MessageFromBackend{Success: true, ProjectReference: projref})
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v", "internalError", err))
		return
	}

	cmd := exec.Command(gptengineerpath, filepath.Join(config.HOME, "projects", projref))
	cmd.Dir = filepath.Join(config.HOME, "projects", projref)
	cmd.Env = append(os.Environ(), "OPENAI_API_KEY="+config.OpenAIKey)

	var stdout io.ReadCloser
	stdout, err = cmd.StdoutPipe()
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v", "internalError", err))
		return
	}

	var stdin io.WriteCloser
	stdin, err = cmd.StdinPipe()
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v", "internalError", err))
		return
	}

	stderr := bytes.NewBuffer(nil)
	cmd.Stderr = stderr

	if err = cmd.Start(); err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v %v", "internalError", err, stderr.String()))
		return
	}

	s := bufio.NewScanner(stdout)
	for s.Scan() {
		err = sendSockJSON(sock, &MessageFromBackend{
			Success:          true,
			ProjectReference: projref,
			Chunk:            string(s.Bytes()),
		})
		if err != nil {
			sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v %v", "internalError", err, stderr.String()))
			return
		}

		var ack *MessageFromFrontend
		ack, err = readSockJSON(sock)
		if err != nil {
			sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("could not read ack message: %v", "invalidACK", err))
			return
		}
		if !ack.Ack {
			sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("invalid message ack boolean", "invalidACK"))
			return
		}
		if ack.Response != "" {
			_, err = stdin.Write([]byte(ack.Response))
			if err != nil {
				sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v", "internalError", err))
				return
			}
		}
	}

	stdin.Close()
	stdout.Close()

	if err = cmd.Wait(); err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v", "internalError", err))
		return
	}

	err = sendSockJSON(sock, &MessageFromBackend{
		Success:          true,
		ProjectReference: projref,
		Finished:         true,
	})
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("internal error: %v %v", "internalError", err, stderr.String()))
		return
	}

	var ack *MessageFromFrontend
	ack, err = readSockJSON(sock)
	if err != nil {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("could not read ack message: %v", "invalidACK", err))
		return
	}
	if !ack.Ack {
		sock.WriteMessage(websocket.TextMessage, utils.MarshalJSONErr("invalid message ack boolean", "invalidACK"))
		return
	}
}

func sendSockJSON(sock *websocket.Conn, message *MessageFromBackend) error {
	b, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return sock.WriteMessage(websocket.TextMessage, b)
}

func readSockJSON(sock *websocket.Conn) (*MessageFromFrontend, error) {

	// We do not need a mutex since those variable are never accessed concurrently
	var rawmess []byte
	var err error

	done := make(chan bool, 1)

	go func() {
		_, rawmess, err = sock.ReadMessage()
		done <- true
	}()

	select {
	case <-done:
	case <-time.After(45 * time.Second):
		return nil, fmt.Errorf("timeout waiting for response from frontend")
	}

	if err != nil {
		return nil, err
	}

	mess := &MessageFromFrontend{}
	err = json.Unmarshal(rawmess, mess)
	if err != nil {
		return nil, err
	}

	return mess, nil
}
