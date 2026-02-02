"""
Translator using GLM API

Translates transcripts from English to target languages using Zhipu AI's GLM-x.
"""

import json
import asyncio
from loguru import logger
from typing import Optional, List
from openai import AsyncOpenAI

from src.config import GLM_API_KEY, GLM_API_BASE, GLM_MODEL_TRANSLATE


class Translator:
    """Text translator using GLM API."""

    def __init__(self):
        """Initialize GLM translator."""
        self.client = AsyncOpenAI(api_key=GLM_API_KEY, base_url=GLM_API_BASE)
        self.model = GLM_MODEL_TRANSLATE
        logger.info(f"Translator initialized with model: {self.model}")

    # -------------------------
    # Translation Methods
    # -------------------------

    async def refine_transcript(self, transcript: str) -> Optional[str]:
        """
        Refine the transcript by organizing it into logical paragraphs.
        Handles long texts by chunking.

        Args:
            transcript: Raw transcript text

        Returns:
            Refined transcript with logical paragraph breaks, or None if failed
        """
        total_len = len(transcript)
        logger.info(f"Refining transcript paragraphs ({total_len} chars)")

        # Threshold for chunking (5000 chars to be safe with 4k/8k output limits)
        CHUNK_THRESHOLD = 5000

        if total_len <= CHUNK_THRESHOLD:
            return await self._refine_chunk(transcript)

        # Split into chunks
        chunks = self._split_raw_text(transcript, CHUNK_THRESHOLD)
        logger.info(f"Split raw transcript into {len(chunks)} chunks for refinement")

        # Process concurrently with limited concurrency
        semaphore = asyncio.Semaphore(2)  # Reduced to avoid rate limiting

        async def process_chunk(index, chunk):
            async with semaphore:
                logger.info(
                    f"Refining chunk {index + 1}/{len(chunks)} ({len(chunk)} chars)"
                )
                return await self._refine_chunk(chunk)

        tasks = [process_chunk(i, chunk) for i, chunk in enumerate(chunks)]
        results = await asyncio.gather(*tasks)

        # Merge results
        refined_parts = [r for r in results if r]

        if not refined_parts:
            return None

        full_refined = "\n\n".join(refined_parts)
        logger.success(f"✓ Transcript refined (merged {len(refined_parts)} chunks)")
        return full_refined

    def _split_raw_text(self, text: str, max_chunk_size: int) -> List[str]:
        """Split raw text into chunks, respecting sentence boundaries."""
        chunks = []
        current_chunk = ""

        # Split by common sentence terminators followed by space
        # This is a heuristic; strictly speaking we might want regex
        # But for raw transcript stream, usually just space-separated
        # We look for '. ', '? ', '! '

        # Simple tokenization by space to avoid cutting words
        words = text.split(" ")

        current_chunk_words = []
        current_len = 0

        for word in words:
            word_len = len(word) + 1  # +1 for space

            # If adding this word exceeds limit AND we have content
            # Try to find a good break point?
            # Actually, we should just fill up to limit, then look back for punctuation

            if current_len + word_len > max_chunk_size and current_chunk_words:
                # Basic split: just cut here.
                # Better split: check if previous word ended with punctuation?
                # For now, let's just cut at max size to keep it simple,
                # or maybe just fill until limit.
                # Refiner is robust enough to handle mid-sentence cuts usually,
                # but let's try to not cut mid-sentence if possible.

                # Check if last word in current_chunk_words has punctuation
                # If not, maybe we keep adding until we find one, OR we just cut.
                # To be safe against infinite growth, we cut strictly at max_size + buffer

                chunks.append(" ".join(current_chunk_words))
                current_chunk_words = []
                current_len = 0

            current_chunk_words.append(word)
            current_len += word_len

            # If we are near limit (say > 80%) AND found punctuation, verify split?
            # Let's keep it simple: strict size limit based on word boundaries.

        if current_chunk_words:
            chunks.append(" ".join(current_chunk_words))

        return chunks

    async def _refine_chunk(self, chunk_text: str) -> Optional[str]:
        """Refine a single chunk of raw text."""
        system_prompt = (
            "You are a professional editor. "
            "The user will provide a PARTIAL raw transcript of a video. "
            "Your task is to organize this text into logical paragraphs and clean up basic issues. "
            "Rules:\n"
            "1. Do not change the core meaning or rewrite sentences.\n"
            "2. Remove non-speech noise tags like [Music], [Applause], [Silence], etc.\n"
            "3. Fix obvious typos (e.g., 'Chad GPT' -> 'ChatGPT') and capitalization/punctuation.\n"
            "4. Return ONLY the refined text with paragraph breaks (use double newlines \\n\\n).\n"
            "5. If the input seems to start or end mid-sentence, preserve that continuity (don't force a period if it doesn't fit)."
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": chunk_text},
                ],
                temperature=0.1,
                max_tokens=4000,
            )

            if response.choices and response.choices[0].message.content:
                return response.choices[0].message.content.strip()
            return None
        except Exception as e:
            logger.error(f"Chunk refinement failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Chunk refinement failed: {e}")
            return None

    async def translate_transcript(
        self, transcript: str, target_language: str, source_language: str = "English"
    ) -> Optional[str]:
        """
        Translate a transcript to target language using chunking.

        Uses paragraph-by-paragraph translation to ensure structural alignment.
        Splits long transcripts into chunks to avoid API timeouts.

        Args:
            transcript: Original transcript text (in English)
            target_language: Target language code (e.g., 'zh-Hans', 'ja')
            source_language: Source language name (for prompt)

        Returns:
            Translated text or None if failed
        """
        logger.info(
            f"Translating transcript to {target_language} ({len(transcript)} chars)"
        )

        # Language name mapping for prompts
        language_names = {
            "zh-Hans": "Chinese (Simplified)",
            "zh-Hant": "Chinese (Traditional)",
            "ja": "Japanese",
            "ko": "Korean",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "ru": "Russian",
            "ar": "Arabic",
        }

        target_lang_name = language_names.get(target_language, target_language)

        # Split into paragraphs to ensure 1:1 mapping
        paragraphs = [p.strip() for p in transcript.split("\n\n") if p.strip()]

        if not paragraphs:
            return ""

        # Chunk paragraphs
        # Calculate chunk size dynamically based on character count
        # Target ~2000 chars per chunk to avoid timeouts
        MAX_CHUNK_CHARS = 2000

        chunks = []
        current_chunk = []
        current_chars = 0

        for paragraph in paragraphs:
            para_len = len(paragraph)

            # If a single paragraph is too long, we have to put it in its own chunk
            if para_len > MAX_CHUNK_CHARS:
                if current_chunk:
                    chunks.append(current_chunk)
                    current_chunk = []
                    current_chars = 0
                chunks.append([paragraph])
                continue

            # If adding this paragraph exceeds limit, start new chunk
            if current_chars + para_len > MAX_CHUNK_CHARS and current_chunk:
                chunks.append(current_chunk)
                current_chunk = []
                current_chars = 0

            current_chunk.append(paragraph)
            current_chars += para_len

        if current_chunk:
            chunks.append(current_chunk)

        logger.info(
            f"Split transcript into {len(chunks)} chunks for translation (target {MAX_CHUNK_CHARS} chars/chunk)"
        )

        # Process chunks concurrently with semaphore
        semaphore = asyncio.Semaphore(2)  # Reduced to avoid rate limiting (was 5)

        async def process_chunk_with_semaphore(index, chunk):
            async with semaphore:
                logger.info(
                    f"Translating chunk {index + 1}/{len(chunks)} ({len(chunk)} paragraphs)"
                )
                return await self._translate_chunk_with_retry(
                    chunk, target_lang_name, source_language, index
                )

        tasks = [
            process_chunk_with_semaphore(i, chunk) for i, chunk in enumerate(chunks)
        ]
        results = await asyncio.gather(*tasks)

        # Check for failures
        all_translated_paragraphs = []
        for i, result in enumerate(results):
            if result is None:
                logger.error(f"Failed to translate chunk {i + 1} after retries")
                return None
            all_translated_paragraphs.extend(result)

        # Reconstruct text
        translated_text = "\n\n".join(all_translated_paragraphs)
        logger.success(f"✓ Translation complete ({len(translated_text)} chars)")
        return translated_text

    async def _translate_chunk_with_retry(
        self,
        paragraphs: List[str],
        target_lang_name: str,
        source_language: str,
        chunk_index: int,
        max_retries: int = 3,
    ) -> Optional[List[str]]:
        """Translate a chunk with internal retry logic."""
        for attempt in range(max_retries):
            try:
                result = await self._translate_chunk(
                    paragraphs, target_lang_name, source_language
                )
                if result:
                    return result
                logger.warning(
                    f"Chunk {chunk_index + 1} attempt {attempt + 1} failed, retrying..."
                )
            except Exception as e:
                error_msg = str(e)
                logger.warning(
                    f"Chunk {chunk_index + 1} attempt {attempt + 1} error: {e}"
                )

                # Check for rate limiting error (429 or code 1302)
                if "429" in error_msg or "1302" in error_msg:
                    # Longer wait for rate limiting: 5s, 10s, 20s
                    wait_time = 5 * (2**attempt)
                    logger.warning(
                        f"Rate limited, waiting {wait_time}s before retry..."
                    )
                    await asyncio.sleep(wait_time)
                else:
                    # Exponential backoff for other errors: 2s, 4s, 8s
                    await asyncio.sleep(2**attempt)

        return None

    async def _translate_chunk(
        self, paragraphs: List[str], target_lang_name: str, source_language: str
    ) -> Optional[List[str]]:
        """Translate a single chunk of paragraphs."""
        system_prompt = (
            f"You are a professional translator. "
            f"Translate the following JSON array of paragraphs from {source_language} to {target_lang_name}. "
            f"Strictly maintain the original structure: the output MUST be a valid JSON array of strings. "
            f"The output array MUST have exactly {len(paragraphs)} items, corresponding 1-to-1 to the input paragraphs. "
            f"Do not merge or split paragraphs. "
            f"Return ONLY the JSON array."
        )

        try:
            user_prompt = json.dumps(paragraphs, ensure_ascii=False)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,  # Low temperature for structural consistency
                max_tokens=4000,  # Lower token limit since we are chunking
                response_format={"type": "json_object"},
            )

            if response.choices and response.choices[0].message.content:
                content = response.choices[0].message.content.strip()

                try:
                    data = json.loads(content)

                    translated_paragraphs: List[str] = []

                    if isinstance(data, list):
                        translated_paragraphs = data
                    elif isinstance(data, dict):
                        for val in data.values():
                            if isinstance(val, list):
                                translated_paragraphs = val
                                break

                    if not translated_paragraphs:
                        logger.warning("Could not parse chunk translation as list")
                        return None

                    if len(translated_paragraphs) != len(paragraphs):
                        logger.warning(
                            f"Chunk paragraph count mismatch: Input {len(paragraphs)}, Output {len(translated_paragraphs)}"
                        )
                        # In strict mode we might fail, but for now let's try to proceed if possible or return None
                        # Mismatch ruins alignment, so we should probably fail the chunk
                        return None

                    return translated_paragraphs

                except json.JSONDecodeError:
                    logger.warning("Failed to parse chunk translation as JSON")
                    return None
            else:
                logger.error("No response from GLM API for chunk")
                return None

        except Exception as e:
            logger.error(f"Chunk translation failed: {e}")
            return None

    def translate_text(
        self, text: str, source_lang: str = "en", target_lang: str = "zh-Hans"
    ) -> Optional[str]:
        """
        Generic text translation method.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code

        Returns:
            Translated text or None if failed
        """
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self.translate_transcript(text, target_lang, source_lang)
            )
        finally:
            loop.close()

    def batch_translate(
        self, transcripts: list[tuple[str, str]], target_language: str
    ) -> dict[str, str]:
        """
        Translate multiple transcripts.

        Args:
            transcripts: List of (video_id, transcript) tuples
            target_language: Target language code

        Returns:
            Dict mapping video_id to translated text
        """
        logger.info(
            f"Batch translating {len(transcripts)} transcripts to {target_language}"
        )

        results = {}
        for video_id, transcript in transcripts:
            translated = self.translate_transcript(transcript, target_language)

            if translated:
                results[video_id] = translated
            else:
                logger.warning(f"Failed to translate transcript for {video_id}")
                results[video_id] = transcript  # Fallback to original

        logger.success(
            f"✓ Batch translation complete: {len(results)}/{len(transcripts)}"
        )
        return results

    # -------------------------
    # Utility Methods
    # -------------------------

    @staticmethod
    def detect_language(text: str) -> str:
        """
        Detect the language of a text (basic implementation).

        Args:
            text: Text to analyze

        Returns:
            Detected language code
        """
        # Simple heuristic detection
        # In production, you might use a language detection library

        # Check for Chinese characters
        chinese_chars = sum(1 for char in text if "\u4e00" <= char <= "\u9fff")
        if chinese_chars > len(text) * 0.3:
            return "zh-Hans"

        # Check for Japanese characters
        japanese_chars = sum(1 for char in text if "\u3040" <= char <= "\u309f")
        if japanese_chars > len(text) * 0.2:
            return "ja"

        # Default to English
        return "en"

    @staticmethod
    def get_language_name(code: str) -> str:
        """
        Get full language name from code.

        Args:
            code: Language code (e.g., 'zh-Hans', 'en')

        Returns:
            Full language name
        """
        language_map = {
            "en": "English",
            "zh-Hans": "Chinese (Simplified)",
            "zh-Hant": "Chinese (Traditional)",
            "ja": "Japanese",
            "ko": "Korean",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "pt": "Portuguese",
        }

        return language_map.get(code, code)
