import type { Category, Order, Product } from "@/lib/types";

// Storage interfaces. Implementations: ./mock (local JSON file) and ./dynamo (phase 7).
// They only persist; validation and business rules live in the callers.

export interface CategoryRepo {
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
}

export interface CounterRepo {
  /** Atomically increments the counter and returns the new value (first call returns 1). */
  next(key: string): Promise<number>;
}

export interface Db {
  categories: CategoryRepo;
  products: ProductRepo;
  orders: OrderRepo;
  counters: CounterRepo;
}
