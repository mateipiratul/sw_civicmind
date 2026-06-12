import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const pageBtnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 34,
  minWidth: 34,
  padding: "0 6px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  fontSize: 13.5,
  fontWeight: 500,
  color: "var(--text)",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 0.12s, border-color 0.12s, color 0.12s",
};

const pageBtnActive: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 34,
  minWidth: 34,
  padding: "0 6px",
  borderRadius: 8,
  border: "1px solid var(--primary)",
  background: "var(--primary)",
  fontSize: 13.5,
  fontWeight: 700,
  color: "var(--primary-text)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const pageBtnDisabled: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 34,
  minWidth: 34,
  padding: "0 6px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  fontSize: 13.5,
  fontWeight: 500,
  color: "var(--text-muted)",
  cursor: "default",
  fontFamily: "inherit",
  opacity: 0.5,
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showMax = 5;

    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis-1");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("ellipsis-2");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center items-center gap-1", className)}
    >
      <button
        style={currentPage <= 1 ? pageBtnDisabled : pageBtnBase}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Pagina anterioara"
        onMouseEnter={(e) => { if (currentPage > 1) (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
        onMouseLeave={(e) => { if (currentPage > 1) (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
      >
        <ChevronLeft size={15} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {getPageNumbers().map((page, index) => {
          if (typeof page === "string") {
            return (
              <span
                key={`ellipsis-${index}`}
                style={{ display: "inline-flex", height: 34, width: 28, alignItems: "center", justifyContent: "center" }}
              >
                <MoreHorizontal size={14} style={{ color: "var(--text-muted)" }} />
              </span>
            );
          }

          const isActive = currentPage === page;
          return (
            <button
              key={page}
              style={isActive ? pageBtnActive : pageBtnBase}
              onClick={() => onPageChange(page)}
              aria-current={isActive ? "page" : undefined}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        style={currentPage >= totalPages ? pageBtnDisabled : pageBtnBase}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Pagina urmatoare"
        onMouseEnter={(e) => { if (currentPage < totalPages) (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
        onMouseLeave={(e) => { if (currentPage < totalPages) (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
      >
        <ChevronRight size={15} />
      </button>
    </nav>
  );
}
