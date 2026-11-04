import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { examples, plans } from "@/lib/content";
import { SiteArt } from "@/components/ui";
export function generateStaticParams() {
  return examples.map((e) => ({ slug: e.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const example = examples.find((e) => e.slug === slug);
  return {
    title: example ? `${example.name} — Website concept` : "Example not found",
  };
}
export default async function Example({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = examples.find((e) => e.slug === slug);
  if (!e) notFound();
  const plan = plans.find((p) => p.name === e.plan)!;
  return (
    <main id="main" className="shell example-page">
      <Link className="text-link" href="/#our-work">
        <ArrowLeft size={16} /> All website concepts
      </Link>
      <h1>{e.name}</h1>
      <p className="eyebrow">
        {e.type.toUpperCase()} / {e.plan.toUpperCase()}
      </p>
      <p>{e.description}</p>
      <SiteArt theme={e.theme} large />
      <div className="phase-notice">
        An illustrative design for a fictional business. This is a visual
        concept, not a live client website or a working booking or shopping
        service.
      </div>
      <p>
        Want a website with this kind of personality? Explore the {e.plan}{" "}
        package from R{plan.price} per month. Domain registration charged
        separately.
      </p>
      <Link className="button" href={`/get-started?plan=${plan.id}`}>
        Explore {e.plan}
        <ArrowUpRight size={17} />
      </Link>
    </main>
  );
}
