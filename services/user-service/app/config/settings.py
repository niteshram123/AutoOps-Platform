from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "user-service"
    service_version: str = "1.0.0"
    port: int = 8000
    log_level: str = "INFO"
    max_users: int = 1000

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
