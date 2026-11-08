import type { Metadata } from "next";
import "./portal.css";
export const metadata: Metadata = {
  title: "4IR customer preview",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        <header>
          <a href="/" className="brand">
            4IR
          </a>
          <span>Customer preview</span>
        </header>
        {children}
        <footer>
          4IR Digital Services · Payments and public registration remain closed.
        </footer>
      </body>
    </html>
  );
}
