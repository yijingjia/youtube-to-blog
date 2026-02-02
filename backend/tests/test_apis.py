"""
API Connection Test Script

Test individual API connections to verify they work correctly.
"""

import sys
import os
from pathlib import Path

# Add src directory to path (tests/ is sibling of src/)
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger
from dotenv import load_dotenv

load_dotenv()

try:
    from src.config import validate_config
    from src.supabase_client import SupabaseClient
except ImportError as e:
    logger.error(f"Failed to import modules: {e}")
    sys.exit(1)


def test_youtube_api():
    """Test YouTube Data API v3 connection."""
    logger.info("=" * 60)
    logger.info("TEST: YouTube Data API v3")
    logger.info("=" * 60)

    try:
        from googleapiclient.discovery import build
        from src.config import YOUTUBE_API_KEY

        youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

        # Test: Get video info for a popular video (Rick Roll)
        request = youtube.videos().list(
            part="snippet,contentDetails,statistics", id="dQw4w9WgXcQ"
        )
        response = request.execute()

        if response["items"]:
            video = response["items"][0]
            logger.success(f"✓ Successfully connected to YouTube API")
            logger.info(f"  Test video: {video['snippet']['title']}")
            logger.info(f"  Duration: {video['contentDetails']['duration']}")
            logger.info(f"  Views: {video['statistics']['viewCount']}")
            return True
        else:
            logger.error("✗ Video not found")
            return False

    except Exception as e:
        logger.error(f"✗ Failed to connect to YouTube API: {e}")
        return False


def test_glm_api():
    """Test GLM API connection."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST: GLM API")
    logger.info("=" * 60)

    try:
        from openai import OpenAI
        from src.config import GLM_API_KEY, GLM_API_BASE

        client = OpenAI(api_key=GLM_API_KEY, base_url=GLM_API_BASE)

        # Test: Simple completion
        response = client.chat.completions.create(
            model="glm-4.5-air",
            messages=[
                {"role": "user", "content": "Say 'API test successful' in English."}
            ],
            max_tokens=50,
        )

        if response.choices:
            result = response.choices[0].message.content
            logger.success("✓ Successfully connected to GLM API")
            logger.info(f"  Response: {result}")
            return True
        else:
            logger.error("✗ No response from GLM API")
            return False

    except Exception as e:
        logger.error(f"✗ Failed to connect to GLM API: {e}")
        logger.info("  Tip: Check if GLM_API_BASE is correct")
        logger.info("  Standard: https://open.bigmodel.cn/api/paas/v4")
        logger.info("  Yours:   " + os.getenv("GLM_API_BASE", "not set"))
        return False


def test_supabase_write():
    """Test Supabase write operation."""
    logger.info("\n" + "=" * 60)
    logger.info("TEST: Supabase Write Operation")
    logger.info("=" * 60)

    try:
        client = SupabaseClient()

        # Test: Try to insert a test channel (will fail if duplicate, that's ok)
        test_channel = {
            "channel_id": "test_channel_123",
            "channel_name": "Test Channel",
            "channel_handle": "testchannel",
            "description": "This is a test channel",
            "target_languages": ["zh-Hans"],
            "is_active": True,
        }

        try:
            result = client.create_channel(test_channel)
            logger.success("✓ Successfully created test channel")
            logger.info(f"  Channel ID: {result['id']}")
        except Exception as e:
            if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                logger.success("✓ Write permission confirmed (channel already exists)")
            else:
                raise e

        return True

    except Exception as e:
        logger.error(f"✗ Failed Supabase write test: {e}")
        return False


def main():
    """Run all API tests."""
    logger.remove()
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    )

    logger.info("YouTube to Blog - API Connection Test")
    logger.info("Testing API connections...\n")

    results = {
        "YouTube Data API": test_youtube_api(),
        "GLM-4 API": test_glm_api(),
        "Supabase Write": test_supabase_write(),
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
        logger.success("\n🎉 All API tests passed!")
        logger.info("\nYour environment is fully configured and ready to use.")
        logger.info("\nNext steps:")
        logger.info("1. Create remaining backend modules")
        logger.info("2. Test video processing pipeline")
        logger.info("3. Set up scheduled execution")
        return 0
    else:
        logger.error("\n❌ Some API tests failed.")
        logger.info("\nPlease check:")
        logger.info("- API keys are correct")
        logger.info("- APIs are enabled in respective consoles")
        logger.info("- Network connection is stable")
        return 1


if __name__ == "__main__":
    sys.exit(main())
