from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./aitestbench.db"
    models_directory: str = "./models"
    default_n_threads: int = 4
    default_n_gpu_layers: int = 0
    scoring_weight_quality: float = 0.5
    scoring_weight_speed: float = 0.3
    scoring_weight_efficiency: float = 0.2

    model_config = {"env_prefix": "ATB_"}


settings = Settings()
