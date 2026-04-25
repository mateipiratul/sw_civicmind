import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// create a new router instance
export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

// register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
