# syntax=docker/dockerfile:1

FROM golang:1.23

RUN apt-get update && apt-get install -y gcc

RUN useradd -ms /bin/sh -u 1001 app
USER app
WORKDIR /app

COPY --chown=app:app go.mod go.sum ./
RUN go mod download

COPY --chown=app ./ ./

ENV SERVER_PORT=8080
ENV CGO_ENABLED=1

CMD go run -ldflags '-extldflags "-static"' .

EXPOSE 8080