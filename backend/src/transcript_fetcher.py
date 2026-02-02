"""
Transcript Fetcher

Fetches video transcripts from YouTube using native captions or fallback to Whisper.
"""

import os
import tempfile
from loguru import logger
from typing import Optional, Dict, Any
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
)

from src.config import DOWNLOADS_DIR, OPENAI_API_KEY


class TranscriptFetcher:
    """Fetch video transcripts from YouTube or using Whisper."""

    def __init__(self):
        """Initialize transcript fetcher."""
        # YouTubeTranscriptApi needs to be instantiated
        self.yt_api = YouTubeTranscriptApi()
        logger.info("Transcript fetcher initialized")

    # -------------------------
    # Main Fetch Method
    # -------------------------

    def fetch_transcript(self, video_id: str, language: str = "en") -> Optional[str]:
        """
        Fetch transcript for a video, trying native captions first,
        then falling back to Whisper if needed.

        Args:
            video_id: YouTube video ID
            language: Language code (default 'en' for English)

        Returns:
            Transcript text or None if failed
        """
        logger.info(f"Fetching transcript for {video_id} in {language}")

        # Try native YouTube captions first
        transcript = self._fetch_youtube_transcript(video_id, language)

        if transcript:
            logger.success(f"✓ Found native transcript for {video_id}")
            return transcript
        else:
            logger.warning(f"⚠ No native transcript for {video_id}, trying Whisper...")
            return self._transcribe_with_whisper(video_id, language)

    # -------------------------
    # YouTube Native Captions
    # -------------------------

    def _fetch_youtube_transcript(self, video_id: str, language: str) -> Optional[str]:
        """
        Fetch transcript using YouTube's native captions.

        Args:
            video_id: YouTube video ID
            language: Language code

        Returns:
            Transcript text or None if not available
        """
        try:
            # Fetch transcript using correct API method
            transcript_data = self.yt_api.fetch(video_id, languages=[language])

            # Combine all text segments
            full_text = " ".join([entry.text for entry in transcript_data])

            logger.success(
                f"✓ Fetched native transcript for {video_id} ({len(full_text)} chars)"
            )
            return full_text

        except TranscriptsDisabled:
            logger.debug(f"Transcripts disabled for video {video_id}")
            return None
        except NoTranscriptFound:
            logger.debug(f"No transcript found for {video_id} in {language}")
            return None
        except Exception as e:
            logger.debug(f"Error fetching YouTube transcript: {e}")
            return None

    # -------------------------
    # Whisper Transcription
    # -------------------------

    def _transcribe_with_whisper(
        self, video_id: str, language: str = "en"
    ) -> Optional[str]:
        """
        Transcribe video audio using Whisper (local or OpenAI).

        Args:
            video_id: YouTube video ID
            language: Language code

        Returns:
            Transcript text or None if failed
        """
        # Try local faster-whisper first
        if self._try_local_whisper():
            return self._transcribe_local(video_id, language)

        # Fallback to OpenAI Whisper API
        if OPENAI_API_KEY:
            return self._transcribe_openai(video_id, language)

        logger.error(f"All transcription methods failed for {video_id}")
        return None

    def _try_local_whisper(self) -> bool:
        """Check if faster-whisper is available."""
        try:
            import faster_whisper

            logger.debug("faster-whisper is available")
            return True
        except ImportError:
            logger.warning("faster-whisper not installed")
            return False

    def _transcribe_local(self, video_id: str, language: str) -> Optional[str]:
        """
        Transcribe using local faster-whisper.

        Args:
            video_id: YouTube video ID
            language: Language code

        Returns:
            Transcript text or None if failed
        """
        try:
            import faster_whisper
            from yt_dlp import YoutubeDL

            # Download audio
            audio_path = DOWNLOADS_DIR / f"{video_id}.m4a"

            logger.info(f"Downloading audio for {video_id}...")
            ydl_opts = {
                "format": "bestaudio[ext=m4a]",
                "outtmpl": str(audio_path),
                "quiet": True,
                "no_warnings": True,
            }

            with YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

            if not audio_path.exists():
                logger.error(f"Failed to download audio for {video_id}")
                return None

            # Transcribe with Whisper
            logger.info(f"Transcribing {video_id} with Whisper...")
            model = faster_whisper.WhisperModel("base", device="cpu")

            segments, info = model.transcribe(
                str(audio_path), language=language, word_timestamps=False
            )

            # Combine segments
            full_text = " ".join([seg.text for seg in segments])

            # Clean up audio file
            audio_path.unlink(missing_ok=True)

            logger.success(
                f"✓ Transcribed {video_id} with Whisper ({info.duration:.2f}s)"
            )
            return full_text

        except Exception as e:
            logger.error(f"Local Whisper transcription failed: {e}")
            return None

    def _transcribe_openai(self, video_id: str, language: str = "en") -> Optional[str]:
        """
        Transcribe using OpenAI Whisper API.

        Args:
            video_id: YouTube video ID
            language: Language code

        Returns:
            Transcript text or None if failed
        """
        try:
            from yt_dlp import YoutubeDL
            from openai import OpenAI

            # Download audio
            audio_path = DOWNLOADS_DIR / f"{video_id}.mp3"

            logger.info(f"Downloading audio for {video_id}...")
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": str(audio_path),
                "quiet": True,
                "no_warnings": True,
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }
                ],
            }

            with YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

            if not audio_path.exists():
                logger.error(f"Failed to download audio for {video_id}")
                return None

            # Transcribe with OpenAI Whisper
            logger.info(f"Transcribing {video_id} with OpenAI Whisper...")
            client = OpenAI(api_key=OPENAI_API_KEY)

            with open(audio_path, "rb") as audio_file:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language,
                    response_format="text",
                )

            # Clean up audio file
            audio_path.unlink(missing_ok=True)

            logger.success(f"✓ Transcribed {video_id} with OpenAI Whisper")
            return response

        except Exception as e:
            logger.error(f"OpenAI Whisper transcription failed: {e}")
            return None

    # -------------------------
    # Transcript Processing
    # -------------------------

    def format_transcript(self, text: str) -> str:
        """
        Format transcript for better readability.

        Args:
            text: Raw transcript text

        Returns:
            Formatted transcript with paragraph breaks
        """
        # Split into sentences (basic punctuation-based split)
        import re

        sentences = re.split(r"[.!?]+", text)

        # Group sentences into paragraphs (3-5 sentences per paragraph)
        paragraph_size = 4
        paragraphs = []

        for i in range(0, len(sentences), paragraph_size):
            paragraph = ". ".join(
                s.strip() for s in sentences[i : i + paragraph_size] if s.strip()
            )
            if paragraph:
                paragraphs.append(paragraph + ".")

        return "\n\n".join(paragraphs)

    def detect_video_language(self, video_id: str) -> Optional[str]:
        """
        Detect the original language of a video by checking available transcripts.

        Args:
            video_id: YouTube video ID

        Returns:
            Language code (e.g., 'en', 'fr', 'es') or None if not found
        """
        try:
            # Get list of available transcript languages
            transcript_list = self.yt_api.list(video_id)

            if transcript_list and len(transcript_list) > 0:
                # Prefer manually created transcripts (generated ones have language_code with 'auto' prefix)
                manual_transcripts = [
                    t for t in transcript_list if not t.language_code.startswith("auto")
                ]

                if manual_transcripts:
                    detected_lang = manual_transcripts[0].language_code
                    logger.info(f"Detected video language: {detected_lang}")
                    return detected_lang
                else:
                    # Fall back to auto-generated transcripts
                    detected_lang = transcript_list[0].language_code
                    logger.info(
                        f"Detected video language (auto-generated): {detected_lang}"
                    )
                    return detected_lang

            logger.warning(
                f"No transcripts found for video {video_id}, defaulting to English"
            )
            return None

        except Exception as e:
            logger.warning(
                f"Failed to detect language for {video_id}: {e}, defaulting to English"
            )
            return None

    def get_word_count(self, text: str) -> int:
        """Get word count of transcript."""
        return len(text.split())

    def get_char_count(self, text: str) -> int:
        """Get character count of transcript (including spaces)."""
        return len(text)
