"use client"
import Link from 'next/link'
import { clsx } from 'clsx'
import { usePathname } from 'next/navigation'
import { UserMenu } from './UserMenu'
import { motion } from 'framer-motion'

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-serif font-bold tracking-tight text-primary group-hover:opacity-90 transition-opacity">
              YouTube2Blog
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {[
              ['Home', '/'],
              ['Channels', '/channels'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "relative py-1 transition-colors hover:text-foreground/80",
                  pathname === href ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
                {pathname === href && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
