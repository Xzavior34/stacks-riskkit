import { test, expect } from "vitest";
import { StacksClient } from "../src/stacks/client";

test("default fetch is invoked with globalThis as receiver", async () => {
  // Preserve the original fetch implementation
  const originalFetch: typeof globalThis.fetch | undefined = globalThis.fetch;

  // Install a platform-like fetch function that returns whether its receiver
  // is globalThis in the JSON body so the test can assert binding semantics
  // without capturing `this` into a local variable.
  globalThis.fetch = function (this: unknown, _input: RequestInfo, _init?: RequestInit): Promise<Response> {
    const receiverIsGlobalThis = this === globalThis;
    const body = JSON.stringify({ receiverIsGlobalThis });
    const mockResponse = new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
    return Promise.resolve(mockResponse);
  } as typeof globalThis.fetch;

  try {
    const client = new StacksClient();
    const result = await client.getJson<{ receiverIsGlobalThis: boolean }>("/test-binding");
    // If the client bound globalThis.fetch correctly, the response will state so.
    expect(result.receiverIsGlobalThis).toBe(true);
  } finally {
    // Restore original fetch after the test.
    if (originalFetch === undefined) {
      Reflect.deleteProperty(globalThis, "fetch");
    } else {
      globalThis.fetch = originalFetch;
    }
  }
});
