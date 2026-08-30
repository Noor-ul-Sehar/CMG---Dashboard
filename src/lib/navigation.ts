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
  href: "/cases",
  label: "All Cases",
  icon: FolderIcon,
  match: (p) => p === "/cases",
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: DashboardIcon,
        match: (p) => p === "/dashboard",
      },
    ],
  },
  {
    title: "Market Cases",
    items: [
      marketCase,
      {
        href: "/cases/open",
        label: "Open Cases",
        icon: FolderOpenIcon,
        match: (p) => p === "/cases/open",
      },
      {
        href: "/cases/closed",
        label: "Closed Cases",
        icon: FolderCheckIcon,
        match: (p) => p === "/cases/closed",
      },
      {
        href: "/cases/close-1",
        label: "Close 1 Cases",
        icon: FolderCheckIcon,
        match: (p) => p === "/cases/close-1",
      },
      {
        href: "/search",
        label: "Search Cases",
        icon: SearchIcon,
        match: (p) => p === "/search",
      },
      {
        href: "/import",
        label: "Import Data",
        icon: UploadIcon,
        match: (p) => p === "/import",
      },
      {
        href: "/reports",
        label: "Reporting & Export",
        icon: FileTextIcon,
        match: (p) => p === "/reports",
      },
    ],
  },
  {
    title: "Unilever Cases",
    items: [
      {
        href: "/unilever",
        label: "Unilever Cases",
        icon: PackageIcon,
        match: (p) => p === "/unilever",
      },
    ],
  },
  {
    title: "Custom Recordals",
    items: [
      {
        href: "/custom-recordals",
        label: "Custom Recordals",
        icon: LayersIcon,
        match: (p) => p === "/custom-recordals",
      },
    ],
  },
  {
    title: "Reference",
    items: [
      {
        href: "/cmg-references",
        label: "CMG Reference Numbers",
        icon: HashIcon,
        match: (p) => p === "/cmg-references",
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/teams",
        label: "Teams",
        icon: UsersIcon,
        match: (p) => p === "/teams",
      },
      {
        href: "/investigators",
        label: "Investigators",
        icon: UserIcon,
        match: (p) => p === "/investigators",
      },
      {
        href: "/users",
        label: "Users",
        icon: UsersIcon,
        match: (p) => p === "/users",
      },
      {
        href: "/reference-data",
        label: "Master Data",
        icon: InboxIcon,
        match: (p) => p === "/reference-data",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: SettingsIcon,
        match: (p) => p === "/settings",
      },
    ],
  },
];

export const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview of all CMG cases" },
  "/cases": { title: "All Cases", description: "Every case in the central database" },
  "/cases/open": { title: "Open Cases", description: "Cases currently being worked on" },
  "/cases/closed": { title: "Closed Cases", description: "Cases that have been closed" },
  "/cases/close-1": { title: "Close 1 Cases", description: "Cases with a Close 1 status" },
  "/unilever": {
    title: "Unilever Cases",
    description: "Independent Unilever case-management module",
  },
  "/unilever/new": {
    title: "New Unilever Case",
    description: "Create a new case in the Unilever module",
  },
  "/search": { title: "Search Cases", description: "Find cases across the central database" },
  "/import": { title: "Import Data", description: "Import case data from Excel or CSV" },
  "/reports": { title: "Reporting & Export", description: "Build, preview and export case reports" },
  "/custom-recordals": {
    title: "Custom Recordals",
    description: "Independent recordal records — client ref #, CMG ref #, brand",
  },
  "/cmg-references": { title: "CMG Reference Numbers", description: "Reference numbers in use" },
  "/teams": { title: "Teams", description: "Organizational reference data" },
  "/investigators": { title: "Investigators", description: "Organizational reference data" },
  "/reference-data": { title: "Master Data", description: "Reference lists for cases" },
  "/settings": { title: "Settings", description: "System configuration and preferences" },
};