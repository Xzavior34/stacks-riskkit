import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

/**
 * A render-level smoke test. This exists specifically to catch runtime
 * rendering crashes that a manual code review can miss — e.g. accessing a
 * property that doesn't exist on a real API response shape, or a hook
 * misuse that only throws when actually mounted. It mocks `fetch` so no
 * real network call is made.
 */

function mockFetchOnce(stxBalance: string, ftResults: Array<{ asset_identifier: string; balance: string }>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/balances/stx")) {
      return new Response(JSON.stringify({ balance: stxBalance }), { status: 200 });
    }
    if (url.includes("/balances/ft")) {
      return new Response(JSON.stringify({ results: ftResults }), { status: 200 });
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the masthead, POC scope, and default (off) synthetic-data checkbox without crashing", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Stacks RiskKit" })).toBeInTheDocument();
    expect(screen.getByText("POC scope")).toBeInTheDocument();
    expect(screen.getByText("Next development phase")).toBeInTheDocument();

    const fixtureCheckbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(fixtureCheckbox.checked).toBe(false); // synthetic data must be off by default
  });

  it("labels the testnet address input for accessibility", () => {
    render(<App />);
    expect(screen.getByLabelText("Stacks testnet address")).toBeInTheDocument();
  });

  it("analyzing a real-only address shows the REAL STACKS TESTNET DATA badge", async () => {
    mockFetchOnce("1500000", []);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getByText("REAL STACKS TESTNET DATA")).toBeInTheDocument();
    });
  });

  it("shows the SYNTHETIC DEMO DATA badge only when the checkbox is opted into", async () => {
    mockFetchOnce("0", []);
    render(<App />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getByText("INCLUDES SYNTHETIC DEMO DATA")).toBeInTheDocument();
    });
  });

  it("shows a human-readable error banner (not a raw stack trace) when the API call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert").textContent).not.toMatch(/at Object\.|\.ts:\d+:\d+/);
  });

  it("shows an explicit empty-portfolio message rather than an empty, silent result", async () => {
    mockFetchOnce("0", []);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getByText("No tracked positions were found for this address.")).toBeInTheDocument();
    });
  });

  it("never displays a risk level using color alone — a text label is always present", async () => {
    mockFetchOnce("1500000", []);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/^(low|medium|high)$/).length).toBeGreaterThan(0);
    });
  });
});
