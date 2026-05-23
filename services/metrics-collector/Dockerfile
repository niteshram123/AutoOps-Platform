FROM golang:1.21-alpine AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -ldflags="-w -s" -o /out/metrics-collector ./cmd/...

FROM alpine:3.18 AS production

RUN adduser -D -u 1001 appuser
WORKDIR /app
COPY --from=builder /out/metrics-collector /app/metrics-collector
USER appuser

EXPOSE 9091
EXPOSE 9090
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget -qO- http://localhost:9091/health || exit 1
CMD ["/app/metrics-collector"]
