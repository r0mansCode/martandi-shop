import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "./db";
import { LOGO_TYPES, type InvoiceLogo, type LogoType } from "@/lib/invoice-logos";

// Invoice logos: an uploaded replacement lives in the settings store as base64 (a few dozen KB,
// well under DynamoDB's item limit), so no S3 bucket or IAM change is needed and the PDF
// renderer gets the bytes straight away. Without one, the file in the repo is used.

// Traced into the server bundle in next.config.ts.
const DEFAULT_FILES: Record<InvoiceLogo, string> = {
  martandi: path.join(process.cwd(), "assets", "logos", "martandi.png"),
  tavidzerieni: path.join(process.cwd(), "public", "logo.png"),
};

const stored = z.object({ type: z.enum(LOGO_TYPES), data: z.string().min(1), updatedAt: z.string() });

const key = (logo: InvoiceLogo) => `invoice-logo-${logo}`;

async function getStored(logo: InvoiceLogo) {
  const parsed = stored.safeParse(await db.settings.get(key(logo)));
  return parsed.success ? parsed.data : null;
}

export type LogoImage = { bytes: Buffer; type: LogoType; updatedAt?: string };

/** The logo's image: the uploaded one, or the default file. */
export async function getInvoiceLogo(logo: InvoiceLogo): Promise<LogoImage> {
  const custom = await getStored(logo);
  if (custom) return { bytes: Buffer.from(custom.data, "base64"), type: custom.type, updatedAt: custom.updatedAt };
  return { bytes: await readFile(DEFAULT_FILES[logo]), type: "image/png" };
}

/** The real type from the file's first bytes, so a renamed file can't slip past the browser's claim. */
export function sniffLogoType(bytes: Buffer): LogoType | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export async function saveInvoiceLogo(logo: InvoiceLogo, bytes: Buffer, type: LogoType) {
  await db.settings.put(key(logo), { type, data: bytes.toString("base64"), updatedAt: new Date().toISOString() });
}

/** Back to the default file. */
export async function resetInvoiceLogo(logo: InvoiceLogo) {
  await db.settings.put(key(logo), null);
}
