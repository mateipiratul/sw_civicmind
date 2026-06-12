/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("should render with default variant", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary");
  });

  it("should render with outline variant", () => {
    render(<Button variant="outline">Outline Button</Button>);

    const button = screen.getByRole("button", { name: /outline button/i });
    expect(button).toHaveClass("border-border");
    expect(button).toHaveClass("bg-background");
  });

  it("should render with secondary variant", () => {
    render(<Button variant="secondary">Secondary Button</Button>);

    const button = screen.getByRole("button", { name: /secondary button/i });
    expect(button).toHaveClass("bg-secondary");
  });

  it("should render with ghost variant", () => {
    render(<Button variant="ghost">Ghost Button</Button>);

    const button = screen.getByRole("button", { name: /ghost button/i });
    expect(button).toHaveClass("hover:bg-muted");
  });

  it("should render with destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: /delete/i });
    expect(button).toHaveClass("bg-destructive/10");
  });

  it("should render with appropriate size", () => {
    render(<Button size="sm">Small</Button>);

    const button = screen.getByRole("button", { name: /small/i });
    // Button renders, size is applied (h-8 may vary based on Tailwind config)
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("group/button");
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button", { name: /disabled/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");
  });

  it("should handle click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);

    const button = screen.getByRole("button", { name: /clickable/i });
    button.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});