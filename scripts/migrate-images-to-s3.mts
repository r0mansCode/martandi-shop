// One-off: moves product photos referenced as /products/<file> (served from public/) to S3
// and points the products at their CloudFront URLs. Only images and variant images change.
//   npm run images:migrate            dry run: prints what would happen, writes nothing
//   npm run images:migrate -- --apply  uploads, backs up every product, then updates it
// Reads DYNAMODB_TABLE, DYNAMODB_REGION, IMAGES_BUCKET, IMAGES_REGION, NEXT_PUBLIC_IMAGES_URL
// and AWS_PROFILE from the environment / .env.local.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Product } from "../src/lib/types";
import { GSI1, fromItem, pk, META } from "../src/server/db/dynamo-items";

const env = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} (e.g. in .env.local).`);
  return value;
};
const table = env("DYNAMODB_TABLE");
const bucket = env("IMAGES_BUCKET");
const baseUrl = env("NEXT_PUBLIC_IMAGES_URL").replace(/\/+$/, "");
const apply = process.argv.includes("--apply");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env("DYNAMODB_REGION") }));
const s3 = new S3Client({ region: env("IMAGES_REGION") });
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function allProducts() {
  const items: Product[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const page = await db.send(
      new QueryCommand({
        TableName: table,
        IndexName: GSI1,
        KeyConditionExpression: "GSI1PK = :t",
        ExpressionAttributeValues: { ":t": "PRODUCT" },
        ExclusiveStartKey: start,
      }),
    );
    for (const item of page.Items ?? []) items.push(fromItem<Product>(item));
    start = page.LastEvaluatedKey;
  } while (start);
  return items;
}

/** /products/x.jpg → { key: products/<id>/x-<hash>.jpg, url, file, type }. Content hash keeps CDN caching safe. */
async function plan(product: Product, localUrl: string) {
  const file = path.join(process.cwd(), "public", localUrl);
  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext];
  if (!type) throw new Error(`${product.id}: unsupported image type ${localUrl}`);
  const body = await fs.readFile(file);
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 10);
  const key = `products/${product.id}/${path.basename(file, ext)}-${hash}${ext}`;
  return { key, url: `${baseUrl}/${key}`, body, type };
}

const products = await allProducts();
const changes: { product: Product; images: Product["images"]; variants: Product["variants"] }[] = [];
let uploads = 0;
const problems: string[] = [];

// 1. Upload the files (safe to repeat: same content → same key).
for (const product of products) {
  const local = [...new Set([...product.images.map((i) => i.url), ...product.variants.flatMap((v) => v.image ?? [])])]
    .filter((url) => url.startsWith("/products/"));
  if (!local.length) continue;

  const moved = new Map<string, string>();
  try {
    for (const url of local) {
      const p = await plan(product, url);
      if (apply) {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: p.key,
            Body: p.body,
            ContentType: p.type,
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
      }
      uploads++;
      moved.set(url, p.url);
    }
  } catch (error) {
    problems.push(`${product.id} ${product.name}: ${error instanceof Error ? error.message : error}`);
    continue;
  }
  changes.push({
    product,
    images: product.images.map((i) => ({ ...i, url: moved.get(i.url) ?? i.url })),
    variants: product.variants.map((v) => (v.image ? { ...v, image: moved.get(v.image) ?? v.image } : v)),
  });
}

// 2. Back up the products as they are now, before touching any of them.
if (apply && changes.length) {
  const dir = path.join(process.cwd(), ".data", "backups");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `products-before-image-migration-${Date.now()}.json`);
  await fs.writeFile(file, JSON.stringify(changes.map((c) => c.product), null, 2));
  console.log(`Backup of ${changes.length} products: ${file}`);
}

// 3. Point the products at CloudFront, only if nobody saved them since we read them.
let updated = 0;
for (const { product, images, variants } of changes) {
  if (apply) {
    try {
      await db.send(
        new UpdateCommand({
          TableName: table,
          Key: { PK: pk("PRODUCT", product.id), SK: META },
          UpdateExpression: "SET images = :i, variants = :v",
          ConditionExpression: "updatedAt = :u",
          ExpressionAttributeValues: { ":i": images, ":v": variants, ":u": product.updatedAt },
        }),
      );
    } catch (error) {
      problems.push(`${product.id} ${product.name}: not updated (${error instanceof Error ? error.name : error})`);
      continue;
    }
  }
  updated++;
}

console.log(`${apply ? "Done" : "Dry run"}: ${products.length} products, ${updated} ${apply ? "updated" : "to update"}, ${uploads} images ${apply ? "uploaded" : "to upload"}.`);
for (const p of problems) console.log(`  skipped ${p}`);
