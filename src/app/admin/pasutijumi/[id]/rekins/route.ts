import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { invoiceFilename, renderInvoicePdf } from "@/server/invoice-pdf";

// Admin download of an order's invoice PDF, rendered on demand from the stored order.
export async function GET(_req: Request, { params }: RouteContext<"/admin/pasutijumi/[id]/rekins">) {
  await requireAdmin();

  const order = await db.orders.getById((await params).id);
  if (!order) return new Response("Pasūtījums nav atrasts", { status: 404 });

  const pdf = await renderInvoicePdf(order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceFilename(order)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
