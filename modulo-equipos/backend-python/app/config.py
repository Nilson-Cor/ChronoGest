from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    PORT: int = 3001
    DB_HOST: str = "localhost"
    DB_PORT: int = 5435
    DB_USER: str = "postgres"
    DB_PASS: str = "password"
    DB_NAME: str = "equipos_db"
    JWT_SECRET: str = ""
    MAIN_API_URL: str = "http://localhost:3000/api"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()
