"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../page.module.css";

const navigation = [
  { label: "Home", href: "/" },
  { label: "About Me", href: "/about-me" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact-me-server-form" },
];

export default function Navigation() {
  const pathname = usePathname();
  if (pathname === "/projects/creative-space" || pathname === "/projects/inspiration-board") return null;
  const active = pathname === "/contact-me" ? "/contact-me-server-form"
    : pathname?.startsWith("/projects/") ? "/projects" : pathname;
  return <nav className={styles.navigation} aria-label="Main navigation">
    {navigation.map(({ label, href }) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
