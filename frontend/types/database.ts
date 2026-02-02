export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      articles: {
        Row: {
          id: string
          video_id: string | null
          language: string
          title: string
          content: string
          summary: string | null
          tags: Json | null
          reading_time: number | null
          word_count: number | null
          view_count: number | null
          favorite_count: number | null
          download_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          video_id?: string | null
          language: string
          title: string
          content: string
          summary?: string | null
          tags?: Json | null
          reading_time?: number | null
          word_count?: number | null
          view_count?: number | null
          favorite_count?: number | null
          download_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          video_id?: string | null
          language?: string
          title?: string
          content?: string
          summary?: string | null
          tags?: Json | null
          reading_time?: number | null
          word_count?: number | null
          view_count?: number | null
          favorite_count?: number | null
          download_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      channels: {
        Row: {
          id: string
          channel_id: string
          channel_name: string
          channel_handle: string | null
          description: string | null
          thumbnail_url: string | null
          subscriber_count: number | null
          video_count: number | null
          target_languages: Json | null
          is_active: boolean | null
          last_checked_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          channel_id: string
          channel_name: string
          channel_handle?: string | null
          description?: string | null
          thumbnail_url?: string | null
          subscriber_count?: number | null
          video_count?: number | null
          target_languages?: Json | null
          is_active?: boolean | null
          last_checked_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          channel_id?: string
          channel_name?: string
          channel_handle?: string | null
          description?: string | null
          thumbnail_url?: string | null
          subscriber_count?: number | null
          video_count?: number | null
          target_languages?: Json | null
          is_active?: boolean | null
          last_checked_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          video_id: string
          channel_id: string | null
          title: string
          description: string | null
          thumbnail_url: string | null
          duration: number | null
          published_at: string
          view_count: number | null
          like_count: number | null
          comment_count: number | null
          processing_status: string | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          video_id: string
          channel_id?: string | null
          title: string
          description?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          published_at: string
          view_count?: number | null
          like_count?: number | null
          comment_count?: number | null
          processing_status?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          video_id?: string
          channel_id?: string | null
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          published_at?: string
          view_count?: number | null
          like_count?: number | null
          comment_count?: number | null
          processing_status?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          id: string
          video_id: string | null
          language: string
          content: string
          source_type: string
          is_original: boolean | null
          word_count: number | null
          char_count: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          video_id?: string | null
          language: string
          content: string
          source_type: string
          is_original?: boolean | null
          word_count?: number | null
          char_count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          video_id?: string | null
          language?: string
          content?: string
          source_type?: string
          is_original?: boolean | null
          word_count?: number | null
          char_count?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          id: string
          user_id: string
          article_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          article_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          article_id?: string
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
