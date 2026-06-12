import { JSDOM } from "jsdom";
import React from "react";

// Initialize DOM environment immediately
if (typeof document === "undefined") {
  const jsdom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
  });
  const { window } = jsdom;

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = window;
  g.document = window.document;
  g.navigator = window.navigator;
  g.Node = window.Node;
  g.Element = window.Element;
  g.HTMLElement = window.HTMLElement;
  g.localStorage = window.localStorage;
  g.sessionStorage = window.sessionStorage;
  g.HTMLInputElement = window.HTMLInputElement;
  g.HTMLButtonElement = window.HTMLButtonElement;
  g.HTMLAnchorElement = window.HTMLAnchorElement;
  g.Event = window.Event;
  g.CustomEvent = window.CustomEvent;
}

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// VERY basic global mock to prevent destructuring errors if local mock fails to load
vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    login: () => {},
    logout: () => {},
    refreshUser: () => {},
    updateUser: () => {},
  }),
}));

vi.mock("@tanstack/react-query", () => {
  const React = require("react");
  return {
    useQuery: ({ queryKey, queryFn }: any) => {
      const [data, setData] = React.useState(undefined);
      const [isLoading, setIsLoading] = React.useState(true);
      const [error, setError] = React.useState(null);

      React.useEffect(() => {
        let active = true;
        setIsLoading(true);
        Promise.resolve(queryFn())
          .then((res) => {
            if (active) {
              setData(res);
              setIsLoading(false);
            }
          })
          .catch((err) => {
            if (active) {
              setError(err);
              setIsLoading(false);
            }
          });
        return () => {
          active = false;
        };
      }, [JSON.stringify(queryKey)]);

      return { data, isLoading, error, refetch: () => {} };
    },
    QueryClient: class {},
    QueryClientProvider: ({ children }: any) => children,
  };
});

// Mock EventSource
(globalThis as unknown as Record<string, unknown>).EventSource = class {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  close() {
    this.readyState = 2;
  }
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value != null ? value.toString() : "";
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
} else {
  (globalThis as unknown as Record<string, unknown>).localStorage = localStorageMock;
}

// MSW Server configuration
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";
import { db } from "./mocks/db";
import { beforeAll, afterAll } from "vitest";

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
  db.reset();
});

afterAll(() => {
  server.close();
});
