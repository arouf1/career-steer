"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import {
  LayoutDashboard,
  Compass,
  Settings,
  Route,
  Play,
  Trash2,
  MoreHorizontal,
  ChevronsUpDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { JOURNEY_LANES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import type { Id } from "@/convex/_generated/dataModel";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/diagnostic", label: "Diagnostic", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavMain() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavJourneys({
  onDeleteRequest,
}: {
  onDeleteRequest: (id: Id<"journeys">) => void;
}) {
  const journeys = useSuspenseQuery(api.journeys.getAllByUser);
  const resumeJourney = useMutation(api.journeys.resume);
  const { isMobile } = useSidebar();

  if (journeys.length === 0) return null;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>
        <Route className="mr-1.5 h-3.5 w-3.5" />
        Journeys
      </SidebarGroupLabel>
      <SidebarMenu>
        {journeys.map((journey) => {
          const lane =
            JOURNEY_LANES[journey.lane as keyof typeof JOURNEY_LANES];
          const isActiveJourney = journey.status === "active";
          return (
            <SidebarMenuItem key={journey._id}>
              <SidebarMenuButton asChild>
                <Link
                  href={`/journey/${journey._id}/roadmap`}
                  className="h-auto items-start py-1.5"
                >
                  <div
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: lane.colour }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="truncate leading-tight">
                      {journey.targetRole ?? lane.label}
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge
                        variant={isActiveJourney ? "default" : "secondary"}
                        className={cn(
                          "px-1.5 py-0 text-[10px]",
                          journey.status === "completed" &&
                            "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                          journey.status === "paused" &&
                            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                        )}
                      >
                        {journey.status}
                      </Badge>
                      {journey.stepsTotal > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {journey.stepsCompleted}/{journey.stepsTotal}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-44 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  {!isActiveJourney && (
                    <>
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() =>
                            resumeJourney({ journeyId: journey._id })
                          }
                        >
                          <Play className="text-muted-foreground" />
                          <span>Resume</span>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => onDeleteRequest(journey._id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavUser() {
  const { user } = useUser();
  const { isMobile } = useSidebar();

  if (!user) return null;

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n?.[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.imageUrl} alt={user.fullName ?? ""} />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.fullName ?? "User"}
                </span>
                <span className="truncate text-xs">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="text-muted-foreground" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const removeJourney = useMutation(api.journeys.remove);
  const [deleteTarget, setDeleteTarget] = useState<Id<"journeys"> | null>(
    null,
  );

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader />
        <SidebarContent>
          <NavMain />
          <Suspense fallback={null}>
            <NavJourneys onDeleteRequest={setDeleteTarget} />
          </Suspense>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete journey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this journey and all its data
              including your roadmap, steps, conversations, and progress logs.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) {
                  await removeJourney({ journeyId: deleteTarget });
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
