COMPOSE := docker compose -f docker-compose.dev.yml
.DEFAULT_GOAL := help

.PHONY: help build dev

##@ Development

build: ## Generate public/index.html in Docker
	$(COMPOSE) run --rm --no-deps -T site sh -c 'npm ci && npm run build'

dev: ## Rebuild on index.pug changes and preview at http://localhost:8001
	$(COMPOSE) up

##@ Help

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*##"; section = ""} \
	/^##!/ { print substr($$0, 5); next } \
	/^[a-zA-Z0-9_.-]+:.*##/ { \
		if (section != "") printf "\n\033[1m%s\033[0m\n", section; \
		section = ""; \
		printf "  \033[36m%-11s\033[0m %s\n", $$1, $$2; next \
	} \
	/^##@/ { section = substr($$0, 5); next }' $(MAKEFILE_LIST)
