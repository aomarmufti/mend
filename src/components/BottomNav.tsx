"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  LibraryIcon,
  CameraIcon,
  ProgressIcon,
} from "@/components/icons";

const tabs = [
  { href: "/today", label: "Today", Icon: HomeIcon },
  { href: "/library", label: "Library", Icon: LibraryIcon },
  { href: "/coach", label: "Coach", Icon: CameraIcon },
  { href: "/progress", label: "Progress", Icon: ProgressIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 border-t border-mist bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5"
            >
              <span className="relative">
                <Icon
                  className={`h-6 w-6 ${active ? "text-pine" : "text-ink/40"}`}
                />
              </span>
              <span
                className={`font-sans text-[11px] font-medium ${
                  active ? "text-pine" : "text-ink/40"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
