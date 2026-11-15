import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { invoiceFilename, renderManualInvoicePdf } from "@/server/invoice-pdf";

// A manual invoice's PDF, rendered on demand from the stored invoice.
// Opens in the browser; ?lejupieladet=1 saves it as a file instead.
export async function GET(req: Request, { params }: RouteContext<"/admin/rekini/[id]/pdf">) {
  await requireAdmin();

  const invoice = await db.invoices.getById((await params).id);
  if (!invoice) return new Response("Rēķins nav atrasts", { status: 404 });

  const pdf = await renderManualInvoicePdf(invoice);
  const disposition = new URL(req.url).searchParams.has("lejupieladet") ? "attachment" : "inline";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${invoiceFilename(invoice)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
