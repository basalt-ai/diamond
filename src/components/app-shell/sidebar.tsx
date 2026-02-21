"use client";

import {
  DatabaseIcon,
  DownloadIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  PlayIcon,
  TagIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Scenarios",
    href: "/scenarios",
    icon: NetworkIcon,
    children: [
      { title: "Types", href: "/scenarios" },
      { title: "Graph", href: "/scenarios/graph" },
      { title: "Failure Modes", href: "/scenarios/failure-modes" },
      { title: "Risk Tiers", href: "/scenarios/risk-tiers" },
      { title: "Context Profiles", href: "/scenarios/context-profiles" },
    ],
  },
  {
    title: "Episodes",
    href: "/episodes",
    icon: PlayIcon,
  },
  {
    title: "Candidates",
    href: "/candidates",
    icon: UsersIcon,
  },
  {
    title: "Labeling",
    href: "/labeling",
    icon: TagIcon,
    children: [
      { title: "Task Queue", href: "/labeling" },
      { title: "Metrics", href: "/labeling/metrics" },
    ],
  },
  {
    title: "Datasets",
    href: "/datasets",
    icon: DatabaseIcon,
    children: [
      { title: "Suites", href: "/datasets" },
      { title: "Eval Results", href: "/datasets/eval-results" },
    ],
  },
  {
    title: "Imports",
    href: "/bulk-sources",
    icon: UploadIcon,
  },
  {
    title: "Exports",
    href: "/exports",
    icon: DownloadIcon,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function isSubActive(href: string, parent: NavItem): boolean {
    // For sub-items that share href with parent (e.g. /scenarios and "Types"),
    // only mark active if pathname matches exactly or no other child matches
    if (href === parent.href) {
      const otherChildren =
        parent.children?.filter((c) => c.href !== parent.href) ?? [];
      const otherMatch = otherChildren.some(
        (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
      );
      if (otherMatch) return false;
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-sm font-bold">Diamond Engine</span>
          <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium">
            v1.5
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.children && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubActive(child.href, item)}
                          >
                            <Link href={child.href}>
                              <span>{child.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
