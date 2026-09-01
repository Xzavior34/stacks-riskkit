import { test, expect } from "vitest";
import { StacksClient } from "../src/stacks/client";

test("default fetch is invoked with globalThis as receiver", async () => {
  // Preserve the original fetch implementation
  const originalFetch: typeof globalThis.fetch | undefined = globalThis.fetch;

  // observedThis will capture the `this` receiver used when fetch is invoked
  let observedThis: unknown = undefined;

  // Install a platform-like fetch function that captures `this` when called.
  // Use the full RequestInfo/RequestInit/Response types for correctness.
  globalThis.fetch = function (this: unknown, input: RequestInfo, init?: RequestInit): Promise<Response> {
    observedThis = this;
    const body = JSON.stringify({});
    const mockResponse = new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
    return Promise.resolve(mockResponse);
  } as typeof globalThis.fetch;

  try {
    const client = new StacksClient();
    await client.getJson("/test-binding");
    // If the client bound globalThis.fetch correctly, `observedThis` will be globalThis.
    expect(observedThis).toBe(globalThis);
  } finally {
    // Restore original fetch after the test.
    if (originalFetch === undefined) {
      // Remove the property cleanly and typed via Reflect API (no `any`).
      Reflect.deleteProperty(globalThis, "fetch");
    } else {
      globalThis.fetch = originalFetch;
    }
  }
});
