export function Platforms() {
  return (
    <section className="px-6 py-20 md:py-32">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Monitor the platforms that matter
        </p>
        <h2 className="mx-auto mt-3 max-w-lg font-serif text-4xl leading-tight text-foreground md:text-5xl text-balance">
          Track mentions where your audience lives
        </h2>

        <div className="relative mx-auto mt-16 flex max-w-lg items-center justify-center">
          <div className="absolute h-72 w-72 rounded-full bg-gradient-to-b from-accent/30 to-secondary/60 blur-xl md:h-96 md:w-96" />

          <div className="relative grid grid-cols-3 gap-6 md:gap-10">
            <div className="flex items-center justify-center">
              <PlatformIcon label="Hacker News">
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-[#ff6600]" aria-hidden="true">
                  <path d="M0 0v24h24V0H0zm12.8 14.3V20h-1.6v-5.7L7 4h1.8l3.2 6.2L15.2 4H17l-4.2 10.3z" />
                </svg>
              </PlatformIcon>
            </div>
            <div className="flex items-center justify-center">
              <PlatformIcon label="Dev.to">
                <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                  <rect x="1" y="1" width="22" height="22" rx="4" fill="#0A0A0A" />
                  <path d="M7.6 9.4h1.4c1.5 0 2.4.9 2.4 2.6s-.9 2.6-2.4 2.6H7.6V9.4zm1.2 1.1v3h.3c.9 0 1.4-.5 1.4-1.5s-.5-1.5-1.4-1.5h-.3zm4.2-1.1h3.1v1.1h-1.9v1h1.8v1.1h-1.8v1h1.9v1.1H13V9.4zm4.1 0h1.3l1 3.2 1-3.2h1.3l-1.7 5.2h-1.2L17.1 9.4z" fill="#fff" />
                </svg>
              </PlatformIcon>
            </div>
            <div className="flex items-center justify-center">
              <PlatformIcon label="GitHub Discussions">
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-[#111827]" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.68.5 12.08c0 5.12 3.29 9.46 7.86 11 .57.1.78-.25.78-.56v-2.1c-3.2.7-3.88-1.56-3.88-1.56-.52-1.35-1.28-1.71-1.28-1.71-1.05-.73.08-.72.08-.72 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.7 1.27 3.36.97.1-.76.4-1.27.73-1.56-2.55-.29-5.24-1.29-5.24-5.74 0-1.27.45-2.3 1.18-3.12-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.16 1.19a10.87 10.87 0 0 1 5.76 0c2.2-1.5 3.16-1.19 3.16-1.19.62 1.59.23 2.77.11 3.06.73.82 1.18 1.85 1.18 3.12 0 4.46-2.7 5.44-5.27 5.73.41.36.78 1.06.78 2.15v3.19c0 .31.2.66.79.55A11.6 11.6 0 0 0 23.5 12.08C23.5 5.68 18.35.5 12 .5z" />
                </svg>
              </PlatformIcon>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="font-serif text-lg leading-snug text-card-foreground text-balance">
            Stay ahead of every conversation about your brand based on{" "}
            <span className="font-sans font-bold">real-time data</span> and{" "}
            <span className="font-sans font-bold">sentiment trends</span>
          </p>
          <a
            href="#"
            className="mt-4 inline-block rounded-full border border-border px-5 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-secondary"
          >
            Try it yourself
          </a>
        </div>
      </div>
    </section>
  )
}

function PlatformIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group flex flex-col items-center gap-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-md border border-border/50 transition-transform group-hover:scale-110">
        {children}
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
