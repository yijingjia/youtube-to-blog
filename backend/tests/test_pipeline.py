"""
End-to-End Pipeline Test

Test the complete video processing pipeline with a single video.
"""

import sys
import asyncio
from pathlib import Path

# Add src directory to path (tests/ is sibling of src/)
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger
from src.supabase_client import SupabaseClient
from src.processor import VideoProcessor


async def test_single_video():
    """
    Test processing a single video through the complete pipeline.

    This test will:
    1. Fetch video details from YouTube
    2. Fetch English transcript
    3. Translate to target language (zh-Hans)
    4. Generate blog article
    5. Save all data to database
    """
    logger.info("=" * 60)
    logger.info("YouTube to Blog - End-to-End Pipeline Test")
    logger.info("=" * 60)

    # Initialize processor
    supabase = SupabaseClient()
    processor = VideoProcessor(supabase=supabase)

    # Test video: Specific video requested
    test_video_id = "vZdbbN3FCzE"

    logger.info(f"\nTesting with video: {test_video_id}")
    logger.info("Note: This is a quick test. Full videos may take several minutes.")

    # Process the video
    result = await processor.process_single_video(test_video_id)

    # Display results
    logger.info("\n" + "=" * 60)
    logger.info("TEST RESULT")
    logger.info("=" * 60)

    if result["status"] == "success":
        logger.success(f"✓ Processing successful!")
        logger.info(f"Video ID: {result['video_id']}")

        # Verify data was saved
        video = supabase.get_video(test_video_id)
        if video:
            logger.info(f"\n✓ Video record created in database")
            logger.info(f"  Title: {video['title']}")
            logger.info(f"  Status: {video['processing_status']}")

        # Check transcript
        transcript = supabase.get_transcript(test_video_id, "en")
        if transcript:
            logger.info(
                f"\n✓ English transcript saved ({transcript['word_count']} words)"
            )

        # Check article (for zh-Hans)
        article = supabase.get_article(test_video_id, "zh-Hans")
        if article:
            logger.info(f"\n✓ Chinese article generated")
            logger.info(f"  Title: {article['title']}")
            logger.info(f"  Reading time: {article['reading_time']} min")
            logger.info(f"  Summary: {article['summary']}")
            logger.info(f"  Tags: {article['tags']}")

        logger.success("\n🎉 Pipeline test PASSED!")
        logger.info("\nYour YouTube to Blog system is fully functional!")
        logger.info("\nNext steps:")
        logger.info("1. Test with a real video from your subscribed channels")
        logger.info("2. Process all videos from a channel")
        logger.info("3. Set up scheduled execution (launchd/cron)")

    elif result["status"] == "skipped":
        logger.info(f"ℹ Video skipped: {result['message']}")
    else:
        logger.error(f"✗ Processing failed: {result.get('message', 'Unknown error')}")

    logger.info("=" * 60)


def main():
    """Run the pipeline test."""
    logger.remove()
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    )

    try:
        asyncio.run(test_single_video())
        return 0
    except KeyboardInterrupt:
        logger.warning("\n\nTest interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"\n❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
