import Image from "next/image"
import { ArrowRight } from "lucide-react"

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <Image
            src="/images/phones-stack.jpg"
            alt="Multiple views of the Mention app showing real-time feed, sentiment charts, and notification settings"
            width={500}
            height={500}
            className="rounded-2xl"
          />
        </div>
        <div className="order-1 flex flex-col gap-6 md:order-2">
          <h2 className="font-serif text-4xl leading-tight text-foreground md:text-5xl text-balance">
            Set up tracking in seconds
          </h2>
          <p className="max-w-md leading-relaxed text-muted-foreground">
            Add your brand name, product, or any keyword. We scan Hacker News and Reddit around the clock so you never miss a conversation.
          </p>
          <a
            href="#"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started now <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-sm text-muted-foreground">
            Are you a startup?{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">
              Get the free plan forever
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
