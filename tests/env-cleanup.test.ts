import { afterEach, describe, expect, it } from "vitest";
import { createVault } from "../src/index.js";

const envKey = "CLAUDE_API_KEY";
const originalValue = process.env[envKey];

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env[envKey];
    return;
  }

  process.env[envKey] = originalValue;
});

describe("environment cleanup pattern", () => {
  it("can read a secret from vault after deleting it from process.env", async () => {
    process.env[envKey] = "your-secret-from-env";

    const vault = await createVault();
    await vault.set("claude_key", process.env[envKey]);

    delete process.env[envKey];

    expect(process.env[envKey]).toBeUndefined();
    expect(await vault.get("claude_key")).toBe("your-secret-from-env");
    expect(vault.snapshot()).toEqual({ claude_key: "[sealed]" });
  });
});
