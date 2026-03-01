import type { Transaction } from '../db/schema';
import type { EmailMessage } from '../gmail/client';

export type ParsedTransaction = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt' | 'emailId' | 'rawText' | 'merchantRaw' | 'isRecurring'
>;

export interface BankParser {
  bankName: string;
  canParse(email: EmailMessage): boolean;
  parse(email: EmailMessage): ParsedTransaction | null;
}

// Shared helpers re-used by every parser
export function extractAmount(text: string): number | null {
  const match = text.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(amount) || amount <= 0 ? null : amount;
}

export function extractDate(text: string, fallback: string): Date {
  // DD/MM/YY or DD-MM-YY or DD/MM/YYYY
  const dmyMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const month = parseInt(dmyMatch[2]) - 1;
    const rawYear = parseInt(dmyMatch[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // DD MMM YYYY
  const dMyMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[,\s]+(\d{4})/i);
  if (dMyMatch) {
    const d = new Date(`${dMyMatch[1]} ${dMyMatch[2]} ${dMyMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date(fallback) || new Date();
}

export function normalizeMerchant(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function extractMerchant(text: string, fallback: string): string {
  const patterns = [
    /(?:at|to|for|towards|Info:)\s+([A-Za-z0-9][A-Za-z0-9\s\-&'.\/]{2,50}?)(?:\s+on\s|\s+via\s|\s+Ref|\.|,|\n|$)/i,
    /(?:UPI|NEFT|IMPS|RTGS)[:\-\s]+([A-Za-z0-9][A-Za-z0-9\s\-&'.]{2,40}?)(?:\s+on\s|\.|,|\n|$)/i,
    /VPA[:\s]+([a-z0-9.]+@[a-z]+)/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const merchant = m[1].trim();
      if (merchant.length > 2 && merchant.length < 80) return normalizeMerchant(merchant);
    }
  }
  return fallback;
}

export function extractAccountNumber(text: string, bankName: string): string {
  const match = text.match(/(?:[Aa]\/[Cc]|[Aa]ccount)[^0-9]*(?:XX+|x+)?(\d{4})/);
  if (match) return `${bankName} ••${match[1]}`;
  return bankName;
}
