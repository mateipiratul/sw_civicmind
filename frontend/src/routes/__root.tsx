import { createRootRoute } from "@tanstack/react-router";
import { RootErrorComponent, NotFoundComponent, RootComponent } from "@/components/layout/root-elements";

export const Route = createRootRoute({
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFoundComponent,
  component: RootComponent,
});
