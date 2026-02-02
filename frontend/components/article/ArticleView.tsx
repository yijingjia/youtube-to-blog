"use client"

import { useState } from 'react'
import { Tab } from '@headlessui/react'
import ReactMarkdown from 'react-markdown'
import { clsx } from 'clsx'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { coldarkCold } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Languages, SplitSquareHorizontal, FileText } from 'lucide-react'
import { ArticleRow } from '@/types/supabase'

interface ArticleViewProps {
  article: ArticleRow
  originalTranscript: string
  translatedTranscript: string
}

export function ArticleView({ article, originalTranscript, translatedTranscript }: ArticleViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(3)

  const originalParagraphs = originalTranscript.split(/\n\n+/).filter(Boolean)
  const translatedParagraphs = translatedTranscript.split(/\n\n+/).filter(Boolean)
  
  const maxLen = Math.max(originalParagraphs.length, translatedParagraphs.length)
  const bilingualPairs = Array.from({ length: maxLen }).map((_, i) => ({
    original: originalParagraphs[i] || "",
    translated: translatedParagraphs[i] || ""
  }))

  const tabs = [
    { name: 'Original', icon: FileText, content: originalTranscript },
    { name: 'Translated', icon: Languages, content: translatedTranscript },
    { name: 'Bilingual', icon: SplitSquareHorizontal, content: null },
    { name: 'Article', icon: BookOpen, content: article.content },
  ]

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <div className="sticky top-20 z-40 mb-8 flex justify-center">
          <Tab.List className="flex items-center space-x-1 rounded-full bg-secondary/80 backdrop-blur-md p-1.5 shadow-sm ring-1 ring-border">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  clsx(
                    'relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all outline-none',
                    selected
                      ? 'text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                  )
                }
              >
                {({ selected }) => (
                  <>
                    {selected && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-full bg-foreground"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      {tab.name}
                    </span>
                  </>
                )}
              </Tab>
            ))}
          </Tab.List>
        </div>

        <Tab.Panels className="relative min-h-[60vh]">
          <AnimatePresence mode="wait">
            <Tab.Panel
              as={motion.div}
              key="original"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl bg-card p-8 md:p-12 shadow-sm border border-border/50 whitespace-pre-wrap font-serif text-lg leading-loose text-foreground/90 w-full"
            >
              {originalTranscript}
            </Tab.Panel>
            
            <Tab.Panel
              as={motion.div}
              key="translated"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl bg-card p-8 md:p-12 shadow-sm border border-border/50 whitespace-pre-wrap font-serif text-lg leading-loose text-foreground/90 w-full"
            >
              {translatedTranscript}
            </Tab.Panel>

            <Tab.Panel
              as={motion.div}
              key="bilingual"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl bg-card shadow-sm border border-border/50 overflow-hidden"
            >
               <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="bg-secondary/30 p-4 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground text-center border-b md:border-b-0">Original</div>
                  <div className="bg-secondary/30 p-4 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground text-center border-b md:border-b-0">Translated</div>
               </div>
               <div className="divide-y divide-border/50">
                 {bilingualPairs.map((pair, idx) => (
                   <div key={idx} className="grid grid-cols-1 md:grid-cols-2 group hover:bg-accent/30 transition-colors">
                     <div className="p-6 text-foreground/80 border-b md:border-b-0 md:border-r border-border/50 leading-relaxed font-sans text-base">
                       {pair.original}
                     </div>
                     <div className="p-6 text-foreground/90 leading-relaxed font-serif text-lg">
                       {pair.translated}
                     </div>
                   </div>
                 ))}
               </div>
            </Tab.Panel>

            <Tab.Panel
              as={motion.div}
              key="article"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl bg-card p-8 md:p-16 shadow-sm border border-border/50 w-full"
            >
              <article className="prose prose-stone prose-lg md:prose-xl max-w-none 
                prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground
                prose-p:font-body prose-p:text-foreground/80 prose-p:leading-8
                prose-a:text-primary prose-a:no-underline prose-a:border-b prose-a:border-primary/30 hover:prose-a:border-primary
                prose-strong:font-bold prose-strong:text-foreground
                prose-blockquote:border-l-primary prose-blockquote:bg-secondary/30 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                prose-code:text-primary prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-medium
                prose-img:rounded-xl prose-img:shadow-md
              ">
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const isInline = !match
                      return !isInline && match ? (
                        <SyntaxHighlighter
                          style={coldarkCold}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ borderRadius: '0.75rem', margin: '2rem 0', border: '1px solid var(--border)' }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </article>
            </Tab.Panel>
          </AnimatePresence>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
