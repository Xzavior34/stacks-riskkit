/**
 * Minimal fetch wrapper around the Hiro Stacks API.
 *
 * RiskKit deliberately does not depend on @stacks/transactions or
 * @stacks/network for this read-only proof of concept — no transaction
 * construction or signing is required to analyze balances, so a plain
 * REST client keeps the dependency surface small. See docs/RESEARCH.md for
 * why this choice was made and what would change if RiskKit later needs to
 * make read-only contract calls.
 */

export const DEFAULT_TESTNET_API_URL = "https://api.testnet.hiro.so";

export interface StacksClientConfig {
  apiUrl?: string;
  fetchImpl?: typeof fetch;
}

export class StacksApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "StacksApiError";
  }
}

export class StacksClient {
  private readonly apiUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: StacksClientConfig = {}) {
    this.apiUrl = (config.apiUrl ?? DEFAULT_TESTNET_API_URL).replace(/\/$/, "");

    if (config.fetchImpl) {
      // If a fetch implementation is explicitly provided (tests or non-browser
      // environments), use it unchanged so callers can inject mocks.
      this.fetchImpl = config.fetchImpl;
    } else if (typeof globalThis.fetch === "function") {
      // Bind the platform's native fetch to the global receiver to avoid the
      // browser "Illegal invocation" error that occurs when the native
      // implementation is called with the wrong `this` receiver.
      // Tests that inject fetchImpl will not be affected.
      // Use a typed cast rather than the generic Function type so ESLint
      // does not complain about unsafe function types.
      this.fetchImpl = globalThis.fetch.bind(globalThis) as typeof fetch;
    } else {
      throw new Error(
        "No fetch implementation available. Pass fetchImpl explicitly in a non-browser environment.",
      );
    }
  }

  async getJson<T>(path: string): Promise<T> {
    const url = `${this.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await this.fetchImpl(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new StacksApiError(
        `Stacks API request to ${path} failed with status ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  }
}
