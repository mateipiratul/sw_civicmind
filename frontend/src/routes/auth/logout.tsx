import { createFileRoute } from "@tanstack/react-router";
import { LogoutPage } from "@/components/auth/logout-page";

export const Route = createFileRoute("/auth/logout")({
  component: LogoutPage,
});
