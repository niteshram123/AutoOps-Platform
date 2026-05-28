FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_GRAFANA_URL=http://localhost:3001
ARG VITE_JENKINS_URL=http://localhost:8080
ARG VITE_ARGOCD_URL=http://localhost:8081
ARG VITE_SONARQUBE_URL=http://localhost:9000
ARG VITE_PROMETHEUS_URL=http://localhost:9090
ARG VITE_ALERTMANAGER_URL=http://localhost:9093
ARG VITE_REGISTRY_UI_URL=http://localhost:8082
ENV VITE_GRAFANA_URL=$VITE_GRAFANA_URL
ENV VITE_JENKINS_URL=$VITE_JENKINS_URL
ENV VITE_ARGOCD_URL=$VITE_ARGOCD_URL
ENV VITE_SONARQUBE_URL=$VITE_SONARQUBE_URL
ENV VITE_PROMETHEUS_URL=$VITE_PROMETHEUS_URL
ENV VITE_ALERTMANAGER_URL=$VITE_ALERTMANAGER_URL
ENV VITE_REGISTRY_UI_URL=$VITE_REGISTRY_UI_URL
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
