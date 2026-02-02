"""
Configuration Test Script

This script tests the configuration and database connection.
Run this to verify your environment setup before running the main application.
"""

import sys
import os
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from src.config import validate_config
    from src.supabase_client import SupabaseClient
except ImportError as e:
    logger.error(f"Failed to import modules: {e}")
    logger.error("Make sure you're running this from the backend directory")
    sys.exit(1)


def test_environment_variables():
    """Test 1: Check environment variables."""
    logger.info("=" * 60)
    logger.info("TEST 1: Environment Variables")
    logger.info("=" * 60)

    required_vars = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        "YOUTUBE_API_KEY": os.getenv("YOUTUBE_API_KEY"),
        "GLM_API_KEY": os.getenv("GLM_API_KEY"),
    }

    all_present = True
    for name, value in required_vars.items():
        if value:
            # Show only first few characters for security
            safe_value = value[:8] + "..." if len(value) > 8 else value
            logger.success(f"✓ {name}: {safe_value}")
        else:
            logger.error(f"✗ {name}: NOT SET")
            all_present = False

    # Optional variables
    logger.info("\nOptional variables:")
    optional_vars = {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "RESEND_API_KEY": os.getenv("RESEND_API_KEY"),
    }
    for name, value in optional_vars.items():
        if value:
            logger.info(f"✓ {name}: Set (optional)")
        else:
            logger.warning(f"⚠ {name}: Not set (optional)")

    return all_present


def test_supabase_connection():
    """Test 2: Check Supabase connection."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 2: Supabase Database Connection")
    logger.info("=" * 60)

    try:
        client = SupabaseClient()
        logger.success("✓ Supabase client initialized successfully")

        # Try to fetch channels
        channels = client.get_active_channels()
        logger.success(f"✓ Successfully fetched {len(channels)} active channels")

        if channels:
            logger.info("\nActive channels:")
            for channel in channels[:3]:  # Show first 3
                logger.info(f"  - {channel['channel_name']} ({channel.get('channel_handle', 'N/A')})")

            if len(channels) > 3:
                logger.info(f"  ... and {len(channels) - 3} more")

        return True

    except Exception as e:
        logger.error(f"✗ Failed to connect to Supabase: {e}")
        return False


def test_directory_structure():
    """Test 3: Check directory structure."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 3: Directory Structure")
    logger.info("=" * 60)

    base_dir = Path(__file__).parent  # backend/ directory
    required_dirs = ["src", "downloads", "logs"]

    all_exist = True
    for dir_name in required_dirs:
        dir_path = base_dir / dir_name
        if dir_path.exists():
            logger.success(f"✓ {dir_name}/ exists")
        else:
            logger.error(f"✗ {dir_name}/ does not exist")
            all_exist = False

    return all_exist


def test_python_version():
    """Test 4: Check Python version."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 4: Python Version")
    logger.info("=" * 60)

    version = sys.version_info
    logger.info(f"Python {version.major}.{version.minor}.{version.micro}")

    if version.major == 3 and version.minor >= 12:
        logger.success("✓ Python version is compatible (>= 3.12)")
        return True
    else:
        logger.error(f"✗ Python version is not compatible (requires 3.12+, got {version.major}.{version.minor})")
        return False


def main():
    """Run all tests."""
    logger.remove()
    logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>")

    logger.info("YouTube to Blog - Configuration Test")
    logger.info("Testing your environment setup...\n")

    results = {
        "Environment Variables": test_environment_variables(),
        "Python Version": test_python_version(),
        "Directory Structure": test_directory_structure(),
        "Supabase Connection": test_supabase_connection(),
    }

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)

    all_passed = True
    for test_name, passed in results.items():
        if passed:
            logger.success(f"✓ {test_name}: PASSED")
        else:
            logger.error(f"✗ {test_name}: FAILED")
            all_passed = False

    logger.info("=" * 60)

    if all_passed:
        logger.success("\n🎉 All tests passed! Your environment is ready.")
        logger.info("\nNext steps:")
        logger.info("1. Add your API keys to backend/.env")
        logger.info("2. Run: uv run python src/main.py --help")
        return 0
    else:
        logger.error("\n❌ Some tests failed. Please fix the issues above.")
        logger.info("\nCommon fixes:")
        logger.info("- Add API keys to backend/.env (use .env.example as reference)")
        logger.info("- Make sure Supabase project is set up and tables are created")
        logger.info("- Check that you're using Python 3.12+")
        return 1


if __name__ == "__main__":
    sys.exit(main())
