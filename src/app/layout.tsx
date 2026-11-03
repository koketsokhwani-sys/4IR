import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/ui";
export const metadata: Metadata = {
  title: {
    default: "4IR — Your Business Deserves a Website.",
    template: "%s | 4IR",
  },
  description:
    "Professional websites for South African entrepreneurs from R50 per month. No setup fees. Explore website, booking and online store packages.",
  applicationName: "4IR Digital Services",
  openGraph: {
    title: "4IR — Your Business Deserves a Website.",
    description:
      "Professional websites from just R50 per month. No setup fees. No complicated contracts.",
    locale: "en_ZA",
    type: "website",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-ZA">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
