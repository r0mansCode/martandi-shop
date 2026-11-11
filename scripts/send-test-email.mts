// Sends one test email through Resend to check the API key and domain setup.
//   npm run email:test -- someone@example.com
// Reads RESEND_API_KEY from the environment / .env.local.

import { Resend } from "resend";
import { site } from "../src/config/site";

const to = process.argv[2];
const key = process.env.RESEND_API_KEY;

if (!to || !to.includes("@")) {
  console.error("Usage: npm run email:test -- <recipient email>");
  process.exit(1);
}
if (!key) {
  console.error("Set RESEND_API_KEY (e.g. in .env.local).");
  process.exit(1);
}

const { data, error } = await new Resend(key).emails.send({
  from: site.emailFrom,
  to,
  subject: `${site.name}: testa e-pasts`,
  text:
    `Sveiki!\n\nŠis ir testa e-pasts no ${site.name}, lai pārbaudītu e-pastu sūtīšanu.\n` +
    `Garumzīmes: ā č ē ģ ī ķ ļ ņ š ū ž.\n`,
});

if (error) {
  console.error(`Send failed: ${error.name}: ${error.message}`);
  process.exit(1);
}
console.log(`Sent from ${site.emailFrom} to ${to}. Resend id: ${data.id}`);
