import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { invoiceFilename, renderInvoicePdf } from "@/server/invoice-pdf";

// Admin view of an order's invoice PDF, rendered on demand from the stored order.
// Opens in the browser; ?lejupieladet=1 saves it as a file instead.
export async function GET(req: Request, { params }: RouteContext<"/admin/pasutijumi/[id]/rekins">) {
  await requireAdmin();

  const order = await db.orders.getById((await params).id);
  if (!order) return new Response("Pasūtījums nav atrasts", { status: 404 });

  const pdf = await renderInvoicePdf(order);
  const disposition = new URL(req.url).searchParams.has("lejupieladet") ? "attachment" : "inline";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${invoiceFilename(order)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
