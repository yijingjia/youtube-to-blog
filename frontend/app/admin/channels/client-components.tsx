"use client"

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddChannelDialog } from '@/components/admin/AddChannelDialog'
import { useRouter } from 'next/navigation'

export function ClientOnly({
  onChannelAdded,
}: {
  onChannelAdded: () => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleChannelAdded = async (channel: any) => {
    await onChannelAdded()
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Channel
      </button>

      <AddChannelDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onChannelAdded={handleChannelAdded}
      />
    </>
  )
}
