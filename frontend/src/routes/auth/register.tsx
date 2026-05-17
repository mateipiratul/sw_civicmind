import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/components/auth/register-page";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});
