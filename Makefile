BUILDDIR                 := $(CURDIR)/build


# It's necessary to set this because some environments don't link sh -> bash.
SHELL                             = /usr/bin/env bash

GOPATH                            = $(shell go env GOPATH)
GOBIN                             = $(shell which go)
ARCH                              = $(shell uname -p)

GIT_COMMIT                        = $(shell git rev-parse HEAD)
GIT_SHA                           = $(shell git rev-parse --short HEAD)
GIT_TAG                           = $(shell git describe --tags --abbrev=0 --exact-match 2>/dev/null)
GIT_DIRTY                         = $(shell test -n "`git status --porcelain`" && echo "dirty" || echo "clean")

# +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
# +++ Check bash installed

DEPTEST=$(shell command -v $(SHELL) 2> /dev/null)
ifeq ($(DEPTEST),)
$(error "We could not find bash")
endif


# +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


# --------------------------------------------------------------------------------
# --------------------------------------------------------------------------------
# --------------------------------------------------------------------------------

.PHONY: all
all: build

.PHONY: build
build: check-generic-dep build-web build-gpt-engineer build-apinator


.PHONY: build-apinator
build-apinator: $(BUILDDIR)
	rm -f $(BUILDDIR)/apinator && \
	cd $(CURDIR)/cmd/apinator && \
	go mod tidy && \
	GOPROXY=direct go get -u github.com/arthurweinmann/go-https-hug@latest && \
	go mod tidy && \
	go build -ldflags="-X 'github.com/arthurweinmann/apinator/internal/config.MDP=${MDP}'" && \
	mv apinator $(BUILDDIR)/

.PHONY: build-gpt-engineer
build-gpt-engineer: $(BUILDDIR)
	rm -rf $(BUILDDIR)/gpt-engineer && \
	cd $(BUILDDIR) && git clone https://github.com/arthurweinmann/gpt-engineer.git && \
	cd gpt-engineer && pip install build && python -m build && mv dist/*.whl $(BUILDDIR) && cd $(BUILDDIR) && rm -rf $(BUILDDIR)/gpt-engineer

.PHONY:build-web
build-web: $(BUILDDIR)
	rm -rf $(BUILDDIR)/web && rm -f $(CURDIR)/web/js/lib/boxedmonaco.js && \
	cd $(CURDIR)/web/js/lib/ && wget https://github.com/arthurweinmann/boxed-monaco-editor/releases/download/14168a9/boxedmonaco.js && \
	cd $(CURDIR) && \
	mkdir -p $(BUILDDIR)/web && cp -r $(CURDIR)/web/* $(BUILDDIR)/web

PHONY:check-generic-dep
check-generic-dep:
	@command -v git >/dev/null 2>&1 || { echo >&2 "git is not installed or not in path"; exit 1; }
	@command -v which >/dev/null 2>&1 || { echo >&2 "which is not installed or not in path"; exit 1; }
	@command -v make >/dev/null 2>&1 || { echo >&2 "make is not installed or not in path"; exit 1; }
	@command -v tar >/dev/null 2>&1 || { echo >&2 "tar is not installed or not in path"; exit 1; }
	@command -v go >/dev/null 2>&1 || { echo >&2 "go is not installed or not in path"; exit 1; }
	@command -v python3 >/dev/null 2>&1 || { echo >&2 "python3 is not installed or not in path"; exit 1; }

$(BUILDDIR):
	@mkdir -p $(BUILDDIR)