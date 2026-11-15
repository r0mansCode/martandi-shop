import { requireAdmin } from "@/server/auth/session";
import { getInvoiceLogo } from "@/server/invoice-logos";
import { isInvoiceLogo } from "@/lib/invoice-logos";

// The current image of one invoice logo, for the previews on the logos page.
export async function GET(_req: Request, { params }: RouteContext<"/admin/rekini/logotipi/[logo]">) {
  await requireAdmin();
  const { logo } = await params;
  if (!isInvoiceLogo(logo)) return new Response("Nav atrasts", { status: 404 });

  const image = await getInvoiceLogo(logo);
  return new Response(new Uint8Array(image.bytes), {
    headers: { "Content-Type": image.type, "Cache-Control": "private, no-store" },
  });
}
