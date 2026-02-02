-- =====================================================
-- YouTube to Blog System - Initial Database Schema
-- =====================================================
-- This migration creates all tables, indexes, RLS policies,
-- triggers, and functions for the YouTube to Blog system.
--
-- Follows Supabase PostgreSQL Best Practices:
-- - Optimized RLS policies (auth.uid() cached)
-- - Partial indexes for filtered queries
-- - Composite indexes for multi-column queries
-- - Safe security policies
-- =====================================================

-- -----------------------------------------------------
-- 1. PostgreSQL Extensions
-- -----------------------------------------------------

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Set timezone
SET timezone = 'UTC';

-- -----------------------------------------------------
-- 2. Utility Functions
-- -----------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- 3. Tables
-- -----------------------------------------------------

-- 3.1 Channels Table
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id VARCHAR(100) UNIQUE NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    channel_handle VARCHAR(255),
    description TEXT,
    thumbnail_url VARCHAR(500),
    subscriber_count INTEGER,
    video_count INTEGER,
    target_languages JSON DEFAULT '["zh-Hans"]',
    is_active BOOLEAN DEFAULT true,
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE channels IS 'YouTube频道信息表';
COMMENT ON COLUMN channels.target_languages IS '目标翻译语言列表，JSON数组格式';

-- Indexes for channels
CREATE INDEX idx_channels_active ON channels(is_active);
CREATE INDEX idx_channels_last_checked ON channels(last_checked_at);
-- Partial index for active channels (most common query) - BEST PRACTICE
CREATE INDEX idx_channels_active_is_true ON channels(is_active, last_checked_at DESC)
WHERE is_active = true;

-- 3.2 Videos Table
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id VARCHAR(20) UNIQUE NOT NULL,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    duration INTEGER,
    published_at TIMESTAMP NOT NULL,
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    processing_status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE videos IS 'YouTube视频信息表';
COMMENT ON COLUMN videos.processing_status IS '处理状态：pending-待处理, processing-处理中, completed-已完成, failed-失败';

-- Indexes for videos
CREATE INDEX idx_videos_channel ON videos(channel_id);
CREATE INDEX idx_videos_published ON videos(published_at DESC);
CREATE INDEX idx_videos_status ON videos(processing_status);
CREATE INDEX idx_videos_created ON videos(created_at DESC);
CREATE UNIQUE INDEX idx_videos_video_id ON videos(video_id);
-- Partial index for processing videos - BEST PRACTICE
CREATE INDEX idx_videos_processing ON videos(video_id, channel_id, created_at DESC)
WHERE processing_status IN ('pending', 'processing');
-- Partial index for completed videos - BEST PRACTICE
CREATE INDEX idx_videos_completed_published ON videos(published_at DESC)
WHERE processing_status = 'completed';
-- Composite index for channel + status + created - BEST PRACTICE
CREATE INDEX idx_videos_channel_status_created ON videos(channel_id, processing_status, created_at DESC);

-- 3.3 Transcripts Table
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    is_original BOOLEAN DEFAULT false,
    word_count INTEGER,
    char_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE transcripts IS '视频字幕表';
COMMENT ON COLUMN transcripts.source_type IS '来源：youtube-YouTube原生, whisper-本地转录, glm_translation-GLM翻译';

-- Indexes for transcripts
CREATE INDEX idx_transcripts_video ON transcripts(video_id);
CREATE INDEX idx_transcripts_video_lang ON transcripts(video_id, language);
CREATE INDEX idx_transcripts_language ON transcripts(language);
CREATE UNIQUE INDEX idx_transcripts_video_language ON transcripts(video_id, language);

-- 3.4 Articles Table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    tags JSON,
    reading_time INTEGER,
    word_count INTEGER,
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE articles IS '生成的博客文章表';
COMMENT ON COLUMN articles.content IS 'Markdown格式的文章内容';

-- Indexes for articles
CREATE INDEX idx_articles_video ON articles(video_id);
CREATE INDEX idx_articles_language ON articles(language);
CREATE INDEX idx_articles_created ON articles(created_at DESC);
CREATE INDEX idx_articles_view_count ON articles(view_count DESC);
CREATE INDEX idx_articles_favorite_count ON articles(favorite_count DESC);
-- Fixed: Use 'simple' config for multilingual content - BEST PRACTICE
CREATE INDEX idx_articles_title_search ON articles USING gin(to_tsvector('simple', title));
CREATE INDEX idx_articles_content_search ON articles USING gin(to_tsvector('simple', content));
CREATE UNIQUE INDEX idx_articles_video_language ON articles(video_id, language);
-- Partial index for articles with favorites - BEST PRACTICE
CREATE INDEX idx_articles_with_favorites ON articles(favorite_count DESC, created_at DESC)
WHERE favorite_count > 0;

-- 3.5 Profiles Table (User Profiles)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    preferred_languages JSON DEFAULT '["zh-Hans"]',
    notification_email VARCHAR(255),
    email_frequency VARCHAR(20) DEFAULT 'weekly',
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE profiles IS '用户配置表';
COMMENT ON COLUMN profiles.email_frequency IS '邮件摘要频率：daily-每日, weekly-每周, never-关闭';

