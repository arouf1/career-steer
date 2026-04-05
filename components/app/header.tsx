"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ShipWheel } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-border transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
      </div>
      <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 pointer-events-auto"
        >
          <ShipWheel className="size-5 text-foreground" />
          <Logo />
        </Link>
      </div>
      <div className="ml-auto px-4">
        <UserButton />
      </div>
    </header>
  );
}
