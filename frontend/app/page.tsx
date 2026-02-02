import { createServer } from '@/lib/supabase-server'
import { ArticleCard } from '@/components/layout/ArticleCard'
import { FilterBar } from '@/components/layout/FilterBar'
import { Pagination } from '@/components/ui/Pagination'
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { headers } from 'next/headers'
import { PostgrestError } from '@supabase/supabase-js'
import { 
  ChannelRow, 
  ArticleWithVideo, 
  VideoWithArticles 
} from '@/types/supabase'

export const revalidate = 60

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const supabase = await createServer()
  const params = await searchParams
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''

  // Simple language detection (e.g. "en-US,en;q=0.9" -> "en")
  // We prioritize the first 2 characters for basic matching, or full code if supported
  const systemLang = acceptLanguage.split(',')[0].split('-')[0]

  const { data: channels } = await supabase
    .from('channels')
    .select('id, channel_name')
    .eq('is_active', true)
    .order('channel_name') as { data: Pick<ChannelRow, 'id' | 'channel_name'>[] | null }

  // Get distinct languages from articles
  const { data: languagesData } = await supabase
    .from('articles')
    .select('language') as { data: { language: string }[] | null }

  const availableLanguages = Array.from(new Set(languagesData?.map(a => a.language) || [])).sort()

  let query = supabase
    .from('videos')
    .select(`
      *,
      channels (
        channel_name,
        thumbnail_url
      ),
      articles!inner (
        id,
        video_id,
        language,
        title,
        content,
        summary,
        reading_time,
        view_count,
        created_at
      )
    `, { count: 'exact' })

  if (params.channel && params.channel !== 'all') {
    query = query.eq('channel_id', params.channel)
  }

  if (params.lang && params.lang !== 'all') {
    query = query.eq('articles.language', params.lang)
  }

  if (params.q) {
    query = query.textSearch('articles.title', params.q, {
      config: 'simple',
      type: 'websearch'
    })
  }

  if (params.date && params.date !== 'all') {

    const now = new Date()
    let startDate

    switch (params.date) {
      case 'today':
        startDate = startOfDay(now)
        break
      case 'week':
        startDate = startOfWeek(now)
        break
      case 'month':
        startDate = startOfMonth(now)
        break
    }

    if (startDate) {
      query = query.gte('published_at', startDate.toISOString())
    }
  }

  const sort = params.sort || 'newest'
  switch (sort) {
    case 'oldest':
      query = query.order('published_at', { ascending: true })
      break
    case 'popular':
      query = query.order('view_count', { ascending: false })
      break
    case 'longest':
      query = query.order('duration', { ascending: false })
      break
    case 'newest':
    default:
      query = query.order('published_at', { ascending: false })
      break
  }

  const page = Number(params.page) || 1
  const pageSize = 18
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.range(from, to)

  const { data: videos, count, error } = await query as { data: VideoWithArticles[] | null, count: number | null, error: PostgrestError | null }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-destructive">
          <p className="font-medium">Error loading articles</p>
          <p className="text-sm opacity-80">{error.message}</p>
        </div>
      </div>
    )
  }

  const hasMore = (count || 0) > to + 1

  const processedArticles = videos?.map((video) => {
    const articles = video.articles || []

    let selectedArticle = articles.find((a) => a.language === params.lang)

    if (!selectedArticle && params.lang === 'all') {
      selectedArticle = articles.find((a) => a.language.startsWith(systemLang))
    }

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
    <div className="space-y-8">
      <FilterBar channels={channels || []} languages={availableLanguages} />

      <section>
        <div className="mb-8 flex items-baseline justify-between border-b border-border pb-4">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            {params.sort === 'popular' ? 'Most Popular' : 'Latest Stories'}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            {count} results
          </p>
        </div>

        {processedArticles?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <span className="text-4xl">🔍</span>
            </div>
            <h3 className="text-lg font-medium text-foreground">No matches found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Try adjusting your filters or search criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {processedArticles?.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>

      {count && count > pageSize && (
        <Pagination
          page={page}
          hasMore={hasMore}
          baseUrl="/"
          searchParams={params}
          totalCount={count}
          pageSize={pageSize}
        />
      )}
    </div>
  )
}

