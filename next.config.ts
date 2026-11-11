import type { NextConfig } from "next";

// Uploaded product images are served from CloudFront (see src/lib/product-images.ts).
const imagesUrl = process.env.NEXT_PUBLIC_IMAGES_URL;

// Cache Components is intentionally off: Amplify Hosting officially supports the
// previous caching model (static pages + ISR + revalidatePath/revalidateTag).
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  // Files read at runtime via computed paths, which tracing can miss: the mock store's seed
  // and the invoice PDF fonts.
  outputFileTracingIncludes: {
    "/**": ["./data/seed/**/*", "./assets/fonts/**/*"],
  },
  images: {
    // Only our own uploads folder; SVG stays disabled (the default).
    remotePatterns: imagesUrl ? [new URL(`${imagesUrl.replace(/\/+$/, "")}/products/**`)] : [],
  },
};

export default nextConfig;
