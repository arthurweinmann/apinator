package api

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/arthurweinmann/apinator/internal/config"
	"github.com/arthurweinmann/go-https-hug/pkg/acme"
	"github.com/arthurweinmann/go-https-hug/pkg/storage/stores/filesystem"
)

// StartAPI is blocking
func StartAPI() error {
	err := os.Remove(filepath.Join(config.HOME, "web/config.js"))
	if err != nil {
		return err
	}

	b, err := json.MarshalIndent(&struct {
		APIDomain    string `json:"apidomain"`
		PublicDomain string `json:"publicdomain"`
		IsHTTPS      bool   `json:"ishttps"`
	}{
		APIDomain:    config.APIDomain,
		PublicDomain: config.PublicWebsiteDomain,
		IsHTTPS:      true,
	}, "", "    ")
	if err != nil {
		return err
	}

	err = os.WriteFile(filepath.Join(config.HOME, "web/config.js"), []byte(fmt.Sprintf(`
var config = %s`, string(b))), 0644)
	if err != nil {
		return err
	}

	r := &Router{
		apidomain:              config.APIDomain,
		publicwebsitedomain:    config.PublicWebsiteDomain,
		publicwebsitedirectory: filepath.Join(config.HOME, "web"),
	}

	store, err := filesystem.NewStore(filepath.Join(config.HOME, "storage"))
	if err != nil {
		return err
	}

	err = acme.Init(&acme.InitParameters{
		InMemoryCacheSize:       32 * 1024 * 1024,
		CertificateContactEmail: config.CertificateContactEmail,
		Store:                   store,
		AuthorizedDomains: map[string]map[string]bool{
			config.PublicWebsiteDomain: {
				config.APIDomain: true,
			},
		},
		DNSProvider: nil,
		LogLevel:    acme.DEBUG,
		Logger:      os.Stdout,
	})
	if err != nil {
		return err
	}

	go acme.ServeHTTP(nil, true)

	err = acme.ToggleCertificate([]string{config.PublicWebsiteDomain, config.APIDomain})
	if err != nil {
		return err
	}

	return acme.ServeHTTPS(":443", r, filepath.Join(config.HOME, "https.log"))
}
