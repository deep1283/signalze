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
          {/* Gradient circle background */}
          <div className="absolute h-72 w-72 rounded-full bg-gradient-to-b from-accent/30 to-secondary/60 blur-xl md:h-96 md:w-96" />

          <div className="relative grid grid-cols-3 gap-6 md:gap-10">
            {/* Row 1 */}
            <div className="flex items-center justify-center">
              <PlatformIcon label="Hacker News">
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-[#ff6600]" aria-hidden="true">
                  <path d="M0 0v24h24V0H0zm12.8 14.3V20h-1.6v-5.7L7 4h1.8l3.2 6.2L15.2 4H17l-4.2 10.3z" />
                </svg>
              </PlatformIcon>
            </div>
            <div className="flex items-center justify-center">
              <PlatformIcon label="Reddit">
                <svg viewBox="0 0 256 256" className="h-7 w-7" aria-hidden="true">
                  <circle cx="128" cy="128" r="128" fill="#FF4500"/>
                  <path d="M213.15 129.22c0-10.376-8.391-18.768-18.768-18.768a18.59 18.59 0 0 0-12.992 5.291c-12.813-9.263-30.563-15.263-50.393-15.958l8.576-40.354 27.933 5.948c.315 7.075 6.15 12.73 13.306 12.73 7.361 0 13.306-5.976 13.306-13.306S188.193 51.5 180.832 51.5c-5.198 0-9.668 2.976-11.862 7.31l-31.24-6.654c-1.672-.354-3.343.68-3.736 2.352l-9.556 45.01c-20.282.465-38.394 6.483-51.515 15.87a18.59 18.59 0 0 0-12.992-5.291c-10.377 0-18.768 8.392-18.768 18.768 0 7.687 4.626 14.28 11.244 17.168-.316 2.169-.473 4.395-.473 6.654 0 33.882 39.438 61.376 88.066 61.376s88.066-27.494 88.066-61.376c0-2.26-.157-4.485-.473-6.654 6.618-2.888 11.244-9.481 11.244-17.168zM85.272 142.495c0-7.361 5.976-13.306 13.306-13.306s13.306 5.976 13.306 13.306c0 7.33-5.976 13.306-13.306 13.306s-13.306-5.976-13.306-13.306zm74.942 35.427c-9.157 9.157-26.632 9.893-32.214 9.893-5.582 0-23.057-.736-32.214-9.893-1.357-1.357-1.357-3.555 0-4.912 1.357-1.357 3.555-1.357 4.912 0 5.693 5.693 17.856 7.726 27.302 7.726s21.609-2.033 27.302-7.726c1.357-1.357 3.555-1.357 4.912 0 1.357 1.357 1.357 3.555 0 4.912zm-2.396-22.12c-7.33 0-13.306-5.977-13.306-13.307s5.976-13.306 13.306-13.306 13.306 5.976 13.306 13.306-5.976 13.306-13.306 13.306z" fill="#FFF"/>
                </svg>
              </PlatformIcon>
            </div>
            <div className="flex items-center justify-center">
              <ComingSoonIcon label="Twitter / X" />
            </div>

            {/* Row 2 */}
            <div className="col-start-1 flex items-center justify-center">
              <ComingSoonIcon label="Product Hunt" />
            </div>
            <div className="flex items-center justify-center">
              <ComingSoonIcon label="GitHub" />
            </div>
            <div className="flex items-center justify-center">
              <ComingSoonIcon label="Dev.to" />
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

function ComingSoonIcon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 opacity-50">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card shadow-md border border-border/50">
        <span className="text-[10px] font-medium text-muted-foreground">Soon</span>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
