import type { BankParser, ParsedTransaction } from './types';
import { extractAmount, extractDate, extractMerchant, extractAccountNumber } from './types';
import type { EmailMessage } from '../gmail/client';

export class AxisParser implements BankParser {
  bankName = 'Axis Bank';

  canParse(email: EmailMessage): boolean {
    return /axisbank\.com/i.test(email.from);
  }

  parse(email: EmailMessage): ParsedTransaction | null {
    const text = (email.body || email.snippet).replace(/\n+/g, ' ');

    const amount = extractAmount(text);
    if (!amount) return null;

    // Axis patterns: "INR X has been debited/credited from/to your account"
    const isDebit = /debit(?:ed)?|has been debited|withdrawn/i.test(text);
    const isCredit = /credit(?:ed)?|has been credited|deposited/i.test(text);
    if (!isDebit && !isCredit) return null;

    const type: 'debit' | 'credit' = isDebit ? 'debit' : 'credit';
    const date = extractDate(text, email.date);
    const merchant = extractMerchant(text, 'Axis Transaction');
    const account = extractAccountNumber(text, 'Axis');

    return { date, amount, type, merchant, category: '', account, bank: this.bankName, notes: '' };
  }
}
