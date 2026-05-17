import { createFileRoute } from "@tanstack/react-router";
import { BillDetailPage } from "@/components/bills/bill-detail-page";

export const Route = createFileRoute("/bills/$id")({
  component: BillDetailPage,
});
