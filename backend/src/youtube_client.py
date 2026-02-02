"""
YouTube API Client

Handles fetching channel information, video metadata, and new video detection
using both YouTube Data API v3 and RSS Feeds.
"""

import feedparser
import requests
from loguru import logger
from typing import List, Dict, Any, Optional
from urllib.parse import parse_qs, urlparse
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from src.config import YOUTUBE_API_KEY


class YouTubeClient:
    """YouTube API client wrapper."""

    def __init__(self):
        """Initialize YouTube API client."""
        self.youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
        logger.info("YouTube client initialized")

    # -------------------------
    # Channel Operations
    # -------------------------

    def get_channel_info(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """
        Get channel information by channel ID.

        Args:
            channel_id: YouTube channel ID (e.g., UCxxxxxxxxxxxxx)

        Returns:
            Channel information dict or None if not found
        """
        try:
            request = self.youtube.channels().list(
                part='snippet,statistics',
                id=channel_id
            )
            response = request.execute()

            if response['items']:
                channel = response['items'][0]
                return {
                    'channel_id': channel['id'],
                    'channel_name': channel['snippet']['title'],
                    'description': channel['snippet'].get('description', ''),
                    'thumbnail_url': channel['snippet']['thumbnails']['default']['url'],
                    'subscriber_count': int(channel['statistics'].get('subscriberCount', 0)),
                    'video_count': int(channel['statistics'].get('videoCount', 0)),
                }
            else:
                logger.warning(f"Channel not found: {channel_id}")
                return None

        except HttpError as e:
            logger.error(f"YouTube API error for channel {channel_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to fetch channel {channel_id}: {e}")
            return None

    def get_channel_by_handle(self, handle: str) -> Optional[Dict[str, Any]]:
        """
        Get channel information by @handle.

        Args:
            handle: YouTube channel handle (e.g., @mkbhd)

        Returns:
            Channel information dict or None if not found
        """
        try:
            request = self.youtube.channels().list(
                part='snippet,statistics',
                forHandle=handle.lstrip('@')
            )
            response = request.execute()

            if response['items']:
                channel = response['items'][0]
                return {
                    'channel_id': channel['id'],
                    'channel_name': channel['snippet']['title'],
                    'description': channel['snippet'].get('description', ''),
                    'thumbnail_url': channel['snippet']['thumbnails']['default']['url'],
                    'subscriber_count': int(channel['statistics'].get('subscriberCount', 0)),
                    'video_count': int(channel['statistics'].get('videoCount', 0)),
                }
            else:
                logger.warning(f"Channel not found: {handle}")
                return None

        except HttpError as e:
            logger.error(f"YouTube API error for handle {handle}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to fetch channel {handle}: {e}")
            return None

    # -------------------------
    # Video Operations
    # -------------------------

    def get_video_details(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Get video metadata using YouTube Data API v3.

        Args:
            video_id: YouTube video ID (e.g., dQw4w9WgXcQ)

        Returns:
            Video metadata dict or None if not found

        Note:
            This consumes 1 API quota unit per video
        """
        try:
            request = self.youtube.videos().list(
                part='snippet,contentDetails,statistics',
                id=video_id
            )
            response = request.execute()

            if response['items']:
                video = response['items'][0]
                # Parse duration (format: PT4M13S or PT1H2M3S)
                duration_str = video['contentDetails']['duration']
                duration_seconds = self._parse_duration(duration_str)

                return {
                    'video_id': video['id'],
                    'title': video['snippet']['title'],
                    'description': video['snippet'].get('description', ''),
                    'thumbnail_url': video['snippet']['thumbnails']['high']['url'],
                    'channel_id': video['snippet']['channelId'],
                    'published_at': video['snippet']['publishedAt'],
                    'duration': duration_seconds,
                    'view_count': int(video['statistics'].get('viewCount', 0)),
                    'like_count': int(video['statistics'].get('likeCount', 0)),
                    'comment_count': int(video['statistics'].get('commentCount', 0)),
                }
            else:
                logger.warning(f"Video not found: {video_id}")
                return None

        except HttpError as e:
            logger.error(f"YouTube API error for video {video_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to fetch video {video_id}: {e}")
            return None

    def fetch_new_videos_via_rss(self, channel_id: str) -> List[str]:
        """
        Fetch new video IDs from a channel using RSS Feed.

        Args:
            channel_id: YouTube channel ID

        Returns:
            List of video IDs

        Note:
            This does NOT consume API quota
            Returns up to 15 most recent videos
        """
        try:
            # YouTube RSS feed URL
            rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"

            # Fetch RSS feed
            response = requests.get(rss_url, timeout=10)
            response.raise_for_status()

            # Parse RSS feed
            feed = feedparser.parse(response.content)

            video_ids = []
            for entry in feed.entries[:15]:  # Limit to 15 most recent
                # Extract video ID from YouTube URL
                # Format: https://www.youtube.com/watch?v={VIDEO_ID}
                yt_url = entry.get('link', '')
                parsed = urlparse(yt_url)
                video_id = parse_qs(parsed.query).get('v', [None])[0]

                if video_id:
                    video_ids.append(video_id)

            logger.debug(f"Found {len(video_ids)} videos via RSS for channel {channel_id}")
            return video_ids

        except requests.RequestException as e:
            logger.error(f"Failed to fetch RSS feed for {channel_id}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing RSS feed for {channel_id}: {e}")
            return []

    # -------------------------
    # Utility Methods
    # -------------------------

    @staticmethod
    def _parse_duration(duration_str: str) -> int:
        """
        Parse YouTube duration format (PT4M13S) to seconds.

        Args:
            duration_str: Duration string (e.g., PT4M13S, PT1H2M3S)

        Returns:
            Duration in seconds
        """
        import re
        from datetime import timedelta

        # Remove PT prefix
        duration_str = duration_str[2:] if duration_str.startswith('PT') else duration_str

        # Parse hours, minutes, seconds
        match = re.match(r'(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$', duration_str)
        if not match:
            logger.warning(f"Could not parse duration: {duration_str}")
            return 0

        hours = int(match.group(1)) if match.group(1) else 0
        minutes = int(match.group(2)) if match.group(2) else 0
        seconds = int(match.group(3)) if match.group(3) else 0

        return hours * 3600 + minutes * 60 + seconds

    def is_shorts(self, duration_seconds: int, max_duration: int = 60) -> bool:
        """
        Check if a video is a YouTube Short.

        Args:
            duration_seconds: Video duration in seconds
            max_duration: Maximum duration for Shorts (default 60s)

        Returns:
            True if video is a Short, False otherwise
        """
        return duration_seconds <= max_duration

    @staticmethod
    def extract_video_id_from_url(url: str) -> Optional[str]:
        """
        Extract video ID from various YouTube URL formats.

        Args:
            url: YouTube URL (e.g., https://youtu.be/dQw4w9WgXcQ,
                 https://www.youtube.com/watch?v=dQw4w9WgXcQ)

        Returns:
            Video ID or None if invalid URL
        """
        import re

        # Pattern for various YouTube URL formats
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
            r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        return None
