SHELL := /bin/bash

REMOTE ?= origin
BRANCH ?= master
MSG ?= Update blog $(shell date "+%Y-%m-%d %H:%M:%S")

.PHONY: help install icons test check build verify status commit push publish deploy

help:
	@printf "Targets:\n"
	@printf "  make verify                  Generate icons, test, check, and build\n"
	@printf "  make publish MSG=\"message\"   Verify, commit all non-ignored changes, and push\n"
	@printf "  make status                  Show git status\n"

install:
	npm ci

icons:
	node scripts/generate-favicons.mjs

test:
	npm test

check:
	npm run check

build:
	npm run build

verify: icons test check build

status:
	git status --short

commit: verify
	git add -A
	@if git diff --cached --quiet; then \
		echo "No staged changes to commit."; \
	else \
		git commit -m "$(MSG)"; \
	fi

push:
	git push $(REMOTE) $(BRANCH)

publish: commit push

deploy: publish