-- Index for profiles
CREATE INDEX idx_profiles_email ON profiles(email);

-- Auto-create profile function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.6 User Favorites Table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE user_favorites IS '用户收藏表';

-- Indexes for user_favorites
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_article ON user_favorites(article_id);
CREATE INDEX idx_user_favorites_created ON user_favorites(created_at DESC);
-- Composite index for user's favorites - BEST PRACTICE
CREATE INDEX idx_user_favorites_user_created ON user_favorites(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_user_favorites_unique ON user_favorites(user_id, article_id);

-- 3.7 Processing Logs Table
CREATE TABLE processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    duration_seconds INTEGER,
    metadata JSON,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE processing_logs IS '处理日志表';

-- Indexes for processing_logs
CREATE INDEX idx_processing_logs_video ON processing_logs(video_id);
CREATE INDEX idx_processing_logs_task ON processing_logs(task_type);
CREATE INDEX idx_processing_logs_status ON processing_logs(status);
CREATE INDEX idx_processing_logs_created ON processing_logs(created_at DESC);

-- -----------------------------------------------------
-- 4. Triggers for updated_at
-- -----------------------------------------------------

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- 5. Functions for Auto-updating Counts
-- -----------------------------------------------------

-- Function to update article favorite_count
CREATE OR REPLACE FUNCTION update_article_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE articles
        SET favorite_count = favorite_count + 1
        WHERE id = NEW.article_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE articles
        SET favorite_count = favorite_count - 1
        WHERE id = OLD.article_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_favorite_count
    AFTER INSERT OR DELETE ON user_favorites
    FOR EACH ROW EXECUTE FUNCTION update_article_favorite_count();

-- -----------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- -----------------------------------------------------

-- 6.1 Enable RLS on all user-related tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- 6.2 Profiles RLS
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Fixed: Cache auth.uid() for performance - BEST PRACTICE
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING ((select auth.uid()) = id);

-- 6.3 Channels RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are viewable by everyone"
    ON channels FOR SELECT
    USING (true);

-- Policies for authenticated user
CREATE POLICY "Authenticated users can insert channels"
    ON channels FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update channels"
    ON channels FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete channels"
    ON channels FOR DELETE
    TO authenticated
    USING (true);

COMMENT ON POLICY "Authenticated users can insert channels" ON channels IS
    'Allow any authenticated user to add new channels';

COMMENT ON POLICY "Authenticated users can update channels" ON channels IS
    'Allow any authenticated user to update channel information';

COMMENT ON POLICY "Authenticated users can delete channels" ON channels IS
    'Allow any authenticated user to delete channels';

-- 6.4 Videos RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
    ON videos FOR SELECT
    USING (true);

-- 6.5 Transcripts RLS
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transcripts are viewable by everyone"
    ON transcripts FOR SELECT
    USING (true);

-- 6.6 Articles RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Articles are viewable by everyone"
    ON articles FOR SELECT
    USING (true);

-- Use security definer function for safe counter updates instead of complex RLS
-- See: increment_article_counter() function in section 7

-- 6.8 User Favorites RLS - Fixed: Cache auth.uid() - BEST PRACTICE
CREATE POLICY "Users can view own favorites"
    ON user_favorites FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own favorites"
    ON user_favorites FOR ALL
    USING ((select auth.uid()) = user_id);

-- -----------------------------------------------------
-- 7. Helper Function for Safe Counter Updates
-- -----------------------------------------------------

-- Security definer function to increment counters atomically - BEST PRACTICE
CREATE OR REPLACE FUNCTION increment_article_counter(
    article_id UUID,
    counter_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF counter_type = 'view' THEN
        UPDATE articles
        SET view_count = view_count + 1
        WHERE id = increment_article_counter.article_id;
    ELSIF counter_type = 'favorite' THEN
        UPDATE articles
        SET favorite_count = favorite_count + 1
        WHERE id = increment_article_counter.article_id;
    ELSIF counter_type = 'download' THEN
        UPDATE articles
        SET download_count = download_count + 1
        WHERE id = increment_article_counter.article_id;
    END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_article_counter(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------
-- 8. Sample Data (Optional - for testing)
-- -----------------------------------------------------

-- Insert a sample channel (you can remove this later)
INSERT INTO channels (
    channel_id,
    channel_name,
    channel_handle,
    description,
    thumbnail_url,
    target_languages
) VALUES (
    'UCBJycsmduvYEL83R_U4JriQ',
    'Marques Brownlee',
    'mkbhd',
    'Tech reviews, tutorials, and more!',
    'https://yt3.ggpht.com/ytc/AKiro7YL25mJxkkH7Q0',
    '["zh-Hans", "ja"]'
) ON CONFLICT (channel_id) DO NOTHING;

-- -----------------------------------------------------
-- End of Migration
-- -----------------------------------------------------
