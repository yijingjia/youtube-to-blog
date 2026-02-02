"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Database } from '@/types/database'

type UserFavoriteInsert = Database['public']['Tables']['user_favorites']['Insert']

interface FavoriteButtonProps {
  articleId: string
  initialIsFavorited: boolean
  className?: string
}

export function FavoriteButton({ articleId, initialIsFavorited, className }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const toggleFavorite = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      router.push('/login')
      return
    }

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', articleId)

        if (error) throw error
        setIsFavorited(false)
      } else {
        // Build type-safe insert data, but cast to 'never' for Supabase RLS type inference issue
        const insertData: UserFavoriteInsert = {
          user_id: user.id,
          article_id: articleId
        }
        const { error } = await supabase
          .from('user_favorites')
          .insert(insertData as never)

        if (error) throw error
        setIsFavorited(true)
      }

      router.refresh()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 transition-colors border",
        isFavorited
          ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
          : "bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
        className
      )}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={clsx("h-4 w-4", isFavorited && "fill-current")} />
      <span className="text-sm font-medium">{isFavorited ? "Favorited" : "Favorite"}</span>
    </button>
  )
}
