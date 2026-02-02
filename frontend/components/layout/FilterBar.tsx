"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { Check, ChevronDown, Filter, X, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

interface Channel {
  id: string
  channel_name: string
}

interface FilterBarProps {
  channels: Channel[]
  languages: string[]
}

const sortOptions = [
  { name: 'Newest', value: 'newest' },
  { name: 'Oldest', value: 'oldest' },
  { name: 'Most Viewed', value: 'popular' },
  { name: 'Longest Read', value: 'longest' },
]

const dateOptions = [
  { name: 'Any Time', value: 'all' },
  { name: 'Today', value: 'today' },
  { name: 'This Week', value: 'week' },
  { name: 'This Month', value: 'month' },
]

const languageNames: Record<string, string> = {
  'en': 'English',
  'zh-Hans': '中文 (简体)',
  'zh-Hant': '中文 (繁體)',
  'ja': '日本語',
  'ko': '한국어',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'pt': 'Português',
}

export function FilterBar({ channels, languages }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const languageOptions = [
    { name: 'All Languages', value: 'all' },
    ...languages.map(code => ({
      name: languageNames[code] || code,
      value: code
    }))
  ]

  const currentChannel = searchParams.get('channel') || 'all'
  const currentSort = searchParams.get('sort') || 'newest'
  const currentDate = searchParams.get('date') || 'all'
  const currentLang = searchParams.get('lang') || 'all'
  const currentSearch = searchParams.get('q') || ''

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('page')
    router.push(`/?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/')
  }

  const activeFiltersCount = [
    currentChannel !== 'all',
    currentDate !== 'all',
    currentLang !== 'all',
    currentSort !== 'newest'
  ].filter(Boolean).length

  return (
    <div className="z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:sticky sm:top-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput 
            defaultValue={currentSearch} 
            onChange={(val) => updateFilter('q', val)} 
          />
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </div>

          <Select
            value={currentChannel}
            onChange={(val) => updateFilter('channel', val)}
            options={[
              { name: 'All Channels', value: 'all' },
              ...channels.map(c => ({ name: c.channel_name, value: c.id }))
            ]}
            label="Channel"
          />

          <Select
            value={currentLang}
            onChange={(val) => updateFilter('lang', val)}
            options={languageOptions}
            label="Language"
          />

          <Select
            value={currentDate}
            onChange={(val) => updateFilter('date', val)}
            options={dateOptions}
            label="Date"
          />
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}

          <Select
            value={currentSort}
            onChange={(val) => updateFilter('sort', val)}
            options={sortOptions}
            label="Sort"
            align="right"
          />
        </div>
      </div>
    </div>
  )
}

function SearchInput({ defaultValue, onChange }: { defaultValue: string, onChange: (val: string) => void }) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== defaultValue) {
        onChange(value)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [value, onChange, defaultValue])

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  const handleClear = () => {
    setValue('')
    onChange('')
  }

  return (
    <div className="relative w-full sm:w-64">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="block w-full rounded-full border border-border bg-card py-1.5 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
        placeholder="Search articles..."
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function Select({ 
  value, 
  onChange, 
  options, 
  label,
  align = 'left' 
}: { 
  value: string
  onChange: (val: string) => void
  options: { name: string; value: string }[]
  label: string
  align?: 'left' | 'right'
}) {
  const selectedOption = options.find(o => o.value === value)

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
          <span className="text-muted-foreground">{label}:</span>
          <span className="truncate max-w-[100px]">{selectedOption?.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className={clsx(
            "absolute z-50 mt-1 max-h-60 w-48 overflow-auto rounded-lg bg-popover p-1 text-xs shadow-lg ring-1 ring-border focus:outline-none",
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          )}>
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                className={({ active, selected }) =>
                  clsx(
                    'relative cursor-pointer select-none rounded-md py-2 pl-8 pr-4',
                    active ? 'bg-secondary text-foreground' : 'text-muted-foreground',
                    selected && 'text-primary font-medium bg-primary/5'
                  )
                }
                value={option.value}
              >
                {({ selected }) => (
                  <>
                    <span className={clsx('block truncate', selected ? 'font-medium' : 'font-normal')}>
                      {option.name}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-primary">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}
