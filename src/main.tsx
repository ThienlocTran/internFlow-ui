import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/routes/router";
import { queryClient } from "@/lib/query-client";
import { ServerWakeUpBanner } from "@/components/common/ServerWakeUpBanner";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ServerWakeUpBanner />
    </QueryClientProvider>
  </StrictMode>,
);
