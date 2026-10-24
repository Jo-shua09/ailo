import { MongoClient, type Db, type Document } from "mongodb";
import { env } from "../config/env.js";

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;

export interface BaseCollection<T extends Document> {
  findOne(filter: Partial<T> | Record<string, any>): Promise<T | null>;
  find(filter?: Partial<T> | Record<string, any>): {
    toArray(): Promise<T[]>;
    sort(sort: Record<string, 1 | -1>): { toArray(): Promise<T[]> };
    limit(limit: number): { toArray(): Promise<T[]> };
  };
  
  insertOne(doc: T): Promise<{ insertedId: any; acknowledged: boolean }>;
  updateOne(
    filter: Partial<T> | Record<string, any>,
    update: { $set?: Partial<T> | Record<string, any>; $inc?: Record<string, number> },
    options?: { upsert?: boolean },
  ): Promise<{ matchedCount: number; modifiedCount: number; upsertedId?: any }>;
  deleteMany(filter: Partial<T> | Record<string, any>): Promise<{ deletedCount: number }>;
  countDocuments(filter?: Partial<T> | Record<string, any>): Promise<number>;
}

class InMemoryCollection<T extends Document> implements BaseCollection<T> {
  private docs: T[] = [];

  constructor(public readonly name: string) {}

  private matches(doc: T, filter: Record<string, any>): boolean {
    for (const [key, val] of Object.entries(filter)) {
      if (val !== undefined && (doc as any)[key] !== val) {
        return false;
      }
    }
    return true;
  }

  async findOne(filter: Record<string, any>): Promise<T | null> {
    const found = this.docs.find((d) => this.matches(d, filter));
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  find(filter: Record<string, any> = {}) {
    const filtered = this.docs.filter((d) => this.matches(d, filter));
    let result = [...filtered];

    const builder = {
      sort: (sortObj: Record<string, 1 | -1>) => {
        const [sortKey, sortDir] = Object.entries(sortObj)[0] ?? [];
        if (sortKey) {
          result.sort((a, b) => {
            const valA = (a as any)[sortKey];
            const valB = (b as any)[sortKey];
            if (valA < valB) return sortDir === 1 ? -1 : 1;
            if (valA > valB) return sortDir === 1 ? 1 : -1;
            return 0;
          });
        }
        return {
          toArray: async () => JSON.parse(JSON.stringify(result)),
        };
      },
      limit: (limitNum: number) => {
        result = result.slice(0, limitNum);
        return {
          toArray: async () => JSON.parse(JSON.stringify(result)),
        };
      },
      toArray: async () => JSON.parse(JSON.stringify(result)),
    };
    return builder;
  }

  async insertOne(doc: T): Promise<{ insertedId: any; acknowledged: boolean }> {
    const copy = JSON.parse(JSON.stringify(doc));
    this.docs.push(copy);
    return { insertedId: (copy as any)._id ?? (copy as any).id, acknowledged: true };
  }

  async updateOne(
    filter: Record<string, any>,
    update: { $set?: Record<string, any>; $inc?: Record<string, number> },
    options: { upsert?: boolean } = {},
  ): Promise<{ matchedCount: number; modifiedCount: number; upsertedId?: any }> {
    const idx = this.docs.findIndex((d) => this.matches(d, filter));
    if (idx === -1) {
      if (options.upsert) {
        const newDoc = { ...filter, ...(update.$set ?? {}) } as T;
        this.docs.push(newDoc);
        return { matchedCount: 0, modifiedCount: 1, upsertedId: (newDoc as any).id };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }

    const current = this.docs[idx]!;
    if (update.$set) {
      Object.assign(current, JSON.parse(JSON.stringify(update.$set)));
    }
    if (update.$inc) {
      for (const [key, incVal] of Object.entries(update.$inc)) {
        (current as any)[key] = ((current as any)[key] ?? 0) + incVal;
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteMany(filter: Record<string, any>): Promise<{ deletedCount: number }> {
    const initial = this.docs.length;
    this.docs = this.docs.filter((d) => !this.matches(d, filter));
    return { deletedCount: initial - this.docs.length };
  }

  async countDocuments(filter: Record<string, any> = {}): Promise<number> {
    return this.docs.filter((d) => this.matches(d, filter)).length;
  }

  clear() {
    this.docs = [];
  }
}

const memoryCollections = new Map<string, InMemoryCollection<any>>();

function getMemoryCollection<T extends Document>(name: string): InMemoryCollection<T> {
  if (!memoryCollections.has(name)) {
    memoryCollections.set(name, new InMemoryCollection<T>(name));
  }
  return memoryCollections.get(name) as InMemoryCollection<T>;
}

export function resetMemoryDb(): void {
  for (const coll of memoryCollections.values()) {
    coll.clear();
  }
}

export async function getCollection<T extends Document>(name: string): Promise<BaseCollection<T>> {
  if (isConnected && db) {
    try {
      return db.collection<T>(name) as unknown as BaseCollection<T>;
    } catch {
      // Fallback if driver errors
    }
  }
  return getMemoryCollection<T>(name);
}

export async function connectMongo(): Promise<Db | null> {
  if (isConnected && db) return db;
  const uri = env.MONGODB_URI || env.DATABASE_URL;
  if (!uri || env.NODE_ENV === "test") {
    return null;
  }
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    db = client.db();
    isConnected = true;
    console.log(`Connected to MongoDB: ${db.databaseName}`);
    return db;
  } catch (err) {
    console.warn("MongoDB connection failed or unavailable, using in-memory collection store:", (err as Error).message);
    isConnected = false;
    return null;
  }
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    isConnected = false;
  }
}
