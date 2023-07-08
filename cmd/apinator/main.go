package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/arthurweinmann/apinator/internal/api"
	"github.com/arthurweinmann/apinator/internal/config"
)

func main() {
	boolArgs, stringargs := parseArgs()

	for argname := range boolArgs {
		switch argname {
		case "help":
			fmt.Println(`You may use:
			--home to set the home directory
			--apidomain to set the domain serving the api
			--webdomain to set the domain serving the public website
			--contactemail to set the contact email for the creation of let's encrypt certificates
			--openaikey to set the openai api key (with acccess to GPT4)
			`)
			return
		default:
			log.Fatalf("unrecognized bool argument %s", argname)
		}
	}

	for argname, argval := range stringargs {
		switch argname {
		default:
			log.Fatalf("unrecognized string argument %s", argname)
		case "home":
			config.HOME = argval
		case "apidomain":
			config.APIDomain = argval
		case "webdomain":
			config.PublicWebsiteDomain = argval
		case "contactemail":
			config.CertificateContactEmail = argval
		case "openaikey":
			config.OpenAIKey = argval
		}
	}

	if config.HOME == "" || config.APIDomain == "" || config.PublicWebsiteDomain == "" || config.CertificateContactEmail == "" ||
		config.OpenAIKey == "" {
		log.Fatal("command line arguments --home, --apidomain, --openaikey, --contactemail and --webdomain are mandatory")
	}

	err := api.StartAPI()
	if err != nil && err != http.ErrServerClosed {
		panic(err)
	}
}

func parseArgs() (map[string]bool, map[string]string) {
	boolArgs := make(map[string]bool)
	strArgs := make(map[string]string)

	for i := 1; i < len(os.Args); i++ {
		if strings.HasPrefix(os.Args[i], "--") {
			arg := strings.TrimPrefix(os.Args[i], "--")
			if i+1 < len(os.Args) && !strings.HasPrefix(os.Args[i+1], "--") {
				strArgs[arg] = os.Args[i+1]
				i++ // skip next arg
			} else {
				boolArgs[arg] = true
			}
		}
	}

	return boolArgs, strArgs
}
