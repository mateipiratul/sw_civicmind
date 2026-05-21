import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/components/auth/reset-password-page";

interface ResetSearchParams {
  uid?: string;
  token?: string;
}

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetSearchParams => {
    return {
      uid: search.uid as string | undefined,
      token: search.token as string | undefined,
    };
  },
  component: ResetPasswordPage,
});
