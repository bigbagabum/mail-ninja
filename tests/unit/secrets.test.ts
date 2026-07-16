import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, secretHint } from "@/lib/secret-box";

describe("secret storage", () => {
  it("encrypts secrets without storing plaintext", () => {
    const encrypted = encryptSecret("re_example_secret");
    expect(encrypted).not.toContain("re_example_secret");
    expect(decryptSecret(encrypted)).toBe("re_example_secret");
  });

  it("shows a safe key hint", () => {
    expect(secretHint("re_1234567890")).toBe("re_1...7890");
  });
});
