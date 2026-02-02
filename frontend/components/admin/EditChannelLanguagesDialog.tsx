"use client"

import { useState, useEffect } from 'react'
import { X, Loader2, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChannelRow } from '@/types/supabase'

interface EditChannelLanguagesDialogProps {
  isOpen: boolean
  onClose: () => void
  channel: ChannelRow | null
  onUpdate: () => void
}

export function EditChannelLanguagesDialog({ 
  isOpen, 
  onClose, 
  channel, 
  onUpdate 
}: EditChannelLanguagesDialogProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

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

  useEffect(() => {
    if (channel?.target_languages) {
      // Ensure target_languages is an array of strings
      const langs = Array.isArray(channel.target_languages) 
        ? channel.target_languages as string[]
        : []
      setSelectedLanguages(langs)
    } else {
      setSelectedLanguages(['zh-Hans'])
    }
  }, [channel])

  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev =>
      prev.includes(code)
        ? prev.filter(l => l !== code)
        : [...prev, code]
    )
  }

  const handleSubmit = async () => {
    if (!channel) return

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_languages: selectedLanguages
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update languages')
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update languages')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!channel) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-background rounded-2xl shadow-xl border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-secondary p-2">
                  <Globe className="h-5 w-5 text-foreground" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground">
                  Manage Languages
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Select target languages for <span className="text-foreground font-semibold">{channel.channel_name}</span>
                </h3>
                
                {error && (
                  <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => toggleLanguage(lang.code)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors border ${
                        selectedLanguages.includes(lang.code)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
                
                <p className="mt-4 text-xs text-muted-foreground">
                  New videos from this channel will be translated into selected languages.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 font-medium text-foreground hover:bg-secondary transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
