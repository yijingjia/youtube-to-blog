import { createServer } from '@/lib/supabase-server'
import Link from 'next/link'
import { Users, Video, ExternalLink } from 'lucide-react'
import { ChannelRow } from '@/types/supabase'
import { PostgrestError } from '@supabase/supabase-js'

export const revalidate = 60

export default async function ChannelsPage() {
  const supabase = await createServer()

  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .eq('is_active', true)
    .order('channel_name') as { data: ChannelRow[] | null, error: PostgrestError | null }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-destructive">
          <p className="font-medium">Error loading channels</p>
          <p className="text-sm opacity-80">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <section>
        <div className="mb-8 flex items-baseline justify-between border-b border-border pb-4">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground">
            Channels
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Sources we track
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {channels?.map((channel) => (
            <div
              key={channel.id}
              className="group relative flex flex-col overflow-hidden rounded-xl bg-card border border-border/50 transition-all hover:shadow-md hover:border-primary/20"
            >
              <Link
                href={`/channels/${channel.id}`}
                className="absolute inset-0 z-10"
              >
                <span className="sr-only">View channel</span>
              </Link>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border">
                    {channel.thumbnail_url ? (
                      <img
                        src={channel.thumbnail_url}
                        alt={channel.channel_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary text-2xl font-serif">
                        {channel.channel_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <a
                    href={`https://youtube.com/channel/${channel.channel_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-20 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <h3 className="mb-2 font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {channel.channel_name}
                </h3>

                <p className="mb-6 text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
                  {channel.description || "No description available."}
                </p>

                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                    <Users className="h-3.5 w-3.5" />
                    <span>{(channel.subscriber_count || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                    <Video className="h-3.5 w-3.5" />
                    <span>{(channel.video_count || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(!channels || channels.length === 0) && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="rounded-full bg-secondary p-4 mb-4">
            <span className="text-4xl">📺</span>
          </div>
          <h3 className="text-lg font-medium text-foreground">No channels yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            The database doesn&apos;t have any active channels. Add some channels to the database to see them here.
          </p>
        </div>
      )}
    </div>
  )
}
