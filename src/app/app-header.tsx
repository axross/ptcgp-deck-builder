"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./app-header.module.css";

const navLinks = [
  { href: "/cards", label: "Cards" },
  { href: "/decks", label: "Decks" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The app shell header: the brand and top-level navigation shared across every
 * route (rendered by the root layout). A client component only so the active
 * route can be marked with `aria-current`; the links themselves are plain
 * navigation.
 */
export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header} data-testid="app-header">
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" data-testid="app-header-brand">
          PTCGP Deck Builder
        </Link>
        <nav className={styles.nav} aria-label="Primary">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                className={styles.navLink}
                href={link.href}
                data-testid={`app-header-nav-${link.label.toLowerCase()}`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
