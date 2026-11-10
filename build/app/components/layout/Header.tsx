"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const Header = () => {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 flex-row items-center justify-between sm:px-6 sm:py-6">
        <Link className="text-xl font-semibold text-zinc-950" href="/">
          Event Planner
        </Link>
        <nav aria-label="Main navigation" className="flex gap-2">
          <Link
            className={`rounded-md px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
              pathname === "/"
                ? "bg-zinc-900 font-medium text-white"
                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
            href="/"
          >
            Home
          </Link>
          <Link
            className={`rounded-md px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
              pathname === "/results" || pathname.startsWith("/results/")
                ? "bg-zinc-900 font-medium text-white"
                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
            }`}
            href="/results"
          >
            Results
          </Link>
        </nav>
      </div>
    </header>
  );
};
