"use client";

import { useEffect, useState } from "react";

export const Footer = () => {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="shrink-0 border-t border-[#dfe3e8] bg-white/80">
      <div className="mx-auto flex min-h-14 w-full max-w-[1280px] flex-col justify-center gap-1 px-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {currentYear} Eventrix</p>
        <a
          className="text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
          href="https://github.com/chingu-voyages/V63-tier3-team-35"
          target="_blank"
          rel="noopener noreferrer"
        >
          Team GitHub repository
        </a>
      </div>
    </footer>
  );
};
