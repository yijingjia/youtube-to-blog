"""
Clean up specific test video data
"""

import sys
from pathlib import Path

# Add src directory to path (tests/ is sibling of src/)
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.supabase_client import SupabaseClient
from loguru import logger

def cleanup_video(video_id: str = "dQw4w9WgXcQ"):
    """Delete a test video and all related data."""
    logger.info(f"Cleaning up video: {video_id}")

    supabase = SupabaseClient()

    # Get video
    video = supabase.get_video(video_id)

    if video:
        # Delete will cascade to transcripts and articles
        supabase.client.table('videos').delete().eq('video_id', video_id).execute()
        logger.success(f"✓ Video {video_id} and related data deleted")
    else:
        logger.info(f"Video {video_id} not found")

if __name__ == "__main__":
    cleanup_video()
