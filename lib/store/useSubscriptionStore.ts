'use client';

import { create } from 'zustand';
import { Subscription } from '../db/schema';
import { SEED_SUBSCRIPTIONS } from '../data/seed';
import * as subDB from '../db/subscriptions';

interface SubscriptionStore {
  subscriptions: Subscription[];
  isLoaded: boolean;
  loadSeedData: () => void;
  loadFromDB: () => Promise<void>;
  addSubscription: (sub: Omit<Subscription, 'id'>, persist?: boolean) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>, persist?: boolean) => void;
  deleteSubscription: (id: string, persist?: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  subscriptions: [],
  isLoaded: false,

  loadSeedData: () => {
    set({ subscriptions: SEED_SUBSCRIPTIONS, isLoaded: true });
  },

  loadFromDB: async () => {
    const subs = await subDB.getAllSubscriptions();
    set({ subscriptions: subs, isLoaded: true });
  },

  addSubscription: (sub, persist = false) => {
    const newSub: Subscription = { ...sub, id: `sub-${Date.now()}` };
    set((s) => ({ subscriptions: [...s.subscriptions, newSub] }));
    if (persist) subDB.addSubscription(sub).catch(console.error);
  },

  updateSubscription: (id, updates, persist = false) => {
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) =>
        sub.id === id ? { ...sub, ...updates } : sub
      ),
    }));
    if (persist) subDB.updateSubscription(id, updates).catch(console.error);
  },

  deleteSubscription: (id, persist = false) => {
    set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.id !== id) }));
    if (persist) subDB.deleteSubscription(id).catch(console.error);
  },
}));
