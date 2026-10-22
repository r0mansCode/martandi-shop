import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Category, Order, Product } from "@/lib/types";
import {
  GSI1,
  META,
  categoryItem,
  fromItem,
  orderItem,
  pk,
  productItem,
  type EntityType,
} from "./dynamo-items";
import type { Db } from "./types";

// Production store: one DynamoDB table, layout in ./dynamo-items.
// Credentials come from the default AWS chain: the Amplify compute role in production,
// the AWS_PROFILE from .env.local in development.

export function createDynamoDb(): Db {
  const table = process.env.DYNAMODB_TABLE;
  if (!table) throw new Error('DATA_SOURCE is "dynamo" but DYNAMODB_TABLE is not set.');

  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.DYNAMODB_REGION }),
    { marshallOptions: { removeUndefinedValues: true } },
  );

  async function get<T>(type: EntityType, id: string): Promise<T | null> {
    const { Item } = await client.send(
      new GetCommand({ TableName: table, Key: { PK: pk(type, id), SK: META } }),
    );
    return Item ? fromItem<T>(Item) : null;
  }

  /** All items of one type via GSI1, following pagination. */
  async function queryAll<T>(type: EntityType, newestFirst = false): Promise<T[]> {
    const items: T[] = [];
    let start: Record<string, unknown> | undefined;
    do {
      const page = await client.send(
        new QueryCommand({
          TableName: table,
          IndexName: GSI1,
          KeyConditionExpression: "GSI1PK = :t",
          ExpressionAttributeValues: { ":t": type },
          ScanIndexForward: !newestFirst,
          ExclusiveStartKey: start,
        }),
      );
      for (const item of page.Items ?? []) items.push(fromItem<T>(item));
      start = page.LastEvaluatedKey;
    } while (start);
    return items;
  }

  // GSI1 is eventually consistent, so a slug lookup can miss a write made a moment ago.
  async function getBySlug<T>(type: EntityType, slug: string): Promise<T | null> {
    const { Items } = await client.send(
      new QueryCommand({
        TableName: table,
        IndexName: GSI1,
        KeyConditionExpression: "GSI1PK = :t AND GSI1SK = :s",
        ExpressionAttributeValues: { ":t": type, ":s": slug },
        Limit: 1,
      }),
    );
    return Items?.[0] ? fromItem<T>(Items[0]) : null;
  }

  async function put(item: Record<string, unknown>) {
    await client.send(new PutCommand({ TableName: table, Item: item }));
  }

  async function remove(type: EntityType, id: string) {
    await client.send(new DeleteCommand({ TableName: table, Key: { PK: pk(type, id), SK: META } }));
  }

  return {
    categories: {
      list: async () =>
        (await queryAll<Category>("CATEGORY")).toSorted((a, b) => a.sortOrder - b.sortOrder),
      getById: (id) => get("CATEGORY", id),
      getBySlug: (slug) => getBySlug("CATEGORY", slug),
      put: (category) => put(categoryItem(category)),
      delete: (id) => remove("CATEGORY", id),
    },
    products: {
      // GSI1 returns slug order; sort by creation to match the mock store's insertion order.
      list: async () =>
        (await queryAll<Product>("PRODUCT")).toSorted(
          (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
        ),
      getById: (id) => get("PRODUCT", id),
      getBySlug: (slug) => getBySlug("PRODUCT", slug),
      put: (product) => put(productItem(product)),
      delete: (id) => remove("PRODUCT", id),
    },
    orders: {
      list: () => queryAll<Order>("ORDER", true),
      getById: (id) => get("ORDER", id),
      put: (order) => put(orderItem(order)),
    },
    counters: {
      next: async (key) => {
        const { Attributes } = await client.send(
          new UpdateCommand({
            TableName: table,
            Key: { PK: pk("COUNTER", key), SK: META },
            UpdateExpression: "ADD #v :one",
            ExpressionAttributeNames: { "#v": "value" },
            ExpressionAttributeValues: { ":one": 1 },
            ReturnValues: "UPDATED_NEW",
          }),
        );
        return Attributes!.value as number;
      },
    },
  };
}
