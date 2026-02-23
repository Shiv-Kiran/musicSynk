import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { getEncryptionSecret } from "@/lib/server/config";

type EncryptionEnvelope = {
  version: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

function deriveKey() {
  return createHash("sha256").update(getEncryptionSecret()).digest();
}

function toB64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromB64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptJson<T>(payload: T): EncryptionEnvelope {
  const iv = randomBytes(12);
  const key = deriveKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    alg: "aes-256-gcm",
    iv: toB64Url(iv),
    tag: toB64Url(tag),
    ciphertext: toB64Url(encrypted),
  };
}

export function decryptJson<T>(envelope: unknown): T {
  if (
    !envelope ||
    typeof envelope !== "object" ||
    !("version" in envelope) ||
    !("alg" in envelope) ||
    !("iv" in envelope) ||
    !("tag" in envelope) ||
    !("ciphertext" in envelope)
  ) {
    throw new Error("Invalid encryption envelope");
  }

  const parsed = envelope as EncryptionEnvelope;
  if (parsed.version !== 1 || parsed.alg !== "aes-256-gcm") {
    throw new Error("Unsupported encryption envelope version");
  }

  const key = deriveKey();
  const decipher = createDecipheriv("aes-256-gcm", key, fromB64Url(parsed.iv));
  decipher.setAuthTag(fromB64Url(parsed.tag));
  const decrypted = Buffer.concat([
    decipher.update(fromB64Url(parsed.ciphertext)),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}
