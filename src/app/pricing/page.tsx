import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PricingCards, BottomCTA } from "@/components/ui";
import { plans, type Plan } from "@/lib/content";
const comparisons: { label: string; included: (plan: Plan) => boolean }[] = [
  { label: "Mobile-friendly design", included: () => true },
  { label: "Hosting & SSL", included: () => true },
  { label: "Contact enquiry form", included: (p) => p.id !== "starter" },
  { label: "Appointment booking", included: (p) => p.booking },
  { label: "Product catalogue & cart", included: (p) => p.store },
];
export const metadata: Metadata = { title: "Website packages & pricing" };
export default function Pricing() {
  return (
    <main id="main">
      <div className="shell pricing-page">
        <div className="page-intro">
          <p className="eyebrow">A LITTLE INVESTMENT. A BIG OPPORTUNITY.</p>
          <h1>
            Big plans for
            <br />
            your small business.
          </h1>
          <p>
            Professional websites from R50 per month. No setup fees.
            <br />
            Domain registration is charged separately.
          </p>
        </div>
        <PricingCards />
        <p className="pricing-note">
          All prices in ZAR, billed monthly. Choose a package to see the
          details.
        </p>
        <section id="compare" className="compare-wrap">
          <h2>The details, side by side.</h2>
          <table className="comparison">
            <caption>
              Compare website package features. Domain registration is charged
              separately.
            </caption>
            <thead>
              <tr>
                <th scope="col">What’s included</th>
                {plans.map((p) => (
                  <th scope="col" key={p.id}>
                    {p.name}
                    <br />R{p.price}/month
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Best for</th>
                {plans.map((p) => (
                  <td key={p.id}>{p.audience}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Website pages</th>
                {plans.map((p) => (
                  <td key={p.id}>{p.pages}</td>
                ))}
              </tr>
              {comparisons.map(({ label, included }) => (
                <tr key={String(label)}>
                  <th scope="row">{String(label)}</th>
                  {plans.map((p) => (
                    <td key={p.id}>
                      {included(p) ? (
                        <>
                          <Check size={17} aria-hidden="true" />
                          <span className="sr-only">Included</span>
                        </>
                      ) : (
                        <>
                          <Minus size={17} aria-hidden="true" />
                          <span className="sr-only">Not included</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Setup fee</th>
                {plans.map((p) => (
                  <td key={p.id}>R0</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Domain registration</th>
                {plans.map((p) => (
                  <td key={p.id}>Charged separately</td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      </div>
      <BottomCTA />
    </main>
  );
}
