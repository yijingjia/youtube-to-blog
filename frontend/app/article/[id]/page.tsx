import { createServer } from '@/lib/supabase-server'
import { ArticleView } from '@/components/article/ArticleView'
import { FavoriteButton } from '@/components/article/FavoriteButton'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import { Database } from '@/types/database'

export const revalidate = 60

type ArticleData = Database['public']['Tables']['articles']['Row'] & {
  videos: (Database['public']['Tables']['videos']['Row'] & {
    channels: Database['public']['Tables']['channels']['Row'] | null
    transcripts: Database['public']['Tables']['transcripts']['Row'][]
  }) | null
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServer()

  const { data: articleData, error: articleError } = await supabase
    .from('articles')
    .select(`
      *,
      videos (
        *,
        channels (*),
        transcripts (*)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (articleError || !articleData) {
    console.error("Article not found:", articleError)
    notFound()
  }

  const article = articleData as unknown as ArticleData

  const { data: { user } } = await supabase.auth.getUser()
  let isFavorited = false

  if (user) {
    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_id', id)
      .maybeSingle()

    isFavorited = !!data
  }

  const transcripts = article.videos?.transcripts || []
  const originalTranscript = transcripts.find(t => t.language === 'en')?.content || "No original transcript available."
  const translatedTranscript = transcripts.find(t => t.language === article.language || (t.language !== 'en'))?.content || "No translated transcript available."

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-30 mb-8 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="group inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Stories
          </Link>
          <div className="flex items-center gap-4">
            {article.videos?.channels?.thumbnail_url && (
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-border">
                <Image
                  src={article.videos.channels.thumbnail_url}
                  alt={article.videos.channels.channel_name}
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-12 text-center">
          <div className="mb-6 flex items-center justify-center gap-3 text-sm font-medium text-muted-foreground">
            <span className="text-primary">{article.videos?.channels?.channel_name}</span>
            <span>•</span>
            <span>{article.created_at && new Date(article.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <h1 className="mb-8 font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl max-w-4xl mx-auto">
            {article.title}
          </h1>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <a href={`https://youtu.be/${article.videos?.video_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-1.5 transition-colors hover:bg-secondary/80 hover:text-foreground">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              Watch Video
            </a>
            <FavoriteButton
              articleId={article.id}
              initialIsFavorited={isFavorited}
            />
          </div>
        </div>

        <ArticleView
          article={article}
          originalTranscript={originalTranscript}
          translatedTranscript={translatedTranscript}
        />
      </div>
    </div>
  )
}
