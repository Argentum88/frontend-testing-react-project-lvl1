install: install-deps

run:
	bin/page-loader.js

install-deps:
	npm ci

test:
	npm test

lint:
	npx eslint .
