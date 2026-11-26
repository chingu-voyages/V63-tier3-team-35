"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { useState } from "react";

import { Menu, X } from "lucide-react";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Header = () => {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isResults = pathname === "/results";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = (isActive: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-primary font-medium text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <header className="shrink-0 border-b border-border bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-2 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-xl font-black tracking-tight text-foreground"
        >
          <Image
            src="/logo_mobile.svg"
            alt="Eventrix"
            width={160}
            height={40}
            className="sm:hidden"
          />
          <Image
            src="/logo_desktop.svg"
            alt="Eventrix"
            width={191}
            height={48}
            className="hidden sm:block"
          />
        </Link>
        <nav aria-label="Main navigation" className="hidden gap-2 sm:flex">
          <Link
            aria-current={isHome ? "page" : undefined}
            className={navLinkClass(isHome)}
            href="/"
          >
            Home
          </Link>
          <Link
            aria-current={isResults ? "page" : undefined}
            className={navLinkClass(isResults)}
            href="/results"
          >
            Results
          </Link>
        </nav>
        <MenuPrimitive.Root
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
        >
          <MenuPrimitive.Trigger
            className={buttonVariants({
              variant: "outline",
              size: "icon",
              className: "sm:hidden",
            })}
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
          >
            {mobileMenuOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </MenuPrimitive.Trigger>
          <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
              side="bottom"
              align="end"
              sideOffset={8}
              className="z-50"
            >
              <MenuPrimitive.Popup className="min-w-20 p-3 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                <MenuPrimitive.LinkItem
                  render={<Link href="/" />}
                  aria-current={isHome ? "page" : undefined}
                  className={navLinkClass(isHome)}
                  closeOnClick
                >
                  Home
                </MenuPrimitive.LinkItem>
                <MenuPrimitive.LinkItem
                  render={<Link href="/results" />}
                  aria-current={isResults ? "page" : undefined}
                  className={navLinkClass(isResults)}
                  closeOnClick
                >
                  Results
                </MenuPrimitive.LinkItem>
              </MenuPrimitive.Popup>
            </MenuPrimitive.Positioner>
          </MenuPrimitive.Portal>
        </MenuPrimitive.Root>
      </div>
    </header>
  );
};
