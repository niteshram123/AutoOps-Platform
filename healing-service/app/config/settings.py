from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_NAME: str = "healing-service"
    PORT: int = 8888
    LOG_LEVEL: str = "info"

    # AI
    ANTHROPIC_API_KEY: str = ""
    AI_ENABLED: bool = True

    # ArgoCD
    ARGOCD_URL: str = "http://argocd-server.autoops-ops:8080"
    ARGOCD_TOKEN: str = ""

    # Kubernetes
    KUBERNETES_IN_CLUSTER: bool = False

    # Observability integrations
    PROMETHEUS_URL: str = "http://prometheus:9090"
    GRAFANA_URL: str = "http://grafana:3001"
    GRAFANA_USER: str = "admin"
    GRAFANA_PASSWORD: str = "autoops-grafana-2024"

    # Security
    WEBHOOK_SECRET: str = "autoops-webhook-secret"

    # Storage
    AUDIT_STORAGE_PATH: str = "/app/audit/healing-events.json"

    # Behaviour
    HEALING_COOLDOWN_SECONDS: int = 300

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
