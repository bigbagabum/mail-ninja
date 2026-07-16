import { createHash, randomBytes } from "crypto";

export function createToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
