import type { Transaction } from '../db/schema';
import type { EmailMessage } from '../gmail/client';
import type { BankParser } from './types';
import { HdfcParser } from './hdfc';
import { IciciParser } from './icici';
import { SbiParser } from './sbi';
import { AxisParser } from './axis';
import { KotakParser } from './kotak';
import { UpiParser } from './upi';
import { categorize } from '../categorizer/rules';

const PARSERS: BankParser[] = [
  new HdfcParser(),
  new IciciParser(),
  new SbiParser(),
  new AxisParser(),
  new KotakParser(),
  new UpiParser(), // catch-all last
];

function deterministicId(emailId: string, amount: number, date: string, type: string): string {
  const raw = `${emailId}|${amount}|${date}|${type}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
    hash |= 0;
  }
  return `tx-${(hash >>> 0).toString(16)}`;
}

export function parseEmail(email: EmailMessage): Transaction | null {
  for (const parser of PARSERS) {
    if (!parser.canParse(email)) continue;
    const partial = parser.parse(email);
    if (!partial) continue;

    const category = partial.category || categorize(partial.merchant);
    const now = new Date();
    const dateStr = partial.date.toISOString().slice(0, 10);

    const tx: Transaction = {
      id: deterministicId(email.id, partial.amount, dateStr, partial.type),
      date: partial.date,
      amount: partial.amount,
      type: partial.type,
      merchant: partial.merchant,
      merchantRaw: partial.merchant,
      category,
      account: partial.account,
      bank: partial.bank,
      notes: partial.notes ?? '',
      emailId: email.id,
      rawText: (email.body || email.snippet).slice(0, 500),
      isRecurring: false,
      createdAt: now,
      updatedAt: now,
    };

    return tx;
  }
  return null;
}

export type { BankParser };
