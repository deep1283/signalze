"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import Link from "next/link"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-2xl text-foreground">
          mention
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/dashboard" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
            Dashboard
          </Link>
          <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="#use-cases" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Use cases
          </Link>
          <Link href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            FAQ
          </Link>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/login" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start now
          </Link>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background px-6 pb-6 md:hidden">
          <div className="flex flex-col gap-4 pt-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Dashboard
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Pricing
            </Link>
            <Link href="#features" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              How it works
            </Link>
            <Link href="#use-cases" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Use cases
            </Link>
            <Link href="#faq" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>
              FAQ
            </Link>
            <hr className="border-border/50" />
            <Link href="/login" className="text-sm font-medium text-foreground">
              Log in
            </Link>
            <Link
              href="/login"
              className="inline-block rounded-full bg-primary px-5 py-2 text-center text-sm font-medium text-primary-foreground"
            >
              Start now
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
