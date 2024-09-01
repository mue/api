# syntax=docker/dockerfile:1

FROM golang:1.23 AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y gcc
COPY go.mod go.sum ./
RUN go mod download
COPY ./ ./
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags '-extldflags "-static"' -o ./api

FROM golang:1.23 AS runner
COPY --from=builder /build/api /api
ENV SERVER_PORT=80
EXPOSE 80
CMD ["/api"]