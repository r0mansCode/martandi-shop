import type { NextConfig } from "next";

// Cache Components is intentionally off: Amplify Hosting officially supports the
// previous caching model (static pages + ISR + revalidatePath/revalidateTag).
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  // The mock store reads its seed at runtime via a computed path, which tracing can miss.
  outputFileTracingIncludes: {
    "/**": ["./data/seed/**/*"],
  },
};

export default nextConfig;
