"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const links = [
    ["How it works", "/#how-it-works"],
    ["Pricing", "/pricing"],
    ["Our work", "/#our-work"],
    ["FAQs", "/#faqs"],
  ];
  return (
    <header className="site-header">
      <div className="shell nav-row">
        <Link
          href="/"
          aria-label="4IR home"
          className="brand"
          onClick={() => setOpen(false)}
        >
          4<span>IR</span>
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              aria-current={
                path === "/pricing" && label === "Pricing" ? "page" : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link className="button button-small desktop-cta" href="/pricing">
          Let’s get you online <ArrowUpRight size={16} />
        </Link>
        <button
          className="menu-button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="mobile-nav"
        >
          {links.map(([label, href]) => (
            <Link key={label} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/pricing" onClick={() => setOpen(false)}>
            Let’s get you online ↗
          </Link>
        </nav>
      )}
    </header>
  );
}
