# syntax=docker/dockerfile:1

FROM oven/bun:1 AS frontend
WORKDIR /app

COPY frontend/package.json frontend/bun.lock ./frontend/
WORKDIR /app/frontend
RUN bun install --frozen-lockfile

WORKDIR /app
COPY frontend ./frontend
RUN mkdir -p /app/backend \
    && cd /app/frontend \
    && bun run build

FROM rust:1-bookworm AS backend-builder
WORKDIR /app/backend

COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
COPY --from=frontend /app/backend/public ./public
RUN cargo build --release

FROM debian:bookworm-slim AS runtime
RUN useradd --system --create-home --home-dir /app parinator \
    && mkdir -p /app/public /data \
    && chown -R parinator:parinator /app /data

WORKDIR /app
COPY --from=backend-builder /app/backend/target/release/parinator-api /usr/local/bin/parinator-api
COPY --from=frontend /app/backend/public /app/public

ENV API_ADDR=0.0.0.0:8080
ENV STATIC_DIR=/app/public
ENV DATABASE_URL=sqlite:///data/parinator.db

EXPOSE 8080

USER parinator
CMD ["parinator-api"]
