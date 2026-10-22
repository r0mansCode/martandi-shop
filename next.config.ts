import type { NextConfig } from "next";

// Cache Components is intentionally off: Amplify Hosting officially supports the
// previous caching model (static pages + ISR + revalidatePath/revalidateTag).
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
