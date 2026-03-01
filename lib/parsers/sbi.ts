import type { BankParser, ParsedTransaction } from './types';
import { extractAmount, extractDate, extractMerchant, extractAccountNumber } from './types';
import type { EmailMessage } from '../gmail/client';

export class SbiParser implements BankParser {
  bankName = 'SBI';

  canParse(email: EmailMessage): boolean {
    return /sbi\.co\.in/i.test(email.from);
  }

  parse(email: EmailMessage): ParsedTransaction | null {
    const text = (email.body || email.snippet).replace(/\n+/g, ' ');

    const amount = extractAmount(text);
    if (!amount) return null;

    // SBI patterns: "debited with Rs.", "credited with Rs."
    const isDebit = /debit(?:ed)?(?:\s+with)?|withdrawn|paid/i.test(text);
    const isCredit = /credit(?:ed)?(?:\s+with)?|received|deposited/i.test(text);
    if (!isDebit && !isCredit) return null;

    const type: 'debit' | 'credit' = isDebit ? 'debit' : 'credit';
    const date = extractDate(text, email.date);
    const merchant = extractMerchant(text, 'SBI Transaction');
    const account = extractAccountNumber(text, 'SBI');

    return { date, amount, type, merchant, category: '', account, bank: this.bankName, notes: '' };
  }
}
