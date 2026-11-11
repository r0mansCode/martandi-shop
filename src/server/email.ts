import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { site } from "@/config/site";

// Transactional email through Resend (domain tavidzerieni.lv, sender in config/site.ts).
// Without RESEND_API_KEY (local development) emails are logged instead of sent.

export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

export type EmailMessage = {
  to: string;
  subject: string;
  /** Rendered by Resend; `text` is the plain-text fallback. */
  react?: ReactElement;
  html?: string;
  text: string;
  attachments?: EmailAttachment[];
  /** Prevents duplicate sends when a request is retried, e.g. `invoice-${order.id}`. */
  idempotencyKey?: string;
};

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

/** Sends an email and returns the Resend message id (or null when only logged). Throws on failure. */
export async function sendEmail(message: EmailMessage): Promise<string | null> {
  const resend = getClient();

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set.");
    }
    console.info(
      `[email] RESEND_API_KEY not set, not sending.\n  to: ${message.to}\n  subject: ${message.subject}\n` +
        `  attachments: ${message.attachments?.map((a) => a.filename).join(", ") || "none"}\n\n${message.text}`,
    );
    return null;
  }

  const { data, error } = await resend.emails.send(
    {
      from: site.emailFrom,
      to: message.to,
      subject: message.subject,
      react: message.react,
      html: message.html,
      text: message.text,
      attachments: message.attachments,
    },
    message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
  );

  if (error) {
    throw new Error(`Resend failed to send "${message.subject}" to ${message.to}: ${error.name}: ${error.message}`);
  }
  return data.id;
}
