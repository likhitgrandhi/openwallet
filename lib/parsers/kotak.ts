import type { BankParser, ParsedTransaction } from './types';
import { extractAmount, extractDate, extractMerchant, extractAccountNumber } from './types';
import type { EmailMessage } from '../gmail/client';

export class KotakParser implements BankParser {
  bankName = 'Kotak Bank';

  canParse(email: EmailMessage): boolean {
    return /kotak\.com/i.test(email.from);
  }

  parse(email: EmailMessage): ParsedTransaction | null {
    const text = (email.body || email.snippet).replace(/\n+/g, ' ');

    const amount = extractAmount(text);
    if (!amount) return null;

    const isDebit = /debit(?:ed)?|withdrawn|paid/i.test(text);
    const isCredit = /credit(?:ed)?|deposited|received/i.test(text);
    if (!isDebit && !isCredit) return null;

    const type: 'debit' | 'credit' = isDebit ? 'debit' : 'credit';
    const date = extractDate(text, email.date);
    const merchant = extractMerchant(text, 'Kotak Transaction');
    const account = extractAccountNumber(text, 'Kotak');

    return { date, amount, type, merchant, category: '', account, bank: this.bankName, notes: '' };
  }
}
