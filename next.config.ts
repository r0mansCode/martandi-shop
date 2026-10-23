import type { NextConfig } from "next";

// Uploaded product images are served from CloudFront (see src/lib/product-images.ts).
const imagesUrl = process.env.NEXT_PUBLIC_IMAGES_URL;

// Cache Components is intentionally off: Amplify Hosting officially supports the
// previous caching model (static pages + ISR + revalidatePath/revalidateTag).
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  // The mock store reads its seed at runtime via a computed path, which tracing can miss.
  outputFileTracingIncludes: {
    "/**": ["./data/seed/**/*"],
  },
  images: {
    // Only our own uploads folder; SVG stays disabled (the default).
    remotePatterns: imagesUrl ? [new URL(`${imagesUrl.replace(/\/+$/, "")}/products/**`)] : [],
  },
};

export default nextConfig;
