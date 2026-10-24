import { getCollection, type BaseCollection } from "../../db/mongo";

export interface WebhookRecord {
  event: string;
  reference: string;
  received_at: string;
}

export class WebhooksRepository {
  private async getWebhooksCollection(): Promise<BaseCollection<WebhookRecord>> {
    return getCollection<WebhookRecord>("webhooks");
  }

  async recordEvent(event: string, reference: string): Promise<boolean> {
    const coll = await this.getWebhooksCollection();
    const existing = await coll.findOne({ event, reference });
    if (existing) {
      return false; // Duplicate event!
    }

    await coll.insertOne({
      event,
      reference,
      received_at: new Date().toISOString(),
    });
    return true;
  }
}

export const webhooksRepository = new WebhooksRepository();
