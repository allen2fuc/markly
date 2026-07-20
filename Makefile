REPOSITORY_NAME := registry.cn-hangzhou.aliyuncs.com/allen2fuc/markly:latest

install:
	uv sync

dev:
	mkdir -p data
	uv run uvicorn src.main:app --reload --port 8000

seed:
	mkdir -p data
	uv run python seed.py

clean:
	rm -f data/markly.db

build:
	docker build --platform linux/amd64 . -t ${REPOSITORY_NAME}

push:
	docker push ${REPOSITORY_NAME}