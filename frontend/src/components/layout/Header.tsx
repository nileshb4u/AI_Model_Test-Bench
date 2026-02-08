import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Play, Box, FlaskConical, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { statsApi } from "@/api";
import type { AppStats } from "@/types";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/models": "Models",
  "/tests": "Test Suites",
  "/run": "Run Test",
  "/results": "Results",
  "/compare": "Compare Models",
  "/prompts": "System Prompts",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  if (pathname.startsWith("/models/")) return "Model Details";
  if (pathname.startsWith("/tests/")) return "Test Suite Details";
  if (pathname.startsWith("/run/")) return "Test Execution";
  return "AI Model Test Bench";
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AppStats | null>(null);

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => {});
  }, [location.pathname]);

  const title = getPageTitle(location.pathname);

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-between px-6">
      <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>

      <div className="flex items-center gap-4">
        {stats && (
          <div className="hidden md:flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" />
              <span>{stats.models} models</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{stats.suites} suites</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{stats.runs} runs</span>
            </div>
          </div>
        )}
        <Button
          variant="primary"
          size="sm"
          icon={<Play className="w-4 h-4" />}
          onClick={() => navigate("/run")}
        >
          New Test
        </Button>
      </div>
    </header>
  );
}
