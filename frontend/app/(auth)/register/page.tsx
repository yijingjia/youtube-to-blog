import { AuthForm } from '@/components/auth/AuthForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <>
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-serif font-bold text-foreground hover:text-primary transition-colors">
          <span className="text-3xl">📚</span>
          YouTube to Blog
        </Link>
      </div>

      <AuthForm mode="register" />

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          ← Back to home
        </Link>
      </div>
    </>
  )
}
