"""
Video Processor - Core Processing Pipeline

Orchestrates the entire video processing workflow from fetching new videos
to generating translated articles.
"""

import asyncio
import inspect
from loguru import logger
from typing import List, Dict, Any, Optional
from datetime import datetime

from src.youtube_client import YouTubeClient
from src.transcript_fetcher import TranscriptFetcher
from src.translator import Translator
from src.article_generator import ArticleGenerator
from src.supabase_client import SupabaseClient
from src.config import SKIP_SHORTS, SHORTS_MAX_DURATION, TARGET_LANGUAGES, MAX_RETRIES


class VideoProcessor:
    """Orchestrates video processing pipeline."""

    def __init__(self, supabase: SupabaseClient):
        """
        Initialize video processor.

        Args:
            supabase: Supabase client instance
        """
        self.supabase = supabase
        self.youtube_client = YouTubeClient()
        self.transcript_fetcher = TranscriptFetcher()
        self.translator = Translator()
        self.article_generator = ArticleGenerator()

        logger.info("Video processor initialized")

    # -------------------------
    # Channel Processing
    # -------------------------

    async def process_channel(self, channel_id: str) -> Dict[str, Any]:
        """
        Process all new videos from a channel.

        Args:
            channel_id: YouTube channel ID

        Returns:
            Processing summary dict
        """
        logger.info(f"📡 Processing channel: {channel_id}")

        # Get channel from database to get target_languages
        channel = self.supabase.get_channel(channel_id)
        if not channel:
            logger.error(f"Channel not found in database: {channel_id}")
            return {"status": "error", "message": "Channel not found in database"}

        # Extract target languages from channel config, fallback to global config
        target_languages = channel.get("target_languages", TARGET_LANGUAGES)
        logger.info(f"Channel target languages: {target_languages}")

        # Fetch new videos via RSS (no quota)
        logger.info(f"🔍 Fetching videos via RSS...")
        video_ids = self.youtube_client.fetch_new_videos_via_rss(channel_id)
        logger.info(f"✅ Found {len(video_ids)} videos via RSS")

        if not video_ids:
            logger.info(f"No new videos for channel {channel_id}")
            return {"status": "success", "processed": 0}

        # Process each video
        results = {
            "total": len(video_ids),
            "processed": 0,
            "skipped": 0,
            "failed": 0,
            "errors": [],
        }

        logger.info(f"🎬 Processing {len(video_ids)} videos...")

        for idx, video_id in enumerate(video_ids, 1):
            logger.info(f"[{idx}/{len(video_ids)}] Processing {video_id}...")
            result = await self.process_video(video_id, channel_id, target_languages)

            if result["status"] == "success":
                logger.success(f"✅ [{idx}/{len(video_ids)}] {video_id} completed")
                results["processed"] += 1
            elif result["status"] == "skipped":
                logger.warning(f"⏭️  [{idx}/{len(video_ids)}] {video_id} skipped")
                results["skipped"] += 1
            else:
                logger.error(
                    f"❌ [{idx}/{len(video_ids)}] {video_id} failed: {result.get('message', 'Unknown')}"
                )
                results["failed"] += 1
                results["errors"].append(result.get("message", "Unknown error"))

        # Update channel last_checked timestamp
        self.supabase.update_channel_last_checked(channel_id)

        logger.success(f"✅ Channel processing complete")
        return results

    # -------------------------
    # Video Processing
    # -------------------------

    async def process_video(
        self,
        video_id: str,
        channel_id: Optional[str] = None,
        target_languages: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Process a single video through the complete pipeline.

        Args:
            video_id: YouTube video ID
            channel_id: Optional channel ID
            target_languages: Optional list of target languages (defaults to channel config or global config)

        Returns:
            Processing result dict
        """
        logger.info(f"Processing video: {video_id}")

        # Check if video already processed
        existing_video = self.supabase.get_video(video_id)
        if existing_video and existing_video.get("processing_status") == "completed":
            logger.info(f"Video {video_id} already processed, skipping")
            return {"status": "skipped", "message": "Already processed"}

        # Fetch video metadata
        video_details = self.youtube_client.get_video_details(video_id)
        if not video_details:
            return {"status": "error", "message": "Failed to fetch video details"}

        logger.info(f"Video: {video_details['title']} ({video_details['duration']}s)")

        # Skip Shorts if enabled
        if SKIP_SHORTS and self.youtube_client.is_shorts(
            video_details["duration"], SHORTS_MAX_DURATION
        ):
            logger.info(f"Skipping Short video: {video_id}")
            # Mark as skipped with full metadata to avoid NOT NULL constraint errors
            self.supabase.upsert_video(
                {
                    "video_id": video_id,
                    "title": video_details["title"],
                    "description": video_details.get("description", ""),
                    "thumbnail_url": video_details.get("thumbnail_url", ""),
                    "duration": video_details["duration"],
                    "published_at": video_details.get("published_at"),
                    "view_count": video_details.get("view_count"),
                    "like_count": video_details.get("like_count"),
                    "comment_count": video_details.get("comment_count"),
                    "processing_status": "skipped",
                    "error_message": "Video is too short (Shorts)",
                }
            )
            return {"status": "skipped", "message": "Short video"}

        # Create or update video record using upsert
        try:
            video_data = {
                "video_id": video_id,
                "title": video_details["title"],
                "description": video_details["description"],
                "thumbnail_url": video_details["thumbnail_url"],
                "duration": video_details["duration"],
                "published_at": video_details["published_at"],
                "view_count": video_details["view_count"],
                "like_count": video_details["like_count"],
                "comment_count": video_details["comment_count"],
                "processing_status": "processing",
            }

            # Get internal channel ID if channel_id provided
            # Also get target_languages if not already provided
            if channel_id:
                channel = self.supabase.get_channel(channel_id)
                if channel:
                    video_data["channel_id"] = channel["id"]
                    # Use channel's target_languages if not explicitly provided
                    if target_languages is None:
                        target_languages = channel.get(
                            "target_languages", TARGET_LANGUAGES
                        )

            # Fallback to global config if still not set
            if target_languages is None:
                target_languages = TARGET_LANGUAGES

            logger.info(f"Target languages for video: {target_languages}")

            self.supabase.upsert_video(video_data)

        except Exception as e:
            logger.error(f"Failed to upsert video record: {e}")
            return {"status": "error", "message": f"Database error: {e}"}

        # Detect video original language
        self.supabase.log_processing(video_id, "detect_language", "started")
        source_language = self.transcript_fetcher.detect_video_language(video_id)
        if not source_language:
            source_language = "en"  # Default to English if detection fails
            logger.warning(f"Could not detect language, defaulting to English")
        else:
            logger.info(f"Detected source language: {source_language}")
            self.supabase.log_processing(video_id, "detect_language", "success")

        # Step 1: Fetch original transcript in detected language
        self.supabase.log_processing(video_id, "fetch_transcript", "started")
        transcript = await self._fetch_with_retry(
            "transcript",
            lambda: self.transcript_fetcher.fetch_transcript(video_id, source_language),
        )

        if not transcript:
            self.supabase.update_video_status(
                video_id, "failed", "Failed to fetch transcript"
            )
            self.supabase.log_processing(video_id, "fetch_transcript", "failed")
            return {"status": "error", "message": "Failed to fetch transcript"}

        # Refine transcript (paragraph organization)
        self.supabase.log_processing(video_id, "refine_transcript", "started")
        logger.info(f"Refining transcript for {video_id}...")

        refined_transcript = await self._fetch_with_retry(
            "refine_transcript",
            lambda: self.translator.refine_transcript(str(transcript)),
        )

        if refined_transcript:
            transcript = refined_transcript
            self.supabase.log_processing(video_id, "refine_transcript", "success")
        else:
            logger.warning("Transcript refinement failed, using original")
            self.supabase.log_processing(video_id, "refine_transcript", "failed")

        # Get video record for linking
        video = self.supabase.get_video(video_id)
        if not video:
            logger.error(f"Video record not found for {video_id}")
            return {"status": "error", "message": "Video record not found"}

        # Save original transcript in detected language
        try:
            self.supabase.upsert_transcript(
                {
                    "video_id": video["id"],
                    "language": source_language,
                    "content": transcript,
                    "source_type": "youtube",
                    "is_original": True,
                    "word_count": self.transcript_fetcher.get_word_count(transcript),
                    "char_count": self.transcript_fetcher.get_char_count(transcript),
                }
            )
            self.supabase.log_processing(video_id, "fetch_transcript", "success")
        except Exception as e:
            logger.error(f"Failed to save transcript: {e}")

        # Step 2 & 3: Translate and generate articles for each target language
        for target_lang in target_languages:
            logger.info(f"Processing language: {target_lang}")

            # Skip translation if target language is the same as source language
            if target_lang == source_language:
                logger.info(
                    f"Target language {target_lang} is same as source language, using original transcript"
                )
                translated = transcript
            else:
                # Translate transcript
                self.supabase.log_processing(
                    video_id, f"translate_{target_lang}", "started"
                )

                translated = await self._fetch_with_retry(
                    f"translate_{target_lang}",
                    lambda: self.translator.translate_transcript(
                        str(transcript), target_lang, source_language
                    ),
                )

                if not translated:
                    logger.warning(f"Translation failed for {target_lang}, skipping...")
                    self.supabase.log_processing(
                        video_id, f"translate_{target_lang}", "failed"
                    )
                    continue

            # Save translated transcript
            try:
                self.supabase.upsert_transcript(
                    {
                        "video_id": video["id"],
                        "language": target_lang,
                        "content": translated,
                        "source_type": (
                            "youtube"
                            if target_lang == source_language
                            else "glm_translation"
                        ),
                        "is_original": target_lang == source_language,
                        "word_count": self.transcript_fetcher.get_word_count(
                            translated
                        ),
                        "char_count": self.transcript_fetcher.get_char_count(
                            translated
                        ),
                    }
                )
            except Exception as e:
                logger.error(f"Failed to save translated transcript: {e}")
                continue

            # Generate article
            self.supabase.log_processing(
                video_id, f"generate_article_{target_lang}", "started"
            )

            article_data = await self._fetch_with_retry(
                f"generate_article_{target_lang}",
                lambda: self.article_generator.generate_article(
                    str(translated), video_details, target_lang
                ),
            )

            if article_data:
                try:
                    self.supabase.upsert_article(
                        {
                            "video_id": video["id"],
                            "language": target_lang,
                            "title": video_details[
                                "title"
                            ],  # Could be translated later
                            "content": article_data["content"],
                            "summary": article_data["summary"],
                            "tags": article_data["tags"],
                            "reading_time": article_data["reading_time"],
                            "word_count": article_data["word_count"],
                        }
                    )
                    self.supabase.log_processing(
                        video_id, f"generate_article_{target_lang}", "success"
                    )
                except Exception as e:
                    logger.error(f"Failed to save article: {e}")
            else:
                logger.warning(f"Article generation failed for {target_lang}")
                self.supabase.log_processing(
                    video_id, f"generate_article_{target_lang}", "failed"
                )

        # Mark video as completed
        self.supabase.update_video_status(video_id, "completed")

        logger.success(f"✓ Video processing complete: {video_id}")
        return {"status": "success", "video_id": video_id}

    # -------------------------
    # Utility Methods
    # -------------------------

    async def _fetch_with_retry(
        self, task_type: str, fetch_func, max_retries: int = MAX_RETRIES
    ):
        """
        Execute a fetch function with retry logic.

        Args:
            task_type: Description of the task (for logging)
            fetch_func: Async function to execute
            max_retries: Maximum number of retries

        Returns:
            Result of fetch_func or None if all retries failed
        """
        for attempt in range(max_retries):
            try:
                result = fetch_func()
                if inspect.isawaitable(result):
                    result = await result

                if result:
                    return result
            except Exception as e:
                logger.warning(f"{task_type} attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    logger.error(f"{task_type} failed after {max_retries} attempts")
                    return None

        return None

    async def process_single_video(self, video_id: str) -> Dict[str, Any]:
        """
        Convenience method to process a single video by ID.

        Args:
            video_id: YouTube video ID

        Returns:
            Processing result dict
        """
        return await self.process_video(video_id)

    # -------------------------
    # Batch Processing
    # -------------------------

    async def process_batch(self, video_ids: List[str]) -> Dict[str, Any]:
        """
        Process multiple videos in batch.

        Args:
            video_ids: List of YouTube video IDs

        Returns:
            Batch processing summary
        """
        logger.info(f"Processing batch of {len(video_ids)} videos")

        results = {
            "total": len(video_ids),
            "processed": 0,
            "skipped": 0,
            "failed": 0,
        }

        for video_id in video_ids:
            result = await self.process_video(video_id)
            status = result.get("status", "failed")

            if status == "success":
                results["processed"] += 1
            elif status == "skipped":
                results["skipped"] += 1
            else:
                results["failed"] += 1

        logger.info(f"Batch processing complete: {results}")
        return results
