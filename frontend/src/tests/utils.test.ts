import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  it("should combine class names correctly", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("should filter out falsy values", () => {
    expect(cn("class1", null, "class2", undefined, false)).toBe("class1 class2");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
  });

  it("should handle single class", () => {
    expect(cn("single")).toBe("single");
  });
});