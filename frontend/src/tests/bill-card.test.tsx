/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { BillCard } from "@/components/bill-card";
import type { Bill } from "@/lib/api";

// Mock tanstack router locally
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe("BillCard", () => {
  const mockBill: Bill = {
    idp: 123,
    bill_number: "PL-x 123/2026",
    title: "Lege pentru digitalizare",
    status: "Adoptat",
    registered_at: "2026-06-09T10:00:00Z",
    law_type: "Lege ordinara",
    ai_analysis: {
      title_short: "Digitalizare 2026",
      impact_categories: ["it", "administratie"],
      controversy_score: 5,
    } as any,
  } as any;

  it("should render bill information correctly", () => {
    render(<BillCard bill={mockBill} />);

    expect(screen.getByText("PL-x 123/2026")).toBeInTheDocument();
    expect(screen.getByText("Adoptat")).toBeInTheDocument();
    expect(screen.getByText("Digitalizare 2026")).toBeInTheDocument();
    expect(screen.getByText("it")).toBeInTheDocument();
    expect(screen.getByText("administratie")).toBeInTheDocument();
    expect(screen.getByText("Lege ordinara")).toBeInTheDocument();
  });

  it("should fallback to default title if short title is missing", () => {
    const billWithoutShortTitle = {
      ...mockBill,
      ai_analysis: {
        ...mockBill.ai_analysis,
        title_short: undefined,
      } as any,
    };

    render(<BillCard bill={billWithoutShortTitle} />);

    expect(screen.getByText("Lege pentru digitalizare")).toBeInTheDocument();
  });
});
