.PHONY: dev install seed clean docker-up docker-down docker-build

install:
	uv sync

dev:
	mkdir -p data
	uv run uvicorn src.main:app --reload --port 8001

seed:
	mkdir -p data
	uv run python seed.py

clean:
	rm -f data/markly.db

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down
