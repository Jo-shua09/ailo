import type { SpendPolicy } from "@ailo/core";
import { getCollection } from "../../db/mongo";
import type { Mandate } from "./mandates.dto";

// Read-latest-then-insert must be one step, or two saves can both take the same version number.
// shortcut: in-process lock, correct for one API process; with several instances add a UNIQUE index on version.
let saveLock: Promise<unknown> = Promise.resolve();
function exclusively<T>(work: () => Promise<T>): Promise<T> {
  const run = saveLock.then(work, work);
  saveLock = run.catch(() => undefined);
  return run;
}

const strip = ({ _id, ...mandate }: Mandate & { _id?: unknown }): Mandate => mandate;

export class MongoMandatesRepository {
  private coll = () => getCollection<Mandate>("mandates");

  save(english_rule: string, policy: SpendPolicy): Promise<Mandate> {
    return exclusively(async () => {
      const mandate = { version: ((await this.latest())?.version ?? 0) + 1, english_rule, policy, created_at: new Date().toISOString() };
      await (await this.coll()).insertOne({ ...mandate });
      return mandate;
    });
  }

  async list(): Promise<Mandate[]> {
    return (await (await this.coll()).find().sort({ version: -1 }).toArray()).map(strip);
  }

  async latest(): Promise<Mandate | undefined> {
    return (await this.list())[0];
  }
}

export const mandatesRepository = new MongoMandatesRepository();
