"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export const Header = () => {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isResults = pathname === "/results";

  return (
    <header className="shrink-0 border-b border-border bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <Link
          className="font-heading text-base font-black tracking-tight text-foreground"
          href="/"
        >
          Eventrix
        </Link>
        <nav aria-label="Main navigation" className="flex gap-2">
          <Link
            aria-current={isHome ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              isHome
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href="/"
          >
            Home
          </Link>
          <Link
            aria-current={isResults ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              isResults
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href="/results"
          >
            Results
          </Link>
        </nav>
      </div>
    </header>
  );
};
