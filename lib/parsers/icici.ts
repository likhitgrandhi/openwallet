import type { BankParser, ParsedTransaction } from './types';
import { extractAmount, extractDate, extractMerchant, extractAccountNumber } from './types';
import type { EmailMessage } from '../gmail/client';

export class IciciParser implements BankParser {
  bankName = 'ICICI Bank';

  canParse(email: EmailMessage): boolean {
    return /icicibank\.com/i.test(email.from);
  }

  parse(email: EmailMessage): ParsedTransaction | null {
    const text = (email.body || email.snippet).replace(/\n+/g, ' ');

    const amount = extractAmount(text);
    if (!amount) return null;

    const isDebit = /debit(?:ed)?|deducted|paid|charged/i.test(text);
    const isCredit = /credit(?:ed)?|received|deposited|refund/i.test(text);
    if (!isDebit && !isCredit) return null;

    const type: 'debit' | 'credit' = isDebit ? 'debit' : 'credit';
    const date = extractDate(text, email.date);
    const merchant = extractMerchant(text, 'ICICI Transaction');
    const account = extractAccountNumber(text, 'ICICI');

    return { date, amount, type, merchant, category: '', account, bank: this.bankName, notes: '' };
  }
}
