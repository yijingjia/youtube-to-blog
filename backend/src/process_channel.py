"""
Process a specific channel - can be called from API or CLI
"""

import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Add backend to path (parent of src)
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.supabase_client import SupabaseClient
from src.processor import VideoProcessor
from src.config import configure_logger
from loguru import logger

# Configure logger with stdout output
configure_logger()


async def main():
    """Process a specific channel."""
    if len(sys.argv) < 2:
        logger.error("Usage: python process_channel.py <channel_id>")
        sys.exit(1)

    channel_id = sys.argv[1]

    logger.info(f"{'='*60}")
    logger.info(f"🎬 Starting channel processing: {channel_id}")
    logger.info(f"{'='*60}")

    # Initialize Supabase client
    supabase = SupabaseClient()

    # Check if channel exists
    channel = supabase.get_channel(channel_id)
    if not channel:
        logger.error(f"Channel not found: {channel_id}")
        sys.exit(1)

    logger.info(f"✅ Found channel: {channel['channel_name']}")

    # Initialize processor
    processor = VideoProcessor(supabase=supabase)

    # Process the channel
    result = await processor.process_channel(channel_id)

    # Print summary
    logger.info(f"{'='*60}")
    logger.info("📊 PROCESSING SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"Total videos found:    {result.get('total', 0)}")
    logger.info(f"✅ Successfully processed: {result.get('processed', 0)}")
    logger.info(f"⏭️  Skipped:              {result.get('skipped', 0)}")
    logger.info(f"❌ Failed:               {result.get('failed', 0)}")

    if result.get('errors'):
        logger.warning("⚠️  Errors (first 5):")
        for error in result['errors'][:5]:
            logger.warning(f"   • {error}")

    logger.info(f"{'='*60}")

    if result.get('status') == 'error':
        sys.exit(1)


if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
