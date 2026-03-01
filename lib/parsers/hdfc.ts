import type { BankParser, ParsedTransaction } from './types';
import { extractAmount, extractDate, extractMerchant, extractAccountNumber } from './types';
import type { EmailMessage } from '../gmail/client';

export class HdfcParser implements BankParser {
  bankName = 'HDFC Bank';

  canParse(email: EmailMessage): boolean {
    // Matches: hdfcbank.net, hdfcbank.com, hdfcbank.bank.in, and any future HDFC domains
    return /hdfcbank\./i.test(email.from);
  }

  parse(email: EmailMessage): ParsedTransaction | null {
    const text = (email.body || email.snippet).replace(/\n+/g, ' ');

    const amount = extractAmount(text);
    if (!amount) return null;

    // HDFC debit patterns: "debited", "spent", "deducted", "withdrawn"
    const isDebit = /debit(?:ed)?|spent|deducted|withdrawn|paid/i.test(text);
    // HDFC credit patterns: "credited", "received", "deposited", "refund"
    const isCredit = /credit(?:ed)?|received|deposited|refund/i.test(text);
    if (!isDebit && !isCredit) return null;

    const type: 'debit' | 'credit' = isDebit ? 'debit' : 'credit';
    const date = extractDate(text, email.date);
    const merchant = extractMerchant(text, 'HDFC Transaction');
    const account = extractAccountNumber(text, 'HDFC');

    return { date, amount, type, merchant, category: '', account, bank: this.bankName, notes: '' };
  }
}
