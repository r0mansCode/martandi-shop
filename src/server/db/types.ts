import type { Category, Order, Product } from "@/lib/types";

// Storage interfaces. Implementations: ./mock (local JSON file) and ./dynamo (phase 7).
// They only persist; validation and business rules live in the callers.

/**
 * Menu order: sortOrder, then id. The id tie-break makes both stores agree even when
 * sortOrder values repeat; otherwise DynamoDB falls back to slug order and the mock to file order.
 */
export const byCategoryOrder = (a: Category, b: Category) =>
  a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);

export interface CategoryRepo {
  /** In menu order (see byCategoryOrder). */
  list(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  getBySlug(slug: string): Promise<Category | null>;
  put(category: Category): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ProductRepo {
  list(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getBySlug(slug: string): Promise<Product | null>;
  put(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface OrderRepo {
  /** Newest first. */
  list(): Promise<Order[]>;
  getById(id: string): Promise<Order | null>;
  put(order: Order): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface CounterRepo {
  /** Atomically increments the counter and returns the new value (first call returns 1). */
  next(key: string): Promise<number>;
  /**
   * Sets the counter to `value`, but only if it still equals `expected` (atomic compare-and-set).
   * Returns false when another increment got there first.
   */
  rewind(key: string, expected: number, value: number): Promise<boolean>;
}

/** Small shop-wide settings documents by key (e.g. "shop-hours"). Callers validate the value. */
export interface SettingsRepo {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
}

export interface Db {
  categories: CategoryRepo;
  products: ProductRepo;
  orders: OrderRepo;
  counters: CounterRepo;
  settings: SettingsRepo;
}
