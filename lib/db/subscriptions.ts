import { db, type Subscription } from './schema';

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  return db.subscriptions.filter(s => s.isActive).toArray();
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  return db.subscriptions.toArray();
}

export async function addSubscription(sub: Omit<Subscription, 'id'>): Promise<Subscription> {
  const newSub: Subscription = {
    ...sub,
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  await db.subscriptions.add(newSub);
  return newSub;
}

export async function updateSubscription(id: string, updates: Partial<Subscription>): Promise<void> {
  await db.subscriptions.update(id, updates);
}

export async function deleteSubscription(id: string): Promise<void> {
  await db.subscriptions.delete(id);
}

export async function upsertSubscriptions(subs: Subscription[]): Promise<void> {
  await db.subscriptions.bulkPut(subs);
}

export async function getSubscriptionCount(): Promise<number> {
  return db.subscriptions.count();
}

export async function seedSubscriptions(subs: Subscription[]): Promise<void> {
  await db.subscriptions.bulkPut(subs);
}
