import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { CATEGORIES } from '@/lib/data/seed';
import { heuristicPlan, normalizeAllocations, sanitizeCategoryBudgets } from '@/lib/plan/heuristics';
import type { PlanAllocations, PlanCategoryBudget, PlanLiability } from '@/lib/plan/types';

interface PlanRequestBody {
  month: string;
  income: number;
  liabilities: PlanLiability[];
  allocations: PlanAllocations;
  categoryBudgets: PlanCategoryBudget[];
  message: string;
}

interface PlanResponseBody {
  allocations: PlanAllocations;
  categoryBudgets: PlanCategoryBudget[];
  narrative: string;
  usedFallback: boolean;
}

const SYSTEM_PROMPT = `You are a financial planner for an Indian personal finance app.
You must return strict JSON only.

Goals:
- Recommend practical allocations across: Savings, Investments, Needs, Wants.
- Recommend per-category budgets only from this allowed list:
${CATEGORIES.join(', ')}
- Keep recommendations realistic and non-negative.
- Allocations should sum to 100.

Return ONLY:
{
  "allocations": {
    "savingsPct": number,
    "investmentsPct": number,
    "needsPct": number,
    "wantsPct": number
  },
  "categoryBudgets": [
    { "category": "string", "amount": number }
  ],
  "narrative": "short explanation"
}`;

function fallbackResponse(income: number, liabilities: PlanLiability[]): PlanResponseBody {
  const fallback = heuristicPlan(income, liabilities);
  return {
    allocations: fallback.allocations,
    categoryBudgets: fallback.categoryBudgets,
    narrative: 'Using a safe baseline plan based on your income and liabilities.',
    usedFallback: true,
  };
}

export async function POST(req: NextRequest) {
  // Require either a real session or demo_mode cookie
  const session = await auth.api.getSession({ headers: req.headers });
  const cookieStore = await cookies();
  const isDemoMode = cookieStore.get('demo_mode')?.value === '1';
  if (!session && !isDemoMode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PlanRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const month = String(body.month || '').trim();
  const income = Math.max(0, Number(body.income) || 0);
  const liabilities = Array.isArray(body.liabilities) ? body.liabilities : [];
  const message = String(body.message || '').trim();

  if (!month || !message) {
    return NextResponse.json({ error: 'month and message are required' }, { status: 400 });
  }

  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey || apiKey === 'your_moonshot_api_key_here') {
    return NextResponse.json(fallbackResponse(income, liabilities));
  }

  const model = process.env.MOONSHOT_MODEL || 'kimi-k2.5';
  const baseUrl = (process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1').replace(/\/$/, '');

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
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              month,
              income,
              liabilities,
              currentAllocations: body.allocations,
              currentCategoryBudgets: body.categoryBudgets,
              userMessage: message,
            }),
          },
        ],
        thinking: { type: 'disabled' },
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Planner API upstream error [${response.status}]`, errText);
      return NextResponse.json(fallbackResponse(income, liabilities));
    }

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(fallbackResponse(income, liabilities));
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      allocations?: PlanAllocations;
      categoryBudgets?: PlanCategoryBudget[];
      narrative?: string;
    };

    const fallback = heuristicPlan(income, liabilities);
    const allocations = normalizeAllocations(parsed.allocations ?? fallback.allocations);
    const sanitizedBudgets = sanitizeCategoryBudgets(parsed.categoryBudgets ?? fallback.categoryBudgets);
    const usedFallback = sanitizedBudgets.length === 0;
    const categoryBudgets = usedFallback ? fallback.categoryBudgets : sanitizedBudgets;

    return NextResponse.json({
      allocations,
      categoryBudgets,
      narrative: parsed.narrative?.trim() || (usedFallback
        ? 'I could not create valid category budgets, so I used a safe baseline plan.'
        : 'I updated your plan based on your message.'),
      usedFallback,
    } satisfies PlanResponseBody);
  } catch (error) {
    console.error('Planner route error', error);
    return NextResponse.json(fallbackResponse(income, liabilities));
  }
}
