import { createServer } from '@/lib/supabase-server'
import { Plus, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { AddChannelDialog } from '@/components/admin/AddChannelDialog'
import { ChannelTable } from '@/components/admin/ChannelTable'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isUserAdmin } from '@/lib/auth-utils'

export const revalidate = 60

export default async function AdminChannelsPage() {
  const supabase = await createServer()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isUserAdmin(user.email)) {
    redirect('/')
  }

  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .order('created_at', { ascending: false }) as { data: any[] | null, error: any }

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

  async function refreshChannels() {
    'use server'
    revalidatePath('/admin/channels')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Channel Management
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage YouTube channels and trigger video processing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <form action={refreshChannels}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </form>
          <AddChannelDialogClient
            onChannelAdded={async () => {
              'use server'
              revalidatePath('/admin/channels')
              revalidatePath('/channels')
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Channels</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {channels?.length || 0}
              </p>
            </div>
            <div className="rounded-full bg-secondary p-3">
              <span className="text-2xl">📺</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Channels</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {channels?.filter((c: any) => c.is_active).length || 0}
              </p>
            </div>
            <div className="rounded-full bg-green-500/10 p-3">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactive Channels</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {channels?.filter((c: any) => !c.is_active).length || 0}
              </p>
            </div>
            <div className="rounded-full bg-gray-500/10 p-3">
              <span className="text-2xl">⏸️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Channels Table */}
      <section>
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-bold text-foreground">All Channels</h2>
          <p className="text-sm text-muted-foreground">
            View and manage all tracked YouTube channels
          </p>
        </div>

        <ChannelTable
          channels={channels || []}
          onChannelsChange={async () => {
            'use server'
            revalidatePath('/admin/channels')
          }}
        />
      </section>
    </div>
  )
}

// Client component for the dialog
import { ClientOnly } from './client-components'

function AddChannelDialogClient({
  onChannelAdded,
}: {
  onChannelAdded: () => Promise<void>
}) {
  return (
    <ClientOnly onChannelAdded={onChannelAdded} />
  )
}
