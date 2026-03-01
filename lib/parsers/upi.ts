import type { BankParser, ParsedTransaction } from './types';
import { extractAmount, extractDate } from './types';
import type { EmailMessage } from '../gmail/client';

// Generic UPI/wallet parser — catches IndusInd, Yes Bank, Paytm, Amazon Pay, GPay alerts
export class UpiParser implements BankParser {
  bankName = 'UPI / Wallet';

  canParse(email: EmailMessage): boolean {
    return (
      /indusind\.com|yesbank\.in|paytm\.com|amazon\.in|google\.com/i.test(email.from) ||
      /upi|gpay|phonepe|paytm|amazon pay/i.test(email.subject)
    );
  }

  parse(email: EmailMessage): ParsedTransaction | null {
    const text = (email.body || email.snippet).replace(/\n+/g, ' ');

    const amount = extractAmount(text);
    if (!amount) return null;

    const isDebit = /debit(?:ed)?|paid|sent|transferred out|withdrawn/i.test(text);
    const isCredit = /credit(?:ed)?|received|money added|transferred in/i.test(text);
    if (!isDebit && !isCredit) return null;

    const type: 'debit' | 'credit' = isDebit ? 'debit' : 'credit';
    const date = extractDate(text, email.date);

    // UPI transactions often have VPA in the text; use as merchant fallback
    const merchantMatch =
      text.match(/(?:to|from|paid to|received from)\s+([A-Za-z0-9][A-Za-z0-9\s\-&'.]{2,50}?)(?:\s+via|\s+using|\s+on|\.|,|\n|$)/i) ||
      text.match(/VPA[:\s]+([a-z0-9._%+\-]+@[a-z]+)/i);

    const merchant = merchantMatch ? merchantMatch[1].trim() : 'UPI Transaction';

    // Determine bank from sender
    const from = email.from.toLowerCase();
    let bank = 'UPI';
    if (from.includes('paytm')) bank = 'Paytm';
    else if (from.includes('amazon')) bank = 'Amazon Pay';
    else if (from.includes('indusind')) bank = 'IndusInd Bank';
    else if (from.includes('yesbank')) bank = 'Yes Bank';
    else if (from.includes('google')) bank = 'Google Pay';

    const accountMatch = text.match(/(?:A\/C|account)[^0-9]*(\d{4})/i);
    const account = accountMatch ? `${bank} ••${accountMatch[1]}` : bank;

    return { date, amount, type, merchant, category: '', account, bank, notes: '' };
  }
}
