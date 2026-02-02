"""
Article Generator using GLM API

Generates blog articles from translated transcripts using Zhipu AI's GLM.
"""

from loguru import logger
from typing import Optional, Dict, Any, List
from openai import OpenAI
import re

from src.config import GLM_API_KEY, GLM_API_BASE, GLM_MODEL_GENERATE


class ArticleGenerator:
    """Blog article generator using GLM API."""

    def __init__(self):
        """Initialize GLM API article generator."""
        self.client = OpenAI(api_key=GLM_API_KEY, base_url=GLM_API_BASE)
        self.model = GLM_MODEL_GENERATE
        logger.info(f"Article generator initialized with model: {self.model}")

    # -------------------------
    # Article Generation
    # -------------------------

    def generate_article(
        self, transcript: str, metadata: Dict[str, Any], language: str = "zh-Hans"
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a blog article from a translated transcript.

        Args:
            transcript: Translated transcript text
            metadata: Video metadata (title, channel_name, etc.)
            language: Article language code

        Returns:
            Dict containing article content, summary, tags, reading_time
            or None if failed
        """
        logger.info(f"Generating article in {language} for '{metadata.get('title')}'")

        # Language-specific prompts
        language_prompts = {
            "zh-Hans": {
                "summary": "中文简体",
                "instruction": "生成一篇高质量的中文博客文章",
            },
            "ja": {
                "summary": "日本語",
                "instruction": "日本語の高品質なブログ記事を生成する",
            },
        }

        prompt_config = language_prompts.get(
            language,
            {
                "summary": language,
                "instruction": f"Generate a high-quality blog article in {language}",
            },
        )

        system_prompt = self._create_system_prompt(prompt_config["instruction"])
        user_prompt = self._create_user_prompt(
            transcript, metadata, prompt_config["summary"]
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,  # Higher temperature for creativity
                max_tokens=4000,
            )

            if response.choices:
                article_content = response.choices[0].message.content.strip()

                # Extract summary and tags
                summary = self._extract_summary(article_content)
                tags = self._extract_tags(article_content, metadata)

                # Calculate reading time
                word_count = len(article_content.split())
                reading_time = max(1, word_count // 200)  # ~200 words per minute

                logger.success(
                    f"✓ Article generated ({word_count} words, {reading_time} min read)"
                )

                return {
                    "content": article_content,
                    "summary": summary,
                    "tags": tags,
                    "reading_time": reading_time,
                    "word_count": word_count,
                }
            else:
                logger.error("No response from GLM API")
                return None

        except Exception as e:
            logger.error(f"Article generation failed: {e}")
            return None

    # -------------------------
    # Prompt Creation
    # -------------------------

    def _create_system_prompt(self, instruction: str) -> str:
        """Create system prompt for article generation."""
        return (
            f"You are an expert blog writer and content creator. {instruction}. "
            "Your articles should be:\n"
            "1. Well-structured with clear headings\n"
            "2. Engaging and informative\n"
            "3. Easy to read and understand\n"
            "4. Include practical examples when relevant\n"
            "5. Have a compelling introduction and conclusion\n\n"
            "Format the article in Markdown. Use appropriate headings (##, ###), "
            "bullet points, and other Markdown formatting to improve readability."
        )

    def _create_user_prompt(
        self, transcript: str, metadata: Dict[str, Any], language_name: str
    ) -> str:
        """Create user prompt with transcript and metadata."""
        return (
            f"Based on the following video transcript, write a comprehensive blog article in {language_name}.\n\n"
            f"Video Information:\n"
            f"- Title: {metadata.get('title', 'N/A')}\n"
            f"- Channel: {metadata.get('channel_name', 'N/A')}\n"
            f"- Duration: {metadata.get('duration', 0)} seconds\n"
            f"- Published: {metadata.get('published_at', 'N/A')}\n\n"
            f"Transcript:\n{transcript}\n\n"
            f"Requirements:\n"
            f"- Start with a compelling title\n"
            f"- Write an engaging introduction\n"
            f"- Use the transcript content to create informative body paragraphs\n"
            f"- Use Markdown formatting with headings (##, ###)\n"
            f"- Include a conclusion\n"
            f"- At the end, add a '## Summary' section with a 2-3 sentence summary\n"
            f"- Extract 3-5 relevant tags as a comma-separated list at the end (Format: Tags: tag1, tag2, tag3)"
        )

    # -------------------------
    # Post-Processing
    # -------------------------

    def _extract_summary(self, article_content: str) -> str:
        """
        Extract summary from generated article.

        Looks for a "## Summary" section or generates one.
        """
        # Look for explicit summary section
        summary_match = re.search(
            r"## Summary\s*\n+(.*?)(?=\n##|\Z)",
            article_content,
            re.DOTALL | re.IGNORECASE,
        )

        if summary_match:
            summary = summary_match.group(1).strip()
            # Clean up extra whitespace
            summary = " ".join(summary.split())
            return summary

        # If no explicit summary, generate from first paragraph
        first_para = re.split(r"\n\n+", article_content)[0].strip()
        # Remove markdown heading
        first_para = re.sub(r"^#+\s*", "", first_para)
        # Limit to 200 characters
        summary = first_para[:200]
        if len(first_para) > 200:
            summary = summary[:197] + "..."

        return summary

    def _extract_tags(
        self, article_content: str, metadata: Dict[str, Any]
    ) -> List[str]:
        """
        Extract or generate tags for the article.

        Looks for explicit "Tags:" section or generates from content and metadata.
        """
        # Look for explicit tags section
        tags_match = re.search(r"Tags:\s*([^\n]+)", article_content, re.IGNORECASE)

        if tags_match:
            tags_str = tags_match.group(1)
            tags = [tag.strip() for tag in tags_str.split(",")]
            return tags[:5]  # Limit to 5 tags

        # Generate tags from metadata and content
        tags = []

        # Add channel name as tag
        channel_name = metadata.get("channel_name", "")
        if channel_name:
            tags.append(channel_name)

        # Extract keywords from title
        title_words = re.findall(r"\b[A-Z][a-z]+\b", metadata.get("title", ""))
        tags.extend(title_words[:3])

        # Extract technical terms from content
        tech_terms = re.findall(
            r"\b(AI|API|Python|JavaScript|Machine Learning|Data Science|Web Development)\b",
            article_content,
        )
        tags.extend(tech_terms[:2])

        # Remove duplicates and limit to 5
        unique_tags = list(set(tags))
        return unique_tags[:5]

    # -------------------------
    # Utility Methods
    # -------------------------

    @staticmethod
    def calculate_reading_time(word_count: int, words_per_minute: int = 200) -> int:
        """
        Calculate estimated reading time.

        Args:
            word_count: Number of words in article
            words_per_minute: Average reading speed

        Returns:
            Reading time in minutes
        """
        return max(1, word_count // words_per_minute)

    @staticmethod
    def validate_article_content(content: str) -> bool:
        """
        Validate that generated article meets minimum requirements.

        Args:
            content: Article content to validate

        Returns:
            True if valid, False otherwise
        """
        if not content or len(content.strip()) < 100:
            logger.warning("Generated article is too short")
            return False

        # Check for basic structure
        if not re.search(r"^#{1,3}\s+", content, re.MULTILINE):
            logger.warning("Article lacks proper headings")
            return False

        return True
