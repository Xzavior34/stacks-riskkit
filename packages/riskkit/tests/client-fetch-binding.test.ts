import { test, expect } from "vitest";
import { StacksClient } from "../src/stacks/client";

test("default fetch is invoked with globalThis as receiver", async () => {
  const originalFetch = (globalThis as any).fetch;
  let observedThis: any = undefined;

  // Install a platform-like fetch function that captures `this` when called.
  (globalThis as any).fetch = function (url: any, opts: any) {
    observedThis = this;
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as any);
  };

  try {
    const client = new StacksClient();
    await client.getJson("/test-binding");
    // If the client bound globalThis.fetch correctly, `observedThis` will be globalThis.
    expect(observedThis).toBe(globalThis);
  } finally {
    // Restore original fetch after the test.
    (globalThis as any).fetch = originalFetch;
  }
});
