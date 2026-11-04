import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MousePointer2,
  Sparkles,
  ShieldCheck,
  Smartphone,
  HeartHandshake,
} from "lucide-react";
import { PricingCards, Portfolio, SiteArt, BottomCTA } from "@/components/ui";
import { faqs } from "@/lib/content";
export default function Home() {
  return (
    <main id="main">
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> FOR THE BUSINESSES BUILDING SOUTH
            AFRICA
          </p>
          <h1>
            Your Business
            <br />
            Deserves a<br />
            <span>Website.</span>
            <span className="hero-spark" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p className="hero-description">
            Professional websites from just R50 per month.
            <br className="desktop-break" /> No setup fees. No complicated
            contracts.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/pricing">
              Find your package <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="#our-work">
              See what’s possible <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-points">
            <span>
              <Check size={14} />
              Made for mobile
            </span>
            <span>
              <Check size={14} />
              Hosting included
            </span>
            <span>
              <Check size={14} />
              Made for you
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-orbit" />
          <div className="browser-preview">
            <div className="browser-bar">
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>
                <ShieldCheck size={10} /> your-business.co.za
              </span>
              <ArrowUpRight size={12} />
            </div>
            <SiteArt theme="bloom" large />
          </div>
          <div className="floating-price">
            <span>A BIG STEP, A SMALL PRICE.</span>
            <strong>
              R50<span>/month</span>
            </strong>
            <span>Yes, really. No setup fee.</span>
          </div>
          <div className="floating-live">
            <span className="status-dot" /> Your next chapter is online.
          </div>
          <div className="cursor-label">
            <MousePointer2 size={22} fill="currentColor" />
            <span>Your business, but online</span>
          </div>
        </div>
      </section>
      <div className="benefit-strip">
        <div className="shell">
          <span>
            <Sparkles size={18} /> Big ambition. Small monthly price.
          </span>
          <span>
            <Smartphone size={18} /> Beautiful on every screen.
          </span>
          <span>
            <ShieldCheck size={18} /> Hosting & SSL included.
          </span>
          <span>
            <HeartHandshake size={18} /> Built around your business.
          </span>
        </div>
      </div>
      <section id="how-it-works" className="section shell how-section">
        <div>
          <p className="eyebrow">FROM “ONE DAY” TO ONLINE</p>
          <h2>
            A proper website.
            <br />
            Without the headache.
          </h2>
          <p className="section-intro">
            You’ve got a business to run. We make the website part simple.
          </p>
          <Link className="text-link" href="/pricing">
            Let’s make it happen <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "Pick your perfect fit",
              "A simple presence, a place to take bookings, or your very own online shop. Choose what your business needs.",
            ],
            [
              "02",
              "Make it yours",
              "Share your story, photos and business details. We turn them into a website that feels like you.",
            ],
            [
              "03",
              "Give it the green light",
              "Preview your website, share feedback and approve the design. Then get ready to share your new home online.",
            ],
          ].map(([n, title, desc]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
              <ArrowUpRight size={19} />
            </div>
          ))}
        </div>
      </section>
      <section className="pricing-section" id="pricing">
        <div className="shell">
          <div className="section-top">
            <div>
              <p className="eyebrow">LESS OVERHEAD. MORE OPPORTUNITY.</p>
              <h2>
                A package for
                <br />
                your next big step.
              </h2>
            </div>
            <div>
              <p className="section-intro">
                One predictable monthly price.
                <br />
                No setup fees. Domain registration charged separately.
              </p>
              <Link className="text-link" href="/pricing#compare">
                Compare every feature <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <PricingCards />
          <p className="pricing-note">
            Monthly pricing in South African rand.{" "}
            <strong>No setup fees.</strong> Domain registration is charged
            separately.
          </p>
        </div>
      </section>
      <Portfolio />
      <section className="faq-section section shell" id="faqs">
        <div>
          <p className="eyebrow">A LITTLE MORE CLARITY</p>
          <h2>
            Good questions.
            <br />
            Straight answers.
          </h2>
          <p className="section-intro">
            Your business is a big deal.
            <br />
            You should know what you’re getting.
          </p>
        </div>
        <div className="faq-list">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <BottomCTA />
    </main>
  );
}
