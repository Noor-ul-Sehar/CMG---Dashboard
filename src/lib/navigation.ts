import type { ComponentType } from "react";
import {
  DashboardIcon,
  FileTextIcon,
  FolderCheckIcon,
  FolderIcon,
  FolderOpenIcon,
  HashIcon,
  InboxIcon,
  LayersIcon,
  PackageIcon,
  SearchIcon,
  SettingsIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const marketCase: NavItem = {
  href: "/market-cases/all-cases",
  label: "All Cases",
  icon: FolderIcon,
  match: (p) => p === "/market-cases/all-cases",
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/overview/dashboard",
        label: "Dashboard",
        icon: DashboardIcon,
        match: (p) => p === "/overview/dashboard",
      },
    ],
  },
  {
    title: "Market Cases",
    items: [
      marketCase,
      {
        href: "/market-cases/open-cases",
        label: "Open Cases",
        icon: FolderOpenIcon,
        match: (p) => p === "/market-cases/open-cases",
      },
      {
        href: "/market-cases/closed-cases",
        label: "Closed Cases",
        icon: FolderCheckIcon,
        match: (p) => p === "/market-cases/closed-cases",
      },
      {
        href: "/market-cases/close-1-cases",
        label: "Close 1 Cases",
        icon: FolderCheckIcon,
        match: (p) => p === "/market-cases/close-1-cases",
      },
      {
        href: "/market-cases/search-cases",
        label: "Search Cases",
        icon: SearchIcon,
        match: (p) => p === "/market-cases/search-cases",
      },
      {
        href: "/market-cases/import-data",
        label: "Import Data",
        icon: UploadIcon,
        match: (p) => p === "/market-cases/import-data",
      },
      {
        href: "/market-cases/reporting-export",
        label: "Reporting & Export",
        icon: FileTextIcon,
        match: (p) => p === "/market-cases/reporting-export",
      },
    ],
  },
  {
    title: "Unilever Cases",
    items: [
      {
        href: "/unilever/cases",
        label: "Unilever Cases",
        icon: PackageIcon,
        match: (p) => p === "/unilever/cases",
      },
    ],
  },
  {
    title: "Custom Recordals",
    items: [
      {
        href: "/custom-recordals/records",
        label: "Custom Recordals",
        icon: LayersIcon,
        match: (p) => p === "/custom-recordals/records",
      },
    ],
  },
  {
    title: "Reference",
    items: [
      {
        href: "/reference/cmg-reference-numbers",
        label: "CMG Reference Numbers",
        icon: HashIcon,
        match: (p) => p === "/reference/cmg-reference-numbers",
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/admin/teams",
        label: "Teams",
        icon: UsersIcon,
        match: (p) => p === "/admin/teams",
      },
      {
        href: "/admin/investigators",
        label: "Investigators",
        icon: UserIcon,
        match: (p) => p === "/admin/investigators",
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: UsersIcon,
        match: (p) => p === "/admin/users",
      },
      {
        href: "/admin/master-data",
        label: "Master Data",
        icon: InboxIcon,
        match: (p) => p === "/admin/master-data",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: SettingsIcon,
        match: (p) => p === "/admin/settings",
      },
    ],
  },
];

export const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  "/overview/dashboard": { title: "Dashboard", description: "Overview of all CMG cases" },
  "/market-cases/all-cases": { title: "All Cases", description: "Every case in the central database" },
  "/market-cases/open-cases": { title: "Open Cases", description: "Cases currently being worked on" },
  "/market-cases/closed-cases": { title: "Closed Cases", description: "Cases that have been closed" },
  "/market-cases/close-1-cases": { title: "Close 1 Cases", description: "Cases with a Close 1 status" },
  "/unilever/cases": {
    title: "Unilever Cases",
    description: "Independent Unilever case-management module",
  },
  "/unilever/new": {
    title: "New Unilever Case",
    description: "Create a new case in the Unilever module",
  },
  "/market-cases/search-cases": { title: "Search Cases", description: "Find cases across the central database" },
  "/market-cases/import-data": { title: "Import Data", description: "Import case data from Excel or CSV" },
  "/market-cases/reporting-export": { title: "Reporting & Export", description: "Build, preview and export case reports" },
  "/custom-recordals/records": {
    title: "Custom Recordals",
    description: "Independent recordal records — client ref #, CMG ref #, brand",
  },
  "/reference/cmg-reference-numbers": { title: "CMG Reference Numbers", description: "Reference numbers in use" },
  "/admin/teams": { title: "Teams", description: "Organizational reference data" },
  "/admin/investigators": { title: "Investigators", description: "Organizational reference data" },
  "/admin/master-data": { title: "Master Data", description: "Reference lists for cases" },
  "/admin/settings": { title: "Settings", description: "System configuration and preferences" },
};
