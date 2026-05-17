import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});
