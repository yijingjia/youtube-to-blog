"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Clock } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ArticleWithVideo } from '@/types/supabase'

interface ArticleCardProps {
  article: ArticleWithVideo
  featured?: boolean
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  if (featured) {
    return (
      <Link href={`/article/${article.id}`} className="group relative block w-full overflow-hidden rounded-2xl bg-card border border-border transition-all hover:shadow-lg hover:border-primary/20">
        <div className="grid md:grid-cols-2 gap-0 h-full">
          <div className="relative aspect-video md:aspect-auto overflow-hidden bg-muted">
             {article.videos?.thumbnail_url ? (
               <Image 
                 src={article.videos.thumbnail_url} 
                 alt={article.title}
                 fill
                 className="object-cover transition-transform duration-700 group-hover:scale-105"
                 sizes="(max-width: 768px) 100vw, 50vw"
                 priority
               />
             ) : (
               <div className="flex h-full items-center justify-center text-muted-foreground">No Thumbnail</div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="flex flex-col justify-center p-6 md:p-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Featured
              </span>
              <span className="text-xs text-muted-foreground">
                {article.videos?.published_at && formatDistanceToNow(new Date(article.videos.published_at), { addSuffix: true })}
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold leading-tight text-card-foreground mb-4 group-hover:text-primary transition-colors">
              {article.title}
            </h2>
            <p className="text-muted-foreground line-clamp-3 mb-6 font-sans text-lg leading-relaxed">
              {article.summary || article.content.substring(0, 200) + "..."}
            </p>
            <div className="flex items-center gap-3 text-sm font-medium text-foreground">
              {article.videos?.channels?.thumbnail_url && (
                <div className="relative h-6 w-6 rounded-full overflow-hidden">
                  <Image 
                    src={article.videos.channels.thumbnail_url} 
                    alt="" 
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                </div>
              )}
              <span>{article.videos?.channels?.channel_name}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link 
      href={`/article/${article.id}`}
      className="group flex flex-col h-full overflow-hidden rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all hover:shadow-md"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-muted relative rounded-t-xl">
         {article.videos?.thumbnail_url ? (
           <Image 
             src={article.videos.thumbnail_url} 
             alt={article.title}
             fill
             className="object-cover transition-transform duration-500 group-hover:scale-105"
             sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
           />
         ) : (
           <div className="flex h-full items-center justify-center text-muted-foreground bg-secondary">
             No Thumbnail
           </div>
         )}
         {article.videos?.duration && (
           <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-white rounded-md z-10">
             {Math.floor(article.videos.duration / 60)}:{String(article.videos.duration % 60).padStart(2, '0')}
           </div>
         )}
      </div>
      
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
           <span className="font-medium text-primary">{article.videos?.channels?.channel_name}</span>
           <span>•</span>
           <span>
             {article.videos?.published_at && format(new Date(article.videos.published_at), 'MMM d')}
           </span>
        </div>
        
        <h3 className="mb-3 text-lg font-bold leading-snug text-card-foreground line-clamp-2 font-serif group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        
        <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {article.summary || article.content.substring(0, 150) + "..."}
        </p>
        
        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1">
               <Clock className="h-3 w-3" />
               {article.reading_time || 5} min
             </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
