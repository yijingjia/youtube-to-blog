"""
YouTube to Blog - Main Entry Point

This is the main entry point for the backend processing system.
It orchestrates the video fetching, transcription, translation, and article generation.
"""

import asyncio
from loguru import logger
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from src.processor import VideoProcessor
from src.supabase_client import SupabaseClient


def main():
    """Main entry point for video processing."""
    logger.info("YouTube to Blog Backend Starting...")

    # Initialize Supabase client
    supabase = SupabaseClient()

    # Initialize processor
    processor = VideoProcessor(supabase=supabase)

    # Process all active channels
    logger.info("Fetching active channels...")
    channels = supabase.get_active_channels()
    logger.info(f"Found {len(channels)} active channels")

    for channel in channels:
        logger.info(f"Processing channel: {channel['channel_name']}")
        try:
            asyncio.run(processor.process_channel(channel['channel_id']))
        except Exception as e:
            logger.error(f"Error processing channel {channel['channel_name']}: {e}")
            continue

    logger.info("Processing complete!")


if __name__ == "__main__":
    main()
