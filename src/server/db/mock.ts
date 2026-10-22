import "server-only";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Category, Order, Product } from "@/lib/types";
import type { Db } from "./types";

// Local development store: one JSON file, created from data/seed on first use.
// Not for production: Amplify compute has no persistent disk.

type MockData = {
  categories: Category[];
  products: Product[];
  orders: Order[];
  counters: Record<string, number>;
};

const SEED_DIR = path.join(process.cwd(), "data", "seed");

// Amplify compute has a read-only project dir; fall back to the per-instance temp dir there.
// Data in the temp dir is lost whenever the instance is recycled — fine for a preview deploy.
let dataDir: Promise<string> | null = null;
function resolveDataDir() {
  dataDir ??= (async () => {
    const local = path.join(process.cwd(), ".data");
    try {
      await fs.mkdir(local, { recursive: true });
      await fs.access(local, constants.W_OK);
      return local;
    } catch {
      const tmp = path.join(os.tmpdir(), "martand-shop");
      await fs.mkdir(tmp, { recursive: true });
      return tmp;
    }
  })();
  return dataDir;
}

async function dbFile() {
  return path.join(await resolveDataDir(), "db.json");
}

async function readSeed(): Promise<MockData> {
  const [categories, products] = await Promise.all([
    fs.readFile(path.join(SEED_DIR, "categories.json"), "utf8"),
    fs.readFile(path.join(SEED_DIR, "products.json"), "utf8"),
  ]);
  return {
    categories: JSON.parse(categories),
    products: JSON.parse(products),
    orders: [],
    counters: {},
  };
}

let seeded: Promise<void> | null = null;
function ensureSeeded() {
  seeded ??= dbFile().then((file) => fs.access(file).catch(async () => save(await readSeed())));
  return seeded;
}

async function load(): Promise<MockData> {
  await ensureSeeded();
  return JSON.parse(await fs.readFile(await dbFile(), "utf8"));
}

async function save(data: MockData) {
  const file = await dbFile();
  // Unique temp name: build workers run in parallel processes.
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

// Serialize writes within this process so read-modify-write cycles don't interleave.
let queue: Promise<unknown> = Promise.resolve();
function mutate<T>(fn: (data: MockData) => T): Promise<T> {
  const run = queue.then(async () => {
    const data = await load();
    const result = fn(data);
    await save(data);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) list.push(item);
  else list[i] = item;
}

export const mockDb: Db = {
  categories: {
    list: async () => (await load()).categories.toSorted((a, b) => a.sortOrder - b.sortOrder),
    getById: async (id) => (await load()).categories.find((c) => c.id === id) ?? null,
    getBySlug: async (slug) => (await load()).categories.find((c) => c.slug === slug) ?? null,
    put: (category) => mutate((d) => upsert(d.categories, category)),
    delete: (id) =>
      mutate((d) => {
        d.categories = d.categories.filter((c) => c.id !== id);
      }),
  },
  products: {
    list: async () => (await load()).products,
    getById: async (id) => (await load()).products.find((p) => p.id === id) ?? null,
    getBySlug: async (slug) => (await load()).products.find((p) => p.slug === slug) ?? null,
    put: (product) => mutate((d) => upsert(d.products, product)),
    delete: (id) =>
      mutate((d) => {
        d.products = d.products.filter((p) => p.id !== id);
      }),
  },
  orders: {
    list: async () =>
      (await load()).orders.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
    getById: async (id) => (await load()).orders.find((o) => o.id === id) ?? null,
    put: (order) => mutate((d) => upsert(d.orders, order)),
  },
  counters: {
    next: (key) =>
      mutate((d) => {
        d.counters[key] = (d.counters[key] ?? 0) + 1;
        return d.counters[key];
      }),
  },
};
