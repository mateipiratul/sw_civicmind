import { createFileRoute } from "@tanstack/react-router";
import { MPsPage } from "@/components/mps/mps-page";

export const Route = createFileRoute("/mps/")({
  component: MPsPage,
});
