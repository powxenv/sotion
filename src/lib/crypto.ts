import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function resolveEncryptionKey(raw: string) {
  const base64 = Buffer.from(raw, "base64");

  if (base64.length === 32 && base64.toString("base64") === raw) {
    return base64;
  }

  return createHash("sha256").update(raw).digest();
}

export function encrypt(
  value: string | null | undefined,
  rawKey: string,
) {
  if (!value) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    resolveEncryptionKey(rawKey),
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decrypt(
  value: string | null | undefined,
  rawKey: string,
) {
  if (!value) {
    return null;
  }

  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted value.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    resolveEncryptionKey(rawKey),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
