import { createHash } from "node:crypto";

const normalizeText = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, " ").trim();

export const hashText = (text: string, ...namespace: string[]): string => {
  const normalized = normalizeText(text);
  const parts = [...namespace, normalized].join(":");
  return createHash("sha256").update(parts).digest("hex");
};
