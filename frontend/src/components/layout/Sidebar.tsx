import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Box,
  FlaskConical,
  Play,
  BarChart3,
  GitCompare,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/models", icon: Box, label: "Models" },
  { to: "/tests", icon: FlaskConical, label: "Test Suites" },
  { to: "/run", icon: Play, label: "Run Test" },
  { to: "/results", icon: BarChart3, label: "Results" },
  { to: "/compare", icon: GitCompare, label: "Compare" },
  { to: "/prompts", icon: MessageSquare, label: "Prompts" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-screen bg-zinc-900 border-r border-zinc-800 z-40 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={clsx(
          "flex items-center h-16 px-4 border-b border-zinc-800",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-zinc-100 truncate">
              AI Model Test Bench
            </h1>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive(item.to)
                ? "bg-primary-600/15 text-primary-400 border border-primary-500/20"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                isActive(item.to) ? "text-primary-400" : "text-zinc-500"
              )}
            />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
