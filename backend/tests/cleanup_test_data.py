"""
Clean up test data from the database.
"""

import sys
from pathlib import Path

# Add src directory to path (tests/ is sibling of src/)
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger
from src.supabase_client import SupabaseClient

def cleanup():
    """Remove test data."""
    logger.info("Cleaning up test data...")

    client = SupabaseClient()

    # Delete test channel
    try:
        response = client.client.table("channels").delete().eq("channel_id", "test_channel_123").execute()
        logger.success("✓ Test channel deleted")
    except Exception as e:
        logger.warning(f"⚠ Test channel may not exist: {e}")

    logger.info("Cleanup complete!")

if __name__ == "__main__":
    cleanup()
