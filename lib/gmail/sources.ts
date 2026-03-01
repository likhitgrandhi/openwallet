export interface BankSource {
  id: string;
  label: string;
  icon: string;       // emoji used in the dropdown
  senders: string[];  // Gmail from: patterns
}

export const BANK_SOURCES: BankSource[] = [
  {
    id: 'hdfc',
    label: 'HDFC Bank',
    icon: '🏦',
    // HDFC uses multiple sender domains — all variations covered
    senders: [
      'alerts@hdfcbank.net',
      'alerts@hdfcbank.com',
      'alerts@hdfcbank.bank.in',
      'hdfcbank.bank.in',        // domain-level catch-all for any subdomain
    ],
  },
  {
    id: 'icici',
    label: 'ICICI Bank',
    icon: '🏦',
    senders: ['alerts@icicibank.com'],
  },
  {
    id: 'sbi',
    label: 'SBI',
    icon: '🏦',
    senders: ['alerts@sbi.co.in', 'sbi.co.in'],
  },
  {
    id: 'axis',
    label: 'Axis Bank',
    icon: '🏦',
    senders: ['alerts@axisbank.com'],
  },
  {
    id: 'kotak',
    label: 'Kotak Bank',
    icon: '🏦',
    senders: ['alerts@kotak.com'],
  },
  {
    id: 'indusind',
    label: 'IndusInd Bank',
    icon: '🏦',
    senders: ['alerts@indusind.com'],
  },
  {
    id: 'yesbank',
    label: 'Yes Bank',
    icon: '🏦',
    senders: ['alerts@yesbank.in'],
  },
  {
    id: 'paytm',
    label: 'Paytm',
    icon: '📱',
    senders: ['noreply@paytm.com'],
  },
  {
    id: 'amazonpay',
    label: 'Amazon Pay',
    icon: '📦',
    senders: ['no-reply@amazonpay.in'],
  },
  {
    id: 'gpay',
    label: 'Google Pay',
    icon: '📱',
    senders: ['noreply@google.com', 'no-reply@google.com', 'gpay-noreply@google.com'],
  },
  {
    id: 'phonepe',
    label: 'PhonePe',
    icon: '📱',
    senders: ['noreply@phonepe.com', 'no-reply@phonepe.com', 'alerts@phonepe.com'],
  },
];

export const ALL_SOURCE_IDS = BANK_SOURCES.map(s => s.id);

/** Returns the flat list of senders for the given source IDs */
export function sendersForSources(sourceIds: string[]): string[] {
  return BANK_SOURCES
    .filter(s => sourceIds.includes(s.id))
    .flatMap(s => s.senders);
}
