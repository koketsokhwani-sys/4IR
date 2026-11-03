import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Check } from "lucide-react";
import { plans } from "@/lib/content";
export const metadata: Metadata = {
  title: "Choose your website package",
  robots: { index: false, follow: true },
};
export default async function GetStarted({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const query = await searchParams;
  const selected = plans.find((p) => p.id === query.plan);
  return (
    <main id="main" className="selection-wrap">
      <Link href="/pricing" className="text-link">
        <ArrowLeft size={16} /> Back to packages
      </Link>
      <p className="eyebrow" style={{ marginTop: 35 }}>
        YOUR BUSINESS. YOUR NEXT STEP.
      </p>
      <h1>
        {selected
          ? "A good fit for your next chapter."
          : "Find your starting point."}
      </h1>
      <p>Select a package to explore what’s included.</p>
      <nav aria-label="Choose a package" className="selection-links">
        {plans.map((p) => (
          <Link
            href={`/get-started?plan=${p.id}`}
            aria-current={selected?.id === p.id ? "page" : undefined}
            key={p.id}
          >
            {p.name}
          </Link>
        ))}
      </nav>
      {selected && (
        <section className="selection-panel">
          <p className="eyebrow">YOUR SELECTED PACKAGE</p>
          <h2>{selected.name}</h2>
          <p>{selected.audience}</p>
          <p className="price">
            R{selected.price}
            <span> / month</span>
          </p>
          <ul className="list-none p-0">
            {selected.features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check size={17} />
                {f}
              </li>
            ))}
          </ul>
          <p className="text-xs mt-6">
            No setup fee. Domain registration charged separately.
          </p>
        </section>
      )}
      <div className="phase-notice">
        <strong>Registration isn’t open just yet.</strong>
        <br />
        Explore packages and website concepts now. Account creation and subscription
        checkout will be available in a future release. No payment will be taken.
      </div>
      <p className="text-sm leading-7">
        When registration opens, you’ll provide your name, email, mobile number
        and business details. After email verification, payment and onboarding,
        you’ll review your website before approving it for launch.
      </p>
      <Link className="text-link" href="/#our-work">
        Explore website concepts ↗
      </Link>
    </main>
  );
}
