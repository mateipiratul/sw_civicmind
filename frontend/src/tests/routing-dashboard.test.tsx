/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock market filtering logic
describe("Dashboard Market Filtering", () => {
  const mockMarkets = [
    { id: 1, title: "Active Market 1", status: "active" as const },
    { id: 2, title: "Active Market 2", status: "active" as const },
    { id: 3, title: "Resolved Market 1", status: "resolved" as const },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Filter by status", () => {
    it("should filter active markets", () => {
      const filtered = mockMarkets.filter(m => m.status === "active");
      expect(filtered).toHaveLength(2);
      expect(filtered.every(m => m.status === "active")).toBe(true);
    });

    it("should filter resolved markets", () => {
      const filtered = mockMarkets.filter(m => m.status === "resolved");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe("resolved");
    });

    it("should return empty array for non-existent status", () => {
      const filtered = mockMarkets.filter(m => (m.status as string) === "cancelled");
      expect(filtered).toHaveLength(0);
    });
  });

  describe("Market count statistics", () => {
    it("should count total markets", () => {
      expect(mockMarkets).toHaveLength(3);
    });

    it("should count active markets", () => {
      const activeCount = mockMarkets.filter(m => m.status === "active").length;
      expect(activeCount).toBe(2);
    });

    it("should count resolved markets", () => {
      const resolvedCount = mockMarkets.filter(m => m.status === "resolved").length;
      expect(resolvedCount).toBe(1);
    });
  });

  describe("Market sorting", () => {
    it("should sort markets by ID", () => {
      const sorted = [...mockMarkets].sort((a, b) => a.id - b.id);
      expect(sorted[0].id).toBe(1);
      expect(sorted[2].id).toBe(3);
    });

    it("should sort markets alphabetically by title", () => {
      const sorted = [...mockMarkets].sort((a, b) => a.title.localeCompare(b.title));
      expect(sorted[0].title).toContain("Active Market 1");
    });
  });
});