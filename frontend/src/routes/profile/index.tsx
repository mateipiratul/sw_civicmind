import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/profile/profile-page";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});
