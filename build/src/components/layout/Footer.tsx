"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export const Footer = () => {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="shrink-0 border-t border-border bg-background/80">
      <div className="mx-auto flex min-h-14 w-full max-w-[1280px] flex-col justify-center gap-1 px-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Eventrix" width={24} height={24} />
          <p>© {currentYear} Eventrix</p>
        </div>
        <a
          className="text-foreground underline decoration-border underline-offset-4 hover:text-primary"
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
