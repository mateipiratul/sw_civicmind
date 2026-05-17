import { createFileRoute } from "@tanstack/react-router";
import { MPDetailPage } from "@/components/mps/mp-detail-page";

export const Route = createFileRoute("/mps/$slug")({
  validateSearch: (search: Record<string, unknown>): { q?: string; billIds?: string; billNumbers?: string } => {
    const validated: { q?: string; billIds?: string; billNumbers?: string } = {};
    if (typeof search.q === "string") validated.q = search.q;
    if (typeof search.billIds === "string") validated.billIds = search.billIds;
    if (typeof search.billNumbers === "string") validated.billNumbers = search.billNumbers;
    return validated;
  },
  component: MPDetailPage,
});
