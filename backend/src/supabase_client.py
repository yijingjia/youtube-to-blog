"""
Supabase client for database operations.
"""

from loguru import logger
from supabase import create_client, Client
from typing import List, Dict, Any, Optional

from src.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


class SupabaseClient:
    """Supabase client wrapper for YouTube to Blog system."""

    def __init__(self):
        """Initialize Supabase client."""
        self.client: Client = create_client(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY
        )
        logger.info("Supabase client initialized")

    # -------------------------
    # Channels
    # -------------------------

    def get_active_channels(self) -> List[Dict[str, Any]]:
        """Get all active channels."""
        response = self.client.table("channels").select("*").eq("is_active", True).execute()
        return response.data

    def get_channel(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific channel by channel_id."""
        response = self.client.table("channels").select("*").eq("channel_id", channel_id).execute()
        if response.data:
            return response.data[0]
        return None

    def create_channel(self, channel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new channel."""
        response = self.client.table("channels").insert(channel_data).execute()
        logger.info(f"Created channel: {channel_data['channel_name']}")
        return response.data[0]

    def update_channel_last_checked(self, channel_id: str) -> None:
        """Update the last_checked timestamp for a channel."""
        self.client.table("channels").update({"last_checked_at": "now()"}).eq(
            "channel_id", channel_id
        ).execute()

    # -------------------------
    # Videos
    # -------------------------

    def get_video(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific video by video_id."""
        response = self.client.table("videos").select("*").eq("video_id", video_id).execute()
        if response.data:
            return response.data[0]
        return None

    def create_video(self, video_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new video record."""
        response = self.client.table("videos").insert(video_data).execute()
        logger.info(f"Created video record: {video_data['video_id']}")
        return response.data[0]

    def upsert_video(self, video_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert or update a video record.
        If the video_id already exists, update it; otherwise insert new record.
        """
        response = self.client.table("videos").upsert(
            video_data,
            on_conflict="video_id"  # Update if video_id conflicts
        ).execute()
        logger.info(f"Upserted video record: {video_data['video_id']}")
        return response.data[0]

    def update_video_status(
        self,
        video_id: str,
        status: str,
        error_message: Optional[str] = None
    ) -> None:
        """Update video processing status."""
        update_data = {"processing_status": status}
        if error_message:
            update_data["error_message"] = error_message

        self.client.table("videos").update(update_data).eq("video_id", video_id).execute()

    # -------------------------
    # Transcripts
    # -------------------------

    def get_transcript(self, video_id: str, language: str) -> Optional[Dict[str, Any]]:
        """Get transcript for a video in a specific language."""
        # First get the video's internal ID
        video = self.get_video(video_id)
        if not video:
            return None

        response = self.client.table("transcripts").select("*").eq(
            "video_id", video['id']
        ).eq("language", language).execute()

        if response.data:
            return response.data[0]
        return None

    def create_transcript(self, transcript_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new transcript record."""
        response = self.client.table("transcripts").insert(transcript_data).execute()
        logger.info(f"Created transcript: {transcript_data['language']}")
        return response.data[0]

    def upsert_transcript(self, transcript_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert or update a transcript record.
        Uses video_id and language as the unique constraint.
        """
        response = self.client.table("transcripts").upsert(
            transcript_data,
            on_conflict="video_id, language"  # Composite unique key
        ).execute()
        logger.info(f"Upserted transcript: {transcript_data['language']}")
        return response.data[0]

    # -------------------------
    # Articles
    # -------------------------

    def get_article(self, video_id: str, language: str) -> Optional[Dict[str, Any]]:
        """Get article for a video in a specific language."""
        # First get the video's internal ID
        video = self.get_video(video_id)
        if not video:
            return None

        response = self.client.table("articles").select("*").eq(
            "video_id", video['id']
        ).eq("language", language).execute()

        if response.data:
            return response.data[0]
        return None

    def create_article(self, article_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new article record."""
        response = self.client.table("articles").insert(article_data).execute()
        logger.info(f"Created article: {article_data['language']}")
        return response.data[0]

    def upsert_article(self, article_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert or update an article record.
        Uses video_id and language as the unique constraint.
        """
        response = self.client.table("articles").upsert(
            article_data,
            on_conflict="video_id, language"  # Composite unique key
        ).execute()
        logger.info(f"Upserted article: {article_data['language']}")
        return response.data[0]

    # -------------------------
    # Processing Logs
    # -------------------------

    def log_processing(
        self,
        video_id: str,
        task_type: str,
        status: str,
        error_message: Optional[str] = None,
        duration_seconds: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a processing task."""
        # Get video internal ID
        video = self.get_video(video_id)
        if not video:
            logger.warning(f"Cannot log processing for unknown video: {video_id}")
            return

        log_data = {
            "video_id": video['id'],
            "task_type": task_type,
            "status": status,
            "error_message": error_message,
            "duration_seconds": duration_seconds,
            "metadata": metadata
        }

        self.client.table("processing_logs").insert(log_data).execute()
