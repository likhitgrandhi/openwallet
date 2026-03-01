import { db, type Subscription, type Transaction } from '../db/schema';

const MONTHLY_DAYS = 30;
const ANNUAL_DAYS = 365;
const WEEKLY_DAYS = 7;
const TOLERANCE_DAYS = 7; // ±7 days for monthly/weekly
const ANNUAL_TOLERANCE = 15; // ±15 days for annual
const AMOUNT_VARIANCE_MAX = 0.12; // 12% variance allowed

// Well-known cancel URLs seeded for common services
const CANCEL_URLS: Record<string, string> = {
  netflix: 'https://www.netflix.com/cancelplan',
  spotify: 'https://www.spotify.com/account/subscription/',
  hotstar: 'https://www.hotstar.com/in/subscribe',
  'disney+': 'https://www.hotstar.com/in/subscribe',
  amazon: 'https://www.amazon.in/mc/pipelines/cancellation',
  'youtube premium': 'https://www.youtube.com/paid_memberships',
  'google one': 'https://one.google.com/about',
  microsoft: 'https://account.microsoft.com/services/',
  adobe: 'https://account.adobe.com/plans',
  notion: 'https://www.notion.so/my-account',
  dropbox: 'https://www.dropbox.com/account/plan',
  zoom: 'https://zoom.us/billing',
  github: 'https://github.com/settings/billing',
  coursera: 'https://www.coursera.org/account-profile',
  linkedin: 'https://www.linkedin.com/premium/manage',
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function findCancelUrl(merchant: string): string | undefined {
  const lower = merchant.toLowerCase();
  for (const [key, url] of Object.entries(CANCEL_URLS)) {
    if (lower.includes(key)) return url;
  }
  return undefined;
}

export async function detectSubscriptions(): Promise<Subscription[]> {
  const transactions = await db.transactions
    .where('type')
    .equals('debit')
    .sortBy('date');

  // Group by normalised merchant name
  const byMerchant: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const key = tx.merchant.toLowerCase().trim();
    if (!byMerchant[key]) byMerchant[key] = [];
    byMerchant[key].push(tx);
  }

  const detected: Subscription[] = [];

  for (const [, txs] of Object.entries(byMerchant)) {
    if (txs.length < 2) continue;

    const sorted = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Inter-transaction deltas in days
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const ms = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
      deltas.push(ms / (1000 * 60 * 60 * 24));
    }

    const med = median(deltas);

    // Check amount consistency
    const amounts = sorted.map(t => t.amount);
    const minAmt = Math.min(...amounts);
    const maxAmt = Math.max(...amounts);
    const variance = minAmt > 0 ? (maxAmt - minAmt) / minAmt : 1;
    if (variance > AMOUNT_VARIANCE_MAX) continue;

    let frequency: Subscription['frequency'] | null = null;
    if (Math.abs(med - WEEKLY_DAYS) <= TOLERANCE_DAYS) frequency = 'weekly';
    else if (Math.abs(med - MONTHLY_DAYS) <= TOLERANCE_DAYS) frequency = 'monthly';
    else if (Math.abs(med - ANNUAL_DAYS) <= ANNUAL_TOLERANCE) frequency = 'annual';

    if (!frequency) continue;

    const lastTx = sorted[sorted.length - 1];
    const avgAmount = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length);
    const nextRenewal = new Date(new Date(lastTx.date).getTime() + med * 24 * 60 * 60 * 1000);

    detected.push({
      id: `sub-auto-${lastTx.merchant.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${lastTx.id.slice(-6)}`,
      merchant: lastTx.merchant,
      amount: avgAmount,
      currency: 'INR',
      frequency,
      nextRenewal,
      cancelUrl: findCancelUrl(lastTx.merchant),
      isActive: nextRenewal > new Date(),
      isManual: false,
      detectedFrom: sorted.map(t => t.id),
    });
  }

  // Upsert into DB (don't overwrite manually added ones)
  for (const sub of detected) {
    const existing = await db.subscriptions.get(sub.id);
    if (!existing) await db.subscriptions.add(sub);
    else await db.subscriptions.update(sub.id, { nextRenewal: sub.nextRenewal, isActive: sub.isActive });
  }

  return detected;
}
