/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function SimpleComponent() {
  const [val] = React.useState("hello");
  return React.createElement("div", { "data-testid": "simple" }, val);
}

describe("Simple React Test", () => {
  it("should work with basic hooks", () => {
    render(<SimpleComponent />);
    expect(screen.getByTestId("simple")).toHaveTextContent("hello");
  });
});
