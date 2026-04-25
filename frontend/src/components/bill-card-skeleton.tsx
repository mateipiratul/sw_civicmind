import { Skeleton } from "@/components/ui/skeleton";

export function BillCardSkeleton() {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e8e8e8",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-5 w-24 rounded ml-auto" />
      </div>
      <Skeleton className="h-5 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-4/5 rounded" />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Skeleton className="h-3.5 w-20 rounded" />
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="h-3.5 w-20 rounded ml-auto" />
      </div>
    </div>
  );
}
