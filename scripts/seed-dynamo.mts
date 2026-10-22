// Loads data/seed into the DynamoDB table. Orders and counters are not touched.
//   npm run db:seed:dynamo            (refuses if the table already has products)
//   npm run db:seed:dynamo -- --force (overwrites seeded categories/products by id)
// Reads DYNAMODB_TABLE, DYNAMODB_REGION and AWS_PROFILE from the environment / .env.local.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  type BatchWriteCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import fs from "node:fs/promises";
import path from "node:path";
import type { Category, Product } from "../src/lib/types";
import { GSI1, categoryItem, productItem } from "../src/server/db/dynamo-items";

const table = process.env.DYNAMODB_TABLE;
const region = process.env.DYNAMODB_REGION;
if (!table || !region) {
  console.error("Set DYNAMODB_TABLE and DYNAMODB_REGION (e.g. in .env.local).");
  process.exit(1);
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

async function readSeed<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "seed", file), "utf8"));
}

async function batchWrite(items: Record<string, unknown>[]) {
  for (let i = 0; i < items.length; i += 25) {
    let requests: Record<string, unknown>[] | undefined = items
      .slice(i, i + 25)
      .map((Item) => ({ PutRequest: { Item } }));
    for (let attempt = 0; requests?.length; attempt++) {
      if (attempt > 5) throw new Error("DynamoDB kept returning unprocessed items.");
      if (attempt > 0) await new Promise((r) => setTimeout(r, 200 * 2 ** attempt));
      const res: BatchWriteCommandOutput = await client.send(new BatchWriteCommand({ RequestItems: { [table!]: requests } }));
      requests = res.UnprocessedItems?.[table!];
    }
  }
}

const { Items: existing } = await client.send(
  new QueryCommand({
    TableName: table,
    IndexName: GSI1,
    KeyConditionExpression: "GSI1PK = :t",
    ExpressionAttributeValues: { ":t": "PRODUCT" },
    Limit: 1,
  }),
);
if (existing?.length && !process.argv.includes("--force")) {
  console.error(`${table} already has products. Re-run with --force to overwrite them with the seed.`);
  process.exit(1);
}

const categories = await readSeed<Category[]>("categories.json");
const products = await readSeed<Product[]>("products.json");

console.log(`Seeding ${table} (${region}) with ${categories.length} categories and ${products.length} products...`);
await batchWrite([...categories.map(categoryItem), ...products.map(productItem)]);
console.log("Done.");
