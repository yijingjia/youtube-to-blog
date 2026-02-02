"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  MoreVertical,
  Trash2,
  Power,
  PowerOff,
  ExternalLink,
  Play,
  Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChannelRow } from '@/types/supabase'

interface ChannelTableProps {
  channels: ChannelRow[]
  onChannelsChange: () => void
}

export function ChannelTable({ channels, onChannelsChange }: ChannelTableProps) {
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [processMessage, setProcessMessage] = useState<{ [key: string]: string }>({})

  const handleToggleActive = async (channel: ChannelRow) => {
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !channel.is_active }),
      })

      if (!res.ok) throw new Error('Failed to update channel')

      onChannelsChange()
      setActionMenu(null)
    } catch (error) {
      console.error('Error updating channel:', error)
    }
  }

  const handleDelete = async (channel: ChannelRow) => {
    if (!confirm(`Are you sure you want to delete "${channel.channel_name}"?`)) return

    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete channel')

      onChannelsChange()
      setActionMenu(null)
    } catch (error) {
      console.error('Error deleting channel:', error)
    }
  }

  const handleProcess = async (channel: ChannelRow) => {
    setProcessing(channel.id)
    setProcessMessage((prev) => ({ ...prev, [channel.id]: '🎬 Processing...' }))

    try {
      const startTime = Date.now()

      const res = await fetch('/api/process/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channel.channel_id }),
      })

      const data = await res.json()

      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to process channel')
      }

      // Success message with duration
      setProcessMessage((prev) => ({
        ...prev,
        [channel.id]: `✅ Completed in ${duration}s`
      }))

      // Log output to console for debugging
      if (data.output) {
        console.log('Processing output:', data.output)
      }

      setTimeout(() => {
        setProcessMessage((prev) => {
          const next = { ...prev }
          delete next[channel.id]
          return next
        })
        onChannelsChange()
      }, 5000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setProcessMessage((prev) => ({
        ...prev,
        [channel.id]: `❌ ${errorMsg.substring(0, 50)}${errorMsg.length > 50 ? '...' : ''}`
      }))

      // Keep error message longer
      setTimeout(() => {
        setProcessMessage((prev) => {
          const next = { ...prev }
          delete next[channel.id]
          return next
        })
      }, 10000)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full">
        <thead className="bg-secondary/30">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Channel
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Languages
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stats
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50 bg-card">
          {channels.map((channel) => (
            <tr key={channel.id} className="hover:bg-accent/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {channel.thumbnail_url && (
                    <img
                      src={channel.thumbnail_url}
                      alt={channel.channel_name}
                      className="h-10 w-10 rounded-full border border-border"
                    />
                  )}
                  <div>
                    <Link
                      href={`/channels/${channel.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {channel.channel_name}
                    </Link>
                    {channel.channel_handle && (
                      <p className="text-xs text-muted-foreground">@{channel.channel_handle}</p>
                    )}
                  </div>
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {((channel.target_languages as string[] | null) || ['zh-Hans']).map((lang: string) => (
                    <span
                      key={lang}
                      className="rounded-full bg-secondary/50 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="text-sm">
                  <div className="font-medium text-foreground">
                    {(channel.subscriber_count || 0).toLocaleString()} subs
                  </div>
                  <div className="text-muted-foreground">
                    {(channel.video_count || 0).toLocaleString()} videos
                  </div>
                </div>
              </td>

              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    channel.is_active
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      channel.is_active ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                  {channel.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  {processMessage[channel.id] && (
                    <span className="text-xs text-muted-foreground">
                      {processMessage[channel.id].startsWith('Error') ? '⚠️' : '✓'}{' '}
                      {processMessage[channel.id]}
                    </span>
                  )}

                  {processing === channel.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <button
                      onClick={() => handleProcess(channel)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                      title="Process now"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}

                  <a
                    href={`https://youtube.com/channel/${channel.channel_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="View on YouTube"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  <div className="relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === channel.id ? null : channel.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    <AnimatePresence>
                      {actionMenu === channel.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-background shadow-lg"
                        >
                          <button
                            onClick={() => handleToggleActive(channel)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent transition-colors"
                          >
                            {channel.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 text-muted-foreground" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 text-muted-foreground" />
                                Activate
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(channel)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {channels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-secondary p-4 mb-4">
            <span className="text-4xl">📺</span>
          </div>
          <h3 className="text-lg font-medium text-foreground">No channels yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Add your first YouTube channel to start processing videos
          </p>
        </div>
      )}
    </div>
  )
}
