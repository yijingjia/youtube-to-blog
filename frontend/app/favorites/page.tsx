import { createServer } from '@/lib/supabase-server'
import { ArticleCard } from '@/components/layout/ArticleCard'
import { redirect } from 'next/navigation'
import { PostgrestError } from '@supabase/supabase-js'
import { ArticleWithVideo } from '@/types/supabase'

export const revalidate = 0

interface FavoriteWithArticle {
  article_id: string
  articles: ArticleWithVideo | null
}

export default async function FavoritesPage() {
  const supabase = await createServer()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: favorites, error } = await supabase
    .from('user_favorites')
    .select(`
      article_id,
      articles (
        *,
        videos (
          *,
          channels (
            *
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }) as { data: FavoriteWithArticle[] | null, error: PostgrestError | null }

  if (error) {
    console.error('Error fetching favorites:', error)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-destructive">
          <p className="font-medium">Error loading favorites</p>
          <p className="text-sm opacity-80">{error.message}</p>
        </div>
      </div>
    )
  }

  const articles = favorites
    ?.map((f) => f.articles)
    .filter((a): a is ArticleWithVideo => a !== null) ?? []

  return (
    <div className="space-y-8">
      <div className="mb-8 flex items-baseline justify-between border-b border-border pb-4">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
          My Favorites
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          {articles.length} saved stories
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="rounded-full bg-secondary p-4 mb-4">
            <span className="text-4xl">❤️</span>
          </div>
          <h3 className="text-lg font-medium text-foreground">No favorites yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Save stories you want to read later by clicking the heart icon on any article.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
