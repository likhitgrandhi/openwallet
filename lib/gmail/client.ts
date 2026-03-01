export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
}

import { BANK_SOURCES, sendersForSources, ALL_SOURCE_IDS } from './sources';

// Default: all senders from all sources
const DEFAULT_SENDERS = sendersForSources(ALL_SOURCE_IDS);

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

function buildSenderQuery(senders: string[]): string {
  return senders.map(s => `from:${s}`).join(' OR ');
}

// Re-export for convenience
export { BANK_SOURCES, ALL_SOURCE_IDS };

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithBackoff(
  url: string,
  headers: Record<string, string>,
  retries = 4
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429 || res.status === 503) {
      await sleep(Math.pow(2, attempt) * 1200);
      continue;
    }
    return res;
  }
  throw new Error(`Gmail API still throttled after ${retries} retries`);
}

export async function estimateEmailCount(
  accessToken: string,
  afterDate?: Date,
  senders?: string[]
): Promise<number> {
  const query = buildQuery(afterDate, senders);
  const url = `${GMAIL_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=1`;
  const res = await fetchWithBackoff(url, authHeader(accessToken));
  if (!res.ok) return 0;
  const data = await res.json();
  return data.resultSizeEstimate ?? 0;
}

export async function* listTransactionEmails(
  accessToken: string,
  afterDate?: Date,
  onProgress?: (scanned: number, total: number) => void,
  senders?: string[]
): AsyncGenerator<EmailMessage> {
  const query = buildQuery(afterDate, senders);
  const total = await estimateEmailCount(accessToken, afterDate, senders);
  let pageToken: string | undefined;
  let scanned = 0;

  do {
    const url = new URL(`${GMAIL_BASE}/messages`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const listRes = await fetchWithBackoff(url.toString(), authHeader(accessToken));
    if (!listRes.ok) {
      throw new Error(`Gmail list failed: ${listRes.status} ${await listRes.text()}`);
    }

    const listData = await listRes.json();
    const messages: { id: string }[] = listData.messages ?? [];
    pageToken = listData.nextPageToken;

    // Fetch details in batches of 40 to respect rate limits
    for (let i = 0; i < messages.length; i += 40) {
      const batch = messages.slice(i, i + 40);
      const results = await Promise.allSettled(
        batch.map(m => fetchEmailDetails(accessToken, m.id))
      );

      for (const result of results) {
        scanned++;
        onProgress?.(scanned, total);
        if (result.status === 'fulfilled' && result.value) {
          yield result.value;
        }
      }

      // 100 ms breathing room between batches
      if (i + 40 < messages.length) await sleep(100);
    }
  } while (pageToken);
}

async function fetchEmailDetails(
  accessToken: string,
  messageId: string
): Promise<EmailMessage | null> {
  const url = `${GMAIL_BASE}/messages/${messageId}?format=full`;
  const res = await fetchWithBackoff(url, authHeader(accessToken));
  if (!res.ok) return null;

  const msg = await res.json();
  const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];

  const get = (name: string) =>
    headers.find(h => h.name.toLowerCase() === name)?.value ?? '';

  return {
    id: messageId,
    from: get('from'),
    subject: get('subject'),
    date: get('date'),
    snippet: msg.snippet ?? '',
    body: extractPlainText(msg.payload),
  };
}

function extractPlainText(payload: Record<string, unknown>): string {
  if (!payload) return '';

  // Direct plain text part
  if (payload.mimeType === 'text/plain') {
    const body = payload.body as { data?: string } | undefined;
    if (body?.data) return base64Decode(body.data);
  }

  const parts = payload.parts as Record<string, unknown>[] | undefined;
  if (parts) {
    // Prefer plain text parts
    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        const body = part.body as { data?: string } | undefined;
        if (body?.data) return base64Decode(body.data);
      }
    }
    // Fall back to HTML stripped
    for (const part of parts) {
      if (part.mimeType === 'text/html') {
        const body = part.body as { data?: string } | undefined;
        if (body?.data) {
          const html = base64Decode(body.data);
          return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    }
    // Recurse for multipart
    for (const part of parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }

  return '';
}

function base64Decode(encoded: string): string {
  // Gmail uses URL-safe base64
  const standard = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(standard);
}

function buildQuery(afterDate?: Date, senders?: string[]): string {
  const activeSenders = senders && senders.length > 0 ? senders : DEFAULT_SENDERS;
  const base = `(${buildSenderQuery(activeSenders)})`;
  if (!afterDate) return base;
  return `${base} after:${Math.floor(afterDate.getTime() / 1000)}`;
}

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
