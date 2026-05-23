FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src

FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/src ./src

RUN addgroup -g 1001 appgroup && adduser -D -u 1001 -G appgroup appuser
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["npm", "start"]
