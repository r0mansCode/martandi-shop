// Product image rules shared by the admin upload field (early feedback) and the server
// (enforcement). Uploads go to S3 under products/ and are served through CloudFront.

/** Raster formats only: no SVG, which can carry scripts. */
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 12;

export const isImageType = (type: string): type is ImageType => type in IMAGE_TYPES;

/** CloudFront base URL, e.g. https://d123.cloudfront.net (no trailing slash). */
export const imagesBaseUrl = (process.env.NEXT_PUBLIC_IMAGES_URL ?? "").replace(/\/+$/, "");

/** Images a product may reference: the original photos in /public, or our CloudFront uploads. */
export function isAllowedImageUrl(url: string) {
  if (/^\/products\/[\w.-]+$/.test(url)) return true;
  return Boolean(imagesBaseUrl) && url.startsWith(`${imagesBaseUrl}/products/`) && !url.includes("..");
}
