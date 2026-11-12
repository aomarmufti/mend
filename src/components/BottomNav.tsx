"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, LibraryIcon, ProgressIcon } from "@/components/icons";

const tabs = [
  { href: "/today", label: "Today", Icon: HomeIcon },
  { href: "/plan", label: "Plan", Icon: LibraryIcon },
  { href: "/progress", label: "Progress", Icon: ProgressIcon },
];

/** Floating pill tab bar. Three tabs: Today, Plan, Progress. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto flex w-full max-w-sm items-stretch gap-1 rounded-full border border-white/70 bg-white/85 p-1.5 shadow-[0_8px_30px_rgba(30,42,50,0.12)] backdrop-blur">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 font-sans text-[13px] font-semibold transition ${
                active
                  ? "bg-success-soft text-success"
                  : "text-ink/50 hover:text-ink/80"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
