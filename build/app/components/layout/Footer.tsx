"use client";

import { useEffect, useState } from "react";

export const Footer = () => {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-5 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {currentYear} Event Planner</p>
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
