// components/NavItem.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { href: string; className?: string; exact?: boolean; children: React.ReactNode };

export function NavItem({ href, className, exact = false, children }: Props) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}