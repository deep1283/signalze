import { Bell, BarChart3, Zap, Globe, Shield, Smartphone } from "lucide-react"

const features = [
  {
    icon: Bell,
    title: "Instant alerts",
    description: "Get notified via email, Slack, or webhook the moment your brand is mentioned.",
  },
  {
    icon: BarChart3,
    title: "Sentiment analysis",
    description: "Understand the tone of every mention with AI-powered sentiment scoring.",
  },
  {
    icon: Zap,
    title: "Real-time tracking",
    description: "Mentions are captured within minutes of being posted on HN or Reddit.",
  },
  {
    icon: Globe,
    title: "Keyword monitoring",
    description: "Track your brand, competitors, or any keyword across multiple subreddits.",
  },
  {
    icon: Shield,
    title: "Competitor tracking",
    description: "Keep tabs on what people say about your competitors too.",
  },
  {
    icon: Smartphone,
    title: "Mobile-ready dashboard",
    description: "Check your mentions from anywhere with a fully responsive dashboard.",
  },
]

export function Features() {
  return (
    <section id="features" className="px-6 py-20 md:py-32">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Features
        </p>
        <h2 className="mx-auto mt-3 max-w-lg text-center font-serif text-4xl leading-tight text-foreground md:text-5xl text-balance">
          Simple, yet with all the tools you need
        </h2>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
