import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';

export interface ParsedTransaction {
  merchant: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface SkippedItem {
  text: string;
  reason: string;
}

export interface ChatResponse {
  transactions: ParsedTransaction[];
  skipped: SkippedItem[];
  message: string;
}

const SYSTEM_PROMPT = (categories: string[], today: string) => `You are a financial transaction parser for an Indian personal finance app (amounts in INR ₹).

Today's date is ${today}.

Available categories: ${categories.join(', ')}

When the user describes one or more transactions in natural language, extract each transaction and return ONLY a valid JSON object.

Rules:
- "spent", "paid", "bought", "debited" → type: "debit"
- "received", "got", "credited", "earned", "salary" → type: "credit"  
- "transferred to savings/FD/PPF/mutual fund/investment" → type: "debit", category: "Savings" or "Investments"
- Infer date from relative terms: "today" = ${today}, "yesterday", "last Monday", etc.
- For amounts: "1k" = 1000, "1.5k" = 1500, "1L" = 100000
- tags: 2-5 lowercase keyword tags relevant to the transaction
- If a sentence is not a transaction (e.g. a question), add it to "skipped"
- confidence: "high" if all fields clear, "medium" if some guessed, "low" if very uncertain

Respond ONLY with this JSON structure, no other text:
{
  "transactions": [
    {
      "merchant": "string",
      "amount": number,
      "type": "debit" | "credit",
      "category": "one of the available categories",
      "date": "YYYY-MM-DD",
      "notes": "optional string",
      "tags": ["tag1", "tag2"],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "skipped": [
    { "text": "original text", "reason": "why it was skipped" }
  ]
}`;

export async function POST(req: NextRequest) {
  // Require either a real session or demo_mode cookie
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const isDemoMode = cookieStore.get('demo_mode')?.value === '1';
  if (!session && !isDemoMode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey || apiKey === 'your_moonshot_api_key_here') {
    return NextResponse.json(
      { error: 'Moonshot API key not configured. Add MOONSHOT_API_KEY to .env.local.' },
      { status: 503 }
    );
  }

  const model = process.env.MOONSHOT_MODEL || 'kimi-k2.5';
  const baseUrl = (process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1').replace(/\/$/, '');

  let body: { message: string; categories: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { message, categories } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT(categories, today) },
          { role: 'user', content: message },
        ],
        // kimi-k2.5: temperature must be exactly 1.0 (thinking) or omitted for non-thinking (uses 0.6)
        // Disable thinking for fast, deterministic JSON output
        thinking: { type: 'disabled' },
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Moonshot API error [${response.status}]:`, errText);
      let userMessage = `AI service error (${response.status})`;
      if (response.status === 401) {
        userMessage = `Invalid API key or wrong base URL (${baseUrl}). Check MOONSHOT_API_KEY and MOONSHOT_BASE_URL in .env.local.`;
      } else if (response.status === 403) {
        userMessage = `Model "${model}" not accessible. Check MOONSHOT_MODEL in .env.local.`;
      } else if (response.status === 429) {
        userMessage = 'Rate limit reached. Please wait a moment and try again.';
      }
      return NextResponse.json({ error: userMessage }, { status: 502 });
    }

    const data = await response.json();
    const rawContent: string = data.choices?.[0]?.message?.content ?? '';

    // Extract JSON from the response (strip markdown fences if present)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Could not parse AI response', raw: rawContent },
        { status: 422 }
      );
    }

    const parsed: ChatResponse = JSON.parse(jsonMatch[0]);

    // Validate and sanitise transactions
    const validCategories = new Set(categories);
    const transactions: ParsedTransaction[] = (parsed.transactions ?? []).map((t) => ({
      merchant: String(t.merchant || 'Unknown').trim(),
      amount: Math.abs(Number(t.amount) || 0),
      type: t.type === 'credit' ? 'credit' : 'debit',
      category: validCategories.has(t.category) ? t.category : 'Other',
      date: t.date || today,
      notes: t.notes || undefined,
      tags: Array.isArray(t.tags) ? t.tags.slice(0, 5) : [],
      confidence: (['high', 'medium', 'low'] as const).includes(t.confidence) ? t.confidence : 'medium',
    }));

    const result: ChatResponse = {
      transactions,
      skipped: parsed.skipped ?? [],
      message: buildSummaryMessage(transactions, parsed.skipped ?? []),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('AI chat route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildSummaryMessage(txs: ParsedTransaction[], skipped: SkippedItem[]): string {
  if (txs.length === 0 && skipped.length === 0) return 'No transactions found.';
  const parts: string[] = [];
  if (txs.length > 0) parts.push(`Found ${txs.length} transaction${txs.length > 1 ? 's' : ''}`);
  if (skipped.length > 0) parts.push(`${skipped.length} item${skipped.length > 1 ? 's' : ''} skipped`);
  return parts.join(', ') + '.';
}
