import { QueryClient } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  context: { queryClient },
  basepath: import.meta.env.BASE_URL.replace(/\/$/, ""),
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const mount = document.getElementById("root");

if (!mount) {
  throw new Error('Missing application mount element "#root".');
}

createRoot(mount).render(<RouterProvider router={router} />);
