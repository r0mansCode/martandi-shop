import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IMAGE_TYPES, imagesBaseUrl, type ImageType } from "@/lib/product-images";

// Presigned S3 uploads: the browser PUTs the file straight to S3, so image bytes never pass
// through the SSR function. Credentials come from the default AWS chain (compute role in
// production, AWS_PROFILE locally); the role may only write under products/.

let client: S3Client | null = null;

function config() {
  const bucket = process.env.IMAGES_BUCKET;
  const region = process.env.IMAGES_REGION;
  if (!bucket || !region || !imagesBaseUrl) {
    throw new Error("Image uploads need IMAGES_BUCKET, IMAGES_REGION and NEXT_PUBLIC_IMAGES_URL.");
  }
  client ??= new S3Client({ region });
  return { bucket, client };
}

/**
 * A 5-minute upload URL for one file. Content-Type and Content-Length are part of the
 * signature, so S3 rejects a different type or a bigger file than the one checked here.
 */
export async function createUploadUrl(productId: string, type: ImageType, size: number) {
  const { bucket, client } = config();
  const key = `products/${productId}/${crypto.randomUUID()}.${IMAGE_TYPES[type]}`;
  // Uploaded files never change (each upload gets a new key), so they can be cached for a year.
  const headers = { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" };
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: headers["Content-Type"],
      CacheControl: headers["Cache-Control"],
      ContentLength: size,
    }),
    { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length", "cache-control"]) },
  );
  // The browser must send exactly these headers (it sets Content-Length itself).
  return { uploadUrl, headers, url: `${imagesBaseUrl}/${key}` };
}
