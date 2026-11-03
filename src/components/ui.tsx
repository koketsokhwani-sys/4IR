import Link from "next/link";
import { ArrowUpRight, Check, ArrowRight, Globe2 } from "lucide-react";
import { plans, examples } from "@/lib/content";
export function PricingCards() {
  return (
    <div className="pricing-grid">
      {plans.map((p, i) => (
        <article className={`plan ${i === 1 ? "featured" : ""}`} key={p.id}>
          {i === 1 && (
            <span className="popular">THE GROWING BUSINESS PICK</span>
          )}
          <span className="plan-number">0{i + 1} /</span>
          <h3>{p.name}</h3>
          <p className="plan-desc">{p.description}</p>
          <p className="price">
            R{p.price}
            <span> / month</span>
          </p>
          <Link
            className={`button ${i === 1 ? "" : "button-outline"}`}
            href={`/get-started?plan=${p.id}`}
          >
            Choose {p.name}
            <ArrowUpRight size={16} />
          </Link>
          <ul>
            {p.features.map((f) => (
              <li key={f}>
                <Check size={15} />
                {f}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
export function SiteArt({
  theme,
  large = false,
}: {
  theme: string;
  large?: boolean;
}) {
  return (
    <div
      className={`site-art ${theme} ${large ? "large-art" : ""}`}
      aria-hidden="true"
    >
      {theme === "bloom" ? (
        <>
          <div className="mini-nav">
            <b>
              bloom<span> studio</span>
            </b>
            <span>Flowers, with feeling. ↗</span>
          </div>
          <div className="bloom-layout">
            <div>
              <span className="mini-eyebrow">YOUR NEIGHBOURHOOD FLORIST</span>
              <h3>
                A little wild.
                <br />A little
                <br />
                <em>wonderful.</em>
              </h3>
              <span className="mini-pill">Find your flowers ↗</span>
            </div>
            <div className="flower-scene">
              <div className="stem s1" />
              <div className="stem s2" />
              <div className="stem s3" />
              <div className="flower f1">✳</div>
              <div className="flower f2">✳</div>
              <div className="flower f3">✳</div>
              <div className="vase" />
            </div>
          </div>
          <div className="mini-bottom">
            MADE WITH LOVE. SENT WITH MEANING. <span>EST. 2026</span>
          </div>
        </>
      ) : theme === "coffee" ? (
        <>
          <div className="mini-nav">
            <b>THE DAILY GRIND.</b>
            <span>Menu / Find us</span>
          </div>
          <h3>
            Good coffee.
            <br />
            <em>Better company.</em>
          </h3>
          <div className="coffee-cup">
            <span>
              daily
              <br />
              grind.
            </span>
          </div>
          <span className="coffee-note">YOUR DAILY DOSE OF GOOD.</span>
        </>
      ) : (
        <>
          <div className="mini-nav">
            <b>studio form.</b>
            <span>Move with us ↗</span>
          </div>
          <h3>
            Make space
            <br />
            for <em>yourself.</em>
          </h3>
          <div className="form-arch">
            <div />
            <div />
            <div />
          </div>
          <span className="mini-pill">Find your flow ↗</span>
        </>
      )}
    </div>
  );
}
export function Portfolio() {
  return (
    <section id="our-work" className="section shell">
      <div className="section-top">
        <div>
          <p className="eyebrow">SMALL BUSINESSES. BIG POSSIBILITIES.</p>
          <h2>
            Your business could
            <br />
            look like this.
          </h2>
        </div>
        <p className="section-intro">
          Different businesses. The same attention to detail.
          <br />
          Explore a few illustrative website concepts.
        </p>
      </div>
      <div className="portfolio-grid">
        {examples.map((e) => (
          <Link
            href={`/examples/${e.slug}`}
            key={e.slug}
            className="portfolio-card"
          >
            <SiteArt theme={e.theme} />
            <div className="portfolio-caption">
              <div>
                <h3>{e.name}</h3>
                <p>
                  {e.type} · {e.plan}
                </p>
              </div>
              <span className="round-arrow">
                <ArrowUpRight size={20} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <p className="fine-print">
        Concept designs for fictional businesses, not client projects.
      </p>
    </section>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="shell footer-top">
        <Link href="/" className="brand" aria-label="4IR home">
          4<span>IR</span>
        </Link>
        <p>
          Small business.
          <br />
          Big online energy.
        </p>
        <div>
          <Link href="/pricing">
            Explore packages <ArrowUpRight size={14} />
          </Link>
          <Link href="/#faqs">
            Questions? Start here <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} 4IR Digital Services</span>
        <span>
          <Globe2 size={14} /> Built for South African businesses.
        </span>
        <span>All prices in ZAR · Domains charged separately</span>
      </div>
    </footer>
  );
}
export function BottomCTA() {
  return (
    <section className="shell cta-wrap">
      <div className="bottom-cta">
        <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
        <h2>
          You bring the business.
          <br />
          We bring it online.
        </h2>
        <Link href="/pricing" className="button button-light">
          Find your perfect package <ArrowRight size={18} />
        </Link>
        <p>From R50/month. Zero setup fees.</p>
        <span className="cta-star" aria-hidden="true">
          ✳
        </span>
      </div>
    </section>
  );
}
