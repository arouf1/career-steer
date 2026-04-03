"use client";

import { UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-end border-b border-border px-6">
      <UserButton />
    </header>
  );
}
