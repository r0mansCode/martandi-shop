import "server-only";
import { createDynamoDb } from "./dynamo";
import { mockDb } from "./mock";
import type { Db } from "./types";

function selectDb(): Db {
  const source = process.env.DATA_SOURCE ?? "mock";
  switch (source) {
    case "mock":
      return mockDb;
    case "dynamo":
      return createDynamoDb();
    default:
      throw new Error(`Unknown DATA_SOURCE "${source}". Use "mock" or "dynamo".`);
  }
}

export const db = selectDb();
export type { Db } from "./types";
