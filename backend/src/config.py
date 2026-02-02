"""
Configuration management for YouTube to Blog backend.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from typing import List
from loguru import logger

# Load environment variables
load_dotenv()

# Project paths
BASE_DIR = Path(__file__).parent.parent
SRC_DIR = BASE_DIR / "src"
DOWNLOADS_DIR = BASE_DIR / "downloads"
LOGS_DIR = BASE_DIR / "logs"

# Create directories if they don't exist
DOWNLOADS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)


def configure_logger():
    """Configure loguru logger for the application."""
    # Remove default handler
    logger.remove()

    # Add stdout handler with immediate flush
    logger.add(
        sys.stdout,
        level="INFO",
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        enqueue=False,  # Don't queue, write immediately
        backtrace=True,
        diagnose=True,
    )

    # Also log to file
    logger.add(
        LOGS_DIR / "processor_{time:YYYY-MM-DD}.log",
        level="DEBUG",
        rotation="1 day",
        retention="7 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        backtrace=True,
        diagnose=True,
    )

    return logger


# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# YouTube Configuration
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# GLM API Configuration
GLM_API_KEY = os.getenv("GLM_API_KEY")
GLM_API_BASE = os.getenv("GLM_API_BASE", "https://open.bigmodel.cn/api/paas/v4/")
GLM_MODEL_TRANSLATE = os.getenv("GLM_MODEL_TRANSLATE", "glm-4-flash")
GLM_MODEL_GENERATE = os.getenv("GLM_MODEL_GENERATE", "glm-4-air")

# OpenAI Configuration (Optional - for Whisper fallback)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Schedule Configuration
CRON_SCHEDULE = os.getenv("CRON_SCHEDULE", "0 3 * * *")

# Processing Configuration
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
SKIP_SHORTS = bool(os.getenv("SKIP_SHORTS", "true"))
SHORTS_MAX_DURATION = int(os.getenv("SHORTS_MAX_DURATION", "60"))  # seconds

# Supported target languages
TARGET_LANGUAGES: List[str] = os.getenv("TARGET_LANGUAGES", "zh-Hans").split(",")


# Validate required environment variables
def validate_config() -> None:
    """Validate that all required environment variables are set."""
    required_vars = {
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_ROLE_KEY": SUPABASE_SERVICE_ROLE_KEY,
        "YOUTUBE_API_KEY": YOUTUBE_API_KEY,
        "GLM_API_KEY": GLM_API_KEY,
    }

    missing_vars = [name for name, value in required_vars.items() if not value]

    if missing_vars:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing_vars)}\n"
            "Please set them in your .env file."
        )

    if not OPENAI_API_KEY:
        print("⚠️  Warning: OPENAI_API_KEY not set. Whisper fallback will be disabled.")
