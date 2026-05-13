import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopNavbar } from "@/components/navigation/TopNavbar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.20),_transparent_32rem),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
      <div className="flex min-h-screen min-w-0">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
