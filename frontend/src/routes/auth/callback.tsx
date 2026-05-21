import { createFileRoute } from "@tanstack/react-router";
import { AuthCallbackPage } from "@/components/auth/auth-callback-page";

type CallbackSearch = {
  code?: string;
  error?: string;
};

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => {
    return {
      code: search.code as string | undefined,
      error: search.error as string | undefined,
    };
  },
  component: AuthCallbackPage,
});
