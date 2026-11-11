"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../page.module.css";

const navigation = [
  { label: "Home", href: "/" },
  { label: "About Me", href: "/about-me" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blogs" },
  { label: "Contact", href: "/contact-me" },
];

export default function Navigation() {
  const pathname = usePathname();
  if (pathname === "/projects/creative-space" || pathname === "/projects/inspiration-board") return null;
  const active = pathname === "/contact-me-server-form" ? "/contact-me"
    : pathname?.startsWith("/projects/") ? "/projects"
    : pathname === "/admin/blogs" || pathname?.startsWith("/blogs/") ? "/blogs"
    : pathname;
  return <nav className={styles.navigation} aria-label="Main navigation">
    {navigation.map(({ label, href }) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
