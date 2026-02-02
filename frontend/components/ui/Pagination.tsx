import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface PaginationProps {
  page: number
  hasMore: boolean
  baseUrl: string
  searchParams: Record<string, string | undefined>
  totalCount?: number
  pageSize?: number
}

export function Pagination({ page, hasMore, baseUrl, searchParams, totalCount, pageSize }: PaginationProps) {
  const createPageUrl = (newPage: number) => {
    // Filter out undefined values before creating URLSearchParams
    const filteredParams: Record<string, string> = {}
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        filteredParams[key] = value
      }
    }
    const params = new URLSearchParams(filteredParams)
    params.set('page', newPage.toString())
    return `${baseUrl}?${params.toString()}`
  }

  const totalPages = totalCount && pageSize ? Math.ceil(totalCount / pageSize) : null

  return (
    <div className="flex items-center justify-center gap-4 py-8">
      <Link
        href={createPageUrl(page - 1)}
        className={clsx(
          "flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors",
          page <= 1
            ? "pointer-events-none opacity-50 text-muted-foreground"
            : "hover:border-primary hover:text-primary text-foreground"
        )}
        aria-disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Link>

      <span className="text-sm font-medium text-muted-foreground">
        Page {page} {totalPages ? `of ${totalPages}` : ''}
      </span>

      <Link
        href={createPageUrl(page + 1)}
        className={clsx(
          "flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors",
          !hasMore
            ? "pointer-events-none opacity-50 text-muted-foreground"
            : "hover:border-primary hover:text-primary text-foreground"
        )}
        aria-disabled={!hasMore}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
