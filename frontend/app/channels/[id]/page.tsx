import { createServer } from '@/lib/supabase-server'
import { ArticleCard } from '@/components/layout/ArticleCard'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Users, Video, ExternalLink } from 'lucide-react'
import { headers } from 'next/headers'
import { PostgrestError } from '@supabase/supabase-js'
import { 
  ChannelRow, 
  ArticleWithVideo, 
  VideoWithArticles 
} from '@/types/supabase'

export const revalidate = 60

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServer()
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const systemLang = acceptLanguage.split(',')[0].split('-')[0]

  const { data: channel, error: channelError } = await supabase
    .from('channels')
    .select('*')
    .eq('id', id)
    .single() as { data: ChannelRow | null, error: PostgrestError | null }

  if (channelError || !channel) {
    console.error("Channel not found:", channelError)
    notFound()
  }

  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select(`
      *,
      channels (
        *
      ),
      articles!inner (
        *
      )
    `)
    .eq('channel_id', id)
    .order('published_at', { ascending: false })

  const processedArticles = (videos as VideoWithArticles[] | null)?.map((video) => {
    const articles = video.articles || []

    let selectedArticle = articles.find((a) => a.language.startsWith(systemLang))

    if (!selectedArticle) {
      selectedArticle = articles.find((a) => a.language === 'zh' || a.language === 'zh-Hans' || a.language === 'zh-CN')
    }

    if (!selectedArticle && articles.length > 0) {
      selectedArticle = articles[0]
    }

    if (!selectedArticle) return null

    return {
      ...selectedArticle,
      videos: {
        ...video,
        channels: video.channels as ChannelRow | null,
        articles: undefined
      }
    } as unknown as ArticleWithVideo
  }).filter((article): article is ArticleWithVideo => article !== null) ?? []

  return (
    <div className="space-y-12 pb-20">
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 bg-secondary/30 px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-border">
        <div className="mx-auto max-w-5xl">
          <Link href="/channels" className="mb-8 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Channels
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="relative h-24 w-24 md:h-32 md:w-32 flex-shrink-0 overflow-hidden rounded-full border-4 border-background shadow-sm">
              {channel.thumbnail_url ? (
                <img
                  src={channel.thumbnail_url}
                  alt={channel.channel_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary text-4xl font-serif">
                  {channel.channel_name.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-2">
                  {channel.channel_name}
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                  {channel.description || "No description available."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{(channel.subscriber_count || 0).toLocaleString()} Subscribers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <span>{(channel.video_count || 0).toLocaleString()} Videos</span>
                </div>
                <a
                  href={`https://youtube.com/channel/${channel.channel_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit YouTube Channel
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-baseline justify-between border-b border-border pb-4">
          <h2 className="font-serif text-2xl font-bold text-foreground">
            Latest Stories
          </h2>
          <span className="text-sm text-muted-foreground">
            {processedArticles?.length || 0} articles
          </span>
        </div>

        {(!processedArticles || processedArticles.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-secondary/20 rounded-xl border border-dashed border-border">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <span className="text-4xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-foreground">No articles found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              We haven&apos;t processed any videos from this channel yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {processedArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
