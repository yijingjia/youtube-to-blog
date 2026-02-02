"use client"

import { useState } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChannelRow } from '@/types/supabase'

interface AddChannelDialogProps {
  isOpen: boolean
  onClose: () => void
  onChannelAdded: (channel: ChannelRow) => void
}

interface ChannelInfo {
  channel_id: string
  channel_name: string
  channel_handle?: string
  description?: string
  thumbnail_url?: string
  subscriber_count?: number
  video_count?: number
}

export function AddChannelDialog({ isOpen, onClose, onChannelAdded }: AddChannelDialogProps) {
  const [step, setStep] = useState<'input' | 'preview' | 'submitting'>('input')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['zh-Hans'])

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh-Hans', name: '简体中文' },
    { code: 'zh-Hant', name: '繁體中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt', name: 'Português' },
  ]

  const extractChannelId = (input: string): string | null => {
    // Trim whitespace
    const trimmed = input.trim()

    // Direct handle input (@username)
    if (trimmed.startsWith('@')) {
      return trimmed
    }

    // Handle various YouTube URL formats
    const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]{24})/)
    if (channelMatch) return channelMatch[1]

    // Handle URL with @username
    const handleMatch = trimmed.match(/youtube\.com\/@([\w-]+)/)
    if (handleMatch) return `@${handleMatch[1]}`

    // Short handle format (youtube.com/@username without protocol)
    const shortHandleMatch = trimmed.match(/^@([\w-]+)$/)
    if (shortHandleMatch) return trimmed

    // Direct channel ID (starts with UC)
    const directIdMatch = trimmed.match(/^(UC[\w-]{24})$/)
    if (directIdMatch) return directIdMatch[1]

    return null
  }

  const handlePreview = async () => {
    const channelId = extractChannelId(input)
    if (!channelId) {
      setError('Invalid YouTube channel URL or ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call API to fetch channel info from YouTube
      const res = await fetch(`/api/youtube/channel-info?channelId=${channelId}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to fetch channel info')

      setChannelInfo(data.channel)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channel info')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!channelInfo) return

    setStep('submitting')
    setError('')

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...channelInfo,
          target_languages: selectedLanguages,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to add channel')

      onChannelAdded(data.channel)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel')
      setStep('preview')
    }
  }

  const handleClose = () => {
    setStep('input')
    setInput('')
    setError('')
    setChannelInfo(null)
    setSelectedLanguages(['zh-Hans'])
    onClose()
  }

  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev =>
      prev.includes(code)
        ? prev.filter(l => l !== code)
        : [...prev, code]
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-background rounded-2xl shadow-xl border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                {step === 'preview' ? 'Confirm Channel' : 'Add Channel'}
              </h2>
              <button
                onClick={handleClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {step === 'input' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      YouTube Channel URL or ID
                    </label>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
                      placeholder="https://youtube.com/@username or channel ID"
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Examples: youtube.com/@mkbhd or UCBJycsmduvYEL83R_U4JriQ
                    </p>
                  </div>

                  <button
                    onClick={handlePreview}
                    disabled={loading || !input.trim()}
                    className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching Channel Info...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </>
              )}

              {step === 'preview' && channelInfo && (
                <>
                  <div className="flex gap-4 rounded-lg bg-secondary/30 p-4">
                    {channelInfo.thumbnail_url && (
                      <img
                        src={channelInfo.thumbnail_url}
                        alt={channelInfo.channel_name}
                        className="h-20 w-20 rounded-full border-2 border-border"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-serif text-lg font-bold text-foreground">
                        {channelInfo.channel_name}
                      </h3>
                      {channelInfo.channel_handle && (
                        <p className="text-sm text-muted-foreground">@{channelInfo.channel_handle}</p>
                      )}
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {channelInfo.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-foreground">
                      Target Languages
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => toggleLanguage(lang.code)}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            selectedLanguages.includes(lang.code)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('input')}
                      className="flex-1 rounded-lg border border-border px-4 py-3 font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex-1 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Add Channel
                    </button>
                  </div>
                </>
              )}

              {step === 'submitting' && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-4 text-sm text-muted-foreground">Adding channel...</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
