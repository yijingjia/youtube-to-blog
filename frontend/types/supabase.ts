import { Database } from './database'

// =============================================================================
// Base Table Row Types (aliases for convenience)
// =============================================================================

export type ArticleRow = Database['public']['Tables']['articles']['Row']
export type VideoRow = Database['public']['Tables']['videos']['Row']
export type ChannelRow = Database['public']['Tables']['channels']['Row']
export type TranscriptRow = Database['public']['Tables']['transcripts']['Row']
export type UserFavoriteRow = Database['public']['Tables']['user_favorites']['Row']

// =============================================================================
// Insert Types
// =============================================================================

export type ArticleInsert = Database['public']['Tables']['articles']['Insert']
export type VideoInsert = Database['public']['Tables']['videos']['Insert']
export type ChannelInsert = Database['public']['Tables']['channels']['Insert']
export type TranscriptInsert = Database['public']['Tables']['transcripts']['Insert']

// =============================================================================
// Update Types
// =============================================================================

export type ArticleUpdate = Database['public']['Tables']['articles']['Update']
export type VideoUpdate = Database['public']['Tables']['videos']['Update']
export type ChannelUpdate = Database['public']['Tables']['channels']['Update']
export type TranscriptUpdate = Database['public']['Tables']['transcripts']['Update']

// =============================================================================
// Composite Types (for JOIN queries)
// =============================================================================

/**
 * Article with its associated video and channel information.
 * Used in ArticleCard and article listing pages.
 */
export type ArticleWithVideo = ArticleRow & {
  videos: (VideoRow & {
    channels: ChannelRow | null
  }) | null
}

/**
 * Video with its channel information.
 * Used when displaying video details without articles.
 */
export type VideoWithChannel = VideoRow & {
  channels: ChannelRow | null
}

/**
 * Video with all its articles and channel.
 * Used in channel pages to list videos with their articles.
 */
export type VideoWithArticles = VideoRow & {
  channels: ChannelRow | null
  articles: ArticleRow[]
}

/**
 * Channel with its videos count or video list.
 * Used in channel listing pages.
 */
export type ChannelWithVideos = ChannelRow & {
  videos?: VideoRow[]
}

// =============================================================================
// API Response Types
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// Re-export the Database type for convenience
export type { Database } from './database'
export type { Json } from './database'
