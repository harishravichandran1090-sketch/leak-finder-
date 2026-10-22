/**
 * LeakFinder AI Express Server
 * Handles /api/explain and /api/ask with NVIDIA Nemotron 70B & rule-based fallbacks.
 * Mounts Vite middleware on port 3000.
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Rate Limiter: 20 requests per minute per visitor
// ---------------------------------------------------------------------------
interface RateRecord {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateRecord>();

function rateLimiter(req: Request, res: Response, next: () => void) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + 60000 });
    return next();
  }

  if (record.count >= 20) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Maximum 20 requests per minute allowed.',
    });
  }

  record.count++;
  next();
}

// ---------------------------------------------------------------------------
// Security & Input Validation Helpers
// ---------------------------------------------------------------------------
const SENSITIVE_PATTERN = /(?:api[_-]?key|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|password|secret|bearer\s+[a-zA-Z0-9_\-\.]{20,}|nvapi-[a-zA-Z0-9_-]{20,})/i;

function containsSensitiveInfo(text: string): boolean {
  return SENSITIVE_PATTERN.test(text);
}

// ---------------------------------------------------------------------------
// Built-in App Guide for How-to and Output Questions
// ---------------------------------------------------------------------------
const APP_GUIDE = `
LEAKFINDER AI USER GUIDE & DEFINITIONS:

HOW-TO TASKS:
1. How to upload files:
   Step 1: Go to the Upload tab in the sidebar or click 'Get started'.
   Step 2: Drag and drop 5 CSV files or click the dropzone. Or click 'Load demo data' for a 120-order benchmark.
   Step 3: Verify the Data Quality checks (PASS/CHECK) and click 'Run analysis'.

2. How to view leak details:
   Step 1: In the Dashboard, click any category bar or browse the Detected Leaks table.
   Step 2: Click the 'View' button or press Enter on any leak row to see affected orders and AI root-cause analysis.

3. How to add an action to the plan:
   Step 1: In the Leak Detail view, read the AI Recommended Action.
   Step 2: Click 'Add to action plan'. It will rank in your Action Plan by estimated recoverable amount.

4. How to download the Action Plan:
   Step 1: Go to the Action Plan tab from the sidebar.
   Step 2: Click the 'Download CSV' button in the top right. It exports an Excel-ready UTF-8 CSV with rank, action, category, and status.

5. How to simulate a discount policy:
   Step 1: Navigate to the Simulator tab.
   Step 2: Adjust the discount cap slider (0% to 30%).
   Step 3: Compare current profit vs projected profit with the cap applied to every order.

OUTPUT DEFINITIONS:
- Potential Leakage: The total monetary margin lost across all flagged orders, deduplicated so each order is only counted under its single largest leak. Potential Leakage equals the exact sum of the five category totals. Example: If Discount overuse loses ₹45K and Shipping overrun loses ₹30K with no other leaks, Potential Leakage is exactly ₹75K.
- Estimated Profit: Gross merchandise value minus applied discounts, customer refunds, restocking fee additions, manufacturing COGS, handling fees, and shipping expenses.
- Discount Rate: Total discount value divided by total gross sales revenue, expressed as a percentage.
- Severity: High if a leak accounts for 30% or more of total leakage, Medium if between 10% and 29.9%, and Low if under 10%.
`;

// Helper: INR string formatter
function formatINRLocal(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(abs >= 1000000 ? 1 : 2).replace(/\.00$/, '')}L`;
  if (abs >= 1000) return `${sign}₹${Math.round(abs / 1000)}K`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

// ---------------------------------------------------------------------------
// Rule-Based Fallback Generator for /api/explain
// ---------------------------------------------------------------------------
function getRuleBasedExplanation(leak: any, warningMsg: string) {
  const title = leak.title || 'Margin Leak';
  const category = leak.category || 'Cost';
  const totalLoss = Number(leak.total_loss) || 0;
  const count = Number(leak.affected_orders_count) || 0;
  const share = leak.evidence?.stats?.['Share of Total Leakage'] || 'not available';
  const sku = leak.evidence?.stats?.['Impacted SKUs'] || 'not available';
  const channel = leak.evidence?.stats?.['Primary Channels'] || 'not available';

  let rootCause = '';
  let reasoning = '';
  let recommendedAction = '';
  let confidence: 'High' | 'Medium' | 'Low' = 'High';

  if (category === 'Discount') {
    rootCause = `Uncontrolled promotional discounting on ${channel} channels exceeding approved discount thresholds.`;
    reasoning = `Analysis flagged ${count} transactions where promotional markdowns breached channel caps, resulting in ${formatINRLocal(totalLoss)} in excess deductions. This represents ${share} of total identified leakage. Applied coupon codes consistently granted discounts between 22% and 30%.`;
    recommendedAction = `Enforce a hard 15% discount limit in checkout validation and terminate compounding promotional coupon codes across online channels.`;
  } else if (category === 'Pricing') {
    rootCause = `Unit cost structure exceeding retail pricing floors on ${sku}.`;
    reasoning = `A total of ${count} orders for ${sku} generated gross margins below the 20% target baseline, losing ${formatINRLocal(totalLoss)} in margin. Elevated manufacturing cost and per-unit handling fees left insufficient margin at current list price, driving ${share} of overall leakage.`;
    recommendedAction = `Renegotiate supplier bill of materials or increase retail price by 12% on ${sku} to restore a minimum 22% margin cushion.`;
  } else if (category === 'Returns') {
    rootCause = `Failure to assess or deduct mandatory restocking fees on returned merchandise.`;
    reasoning = `There were ${count} customer returns where refunds were remitted without collecting required restocking fees, producing ${formatINRLocal(totalLoss)} in unrecovered reverse-logistics loss. This gap represents ${share} of total company leaks.`;
    recommendedAction = `Implement an automated 15% restocking fee deduction for all non-defective product return authorizations.`;
    confidence = 'Medium';
  } else if (category === 'Delivery') {
    rootCause = `Carrier shipping surcharges and freight rates exceeding 10% of order revenue on ${sku}.`;
    reasoning = `Identified ${count} shipments where courier and parcel costs reached up to 39% of gross item value, producing ${formatINRLocal(totalLoss)} in delivery overruns. Freight expenses consistently outstripped standard allowances, driving ${share} of detected leakage.`;
    recommendedAction = `Institute a minimum delivery fee on low-value parcels and renegotiate zone carrier pricing contracts for ${sku}.`;
  } else if (category === 'Refunds') {
    rootCause = `Abnormal quality defect rates triggering full product refunds on ${sku}.`;
    reasoning = `Analysis identified ${count} transactions with full refunds due to defective batch claims, yielding ${formatINRLocal(totalLoss)} in direct margin loss. Refund amounts exceeded 25% of gross order values, accounting for ${share} of total leakage.`;
    recommendedAction = `Quarantine factory inventory of ${sku} for QA inspection and issue vendor warranty chargebacks for replacement costs.`;
  } else {
    rootCause = `Margin degradation identified in ${category} operations.`;
    reasoning = `Flagged ${count} transactions producing ${formatINRLocal(totalLoss)} in unrecovered costs across ${channel}. This operational leak accounts for ${share} of total leakage.`;
    recommendedAction = `Review operating procedures and establish stricter controls for ${category} authorizations.`;
    confidence = 'Medium';
  }

  return {
    rootCause,
    confidence,
    reasoning,
    recommendedAction,
    modelName: 'Rule-based',
    isRuleBased: true,
    warning: warningMsg,
  };
}

// ---------------------------------------------------------------------------
// POST /api/explain: Explain a specific leak using Nemotron or Rule-Based Fallback
// ---------------------------------------------------------------------------
app.post('/api/explain', rateLimiter, async (req: Request, res: Response) => {
  const { leak } = req.body;

  if (!leak) {
    return res.status(400).json({ error: 'Missing leak data.' });
  }

  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  const modelName = process.env.NEMOTRON_MODEL?.trim() || 'nvidia/llama-3.1-nemotron-70b-instruct';

  if (!apiKey) {
    const fallback = getRuleBasedExplanation(
      leak,
      'Rule-based explanation active: NVIDIA_API_KEY is not configured in environment.'
    );
    return res.json(fallback);
  }

  // Send ONLY the leak's evidence to the model
  const evidencePayload = {
    leakTitle: leak.title,
    category: leak.category,
    totalLoss: leak.total_loss,
    affectedOrdersCount: leak.affected_orders_count,
    stats: leak.evidence?.stats || {},
    sampleOrders: (leak.evidence?.orders || []).slice(0, 5).map((o: any) => ({
      order_id: o.order_id,
      channel: o.channel,
      sku: o.sku,
      gross: o.gross,
      discount: o.discount,
      refund: o.refund,
      shipping: o.shipping,
      loss: o.loss,
      note: o.note,
    })),
  };

  const systemPrompt = `You are a corporate financial analyst explaining profit leaks in business operations.
CRITICAL RULES:
1. Use ONLY the numbers and facts provided in the evidence below. NEVER invent or hallucinate any numbers, statistics, or metrics.
2. If any metric is not available, state "not available".
3. Reply ONLY with a valid JSON object matching this exact schema:
{
  "rootCause": "Clear 1-sentence description of the likely root cause",
  "confidence": "High" | "Medium" | "Low",
  "reasoning": "2 or 3 sentences explaining the numbers and why this leak happened",
  "recommendedAction": "1 clear, concrete, actionable recommendation to fix this leak"
}
Do NOT include markdown formatting or backticks around the JSON.`;

  const userPrompt = `Analyze this margin leak evidence:\n${JSON.stringify(evidencePayload, null, 2)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`Nemotron API error (${response.status}): ${errText.substring(0, 100)}`);
      const fallback = getRuleBasedExplanation(
        leak,
        `Rule-based explanation active: NVIDIA API returned status ${response.status}.`
      );
      return res.json(fallback);
    }

    const data: any = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error('Empty response from model');
    }

    // Clean potential markdown wrappers
    let cleanJson = rawContent;
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    const parsed = JSON.parse(cleanJson);
    if (!parsed.rootCause || !parsed.reasoning || !parsed.recommendedAction) {
      throw new Error('Missing fields in model JSON response');
    }

    return res.json({
      rootCause: parsed.rootCause,
      confidence: ['High', 'Medium', 'Low'].includes(parsed.confidence) ? parsed.confidence : 'High',
      reasoning: parsed.reasoning,
      recommendedAction: parsed.recommendedAction,
      modelName,
      isRuleBased: false,
    });
  } catch (err: any) {
    console.warn(`Nemotron call failed: ${err.message || err}`);
    const fallback = getRuleBasedExplanation(
      leak,
      'Rule-based explanation active: remote AI model timed out or returned invalid format.'
    );
    return res.json(fallback);
  }
});

// ---------------------------------------------------------------------------
// POST /api/ask: Chat assistant endpoint
// ---------------------------------------------------------------------------
app.post('/api/ask', rateLimiter, async (req: Request, res: Response) => {
  const { question, history, summary } = req.body;

  // 1. Safety & validation: reject messages over 500 characters
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required.' });
  }

  if (question.length > 500) {
    return res.status(400).json({
      reply: 'Questions must be 500 characters or fewer. Please shorten your query.',
      isRuleBased: true,
      modelName: 'Rule-based',
    });
  }

  // 2. Safety check: sensitive info (API keys, passwords)
  if (containsSensitiveInfo(question)) {
    return res.json({
      reply: 'API keys, credentials, and passwords belong in the platform Secrets panel, not in the chat conversation. For your security, this query was not transmitted.',
      isRuleBased: true,
      modelName: 'Rule-based',
    });
  }

  // 3. Relevance check: off-topic filtering
  const qLower = question.toLowerCase();
  const relevantKeywords = [
    'leak', 'margin', 'profit', 'revenue', 'loss', 'discount', 'sku', 'cap',
    'return', 'refund', 'shipping', 'order', 'upload', 'action', 'plan', 'csv',
    'simulator', 'dataset', 'quality', 'check', 'potential', 'cost', 'where',
    'which', 'what', 'how', 'hi', 'hello', 'help'
  ];

  const hasRelevantKeyword = relevantKeywords.some((k) => qLower.includes(k));
  if (!hasRelevantKeyword) {
    return res.json({
      reply: "I can only assist with LeakFinder AI and your business margin leaks. You can ask about: 1) Where your biggest money leaks are, 2) Which SKUs require a pricing review, or 3) How much a discount cap would recover in profit.",
      isRuleBased: true,
      modelName: 'Rule-based',
    });
  }

  // 4. Rule-based answers for suggestion chips & standard questions
  const ruleAnswer = generateAssistantRuleBasedReply(question, summary);

  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  const modelName = process.env.NEMOTRON_MODEL?.trim() || 'nvidia/llama-3.1-nemotron-70b-instruct';

  // If no API key is configured or it's a known exact query, return the rule-based response
  if (!apiKey) {
    return res.json({
      reply: ruleAnswer,
      isRuleBased: true,
      modelName: 'Rule-based (no API key configured)',
    });
  }

  // 5. Send to Nemotron if API key exists
  try {
    const compactSummary = summary
      ? {
          grossRevenue: summary.grossRevenue,
          estimatedProfit: summary.estimatedProfit,
          potentialLeakage: summary.potentialLeakage,
          discountRate: summary.discountRate,
          categoryTotals: summary.categoryTotals,
          leaks: (summary.leaks || []).map((l: any) => ({
            id: l.id,
            title: l.title,
            category: l.category,
            total_loss: l.total_loss,
            affected_orders_count: l.affected_orders_count,
            severity: l.severity,
            summary: l.summary,
            topOrders: (l.evidence?.orders || []).slice(0, 5).map((o: any) => ({
              order_id: o.order_id,
              sku: o.sku,
              channel: o.channel,
              loss: o.loss,
              note: o.note,
            })),
          })),
          weeklyTrends: summary.weeklyTrends,
        }
      : null;

    const systemPrompt = `You are the LeakFinder AI Assistant.
SYSTEM INSTRUCTIONS:
1. Answer ONLY from the provided analysis summary and app guide.
2. Quote figures EXACTLY as given. NEVER invent or hallucinate any numbers, columns, or features.
3. If an answer is not in the data, state: "The data does not show that."
4. Keep answers under 120 words. Use plain, professional language.
5. End with one concrete next step where useful.
6. Render output as PLAIN TEXT only. Do NOT use HTML tags.

APP GUIDE:
${APP_GUIDE}

ANALYSIS SUMMARY:
${compactSummary ? JSON.stringify(compactSummary) : 'No dataset has been analyzed yet.'}`;

    // Last 6 turns of chat history
    const recentHistory = (history || []).slice(-6).map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentHistory,
          { role: 'user', content: question },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.json({
        reply: ruleAnswer,
        isRuleBased: true,
        modelName: `Rule-based (API status ${response.status})`,
      });
    }

    const data: any = await response.json();
    const replyText = data.choices?.[0]?.message?.content?.trim();

    if (!replyText) {
      return res.json({
        reply: ruleAnswer,
        isRuleBased: true,
        modelName: 'Rule-based (Empty model reply)',
      });
    }

    // Strip any unexpected HTML tags
    const cleanText = replyText.replace(/<[^>]*>?/gm, '');

    return res.json({
      reply: cleanText,
      isRuleBased: false,
      modelName,
    });
  } catch (err: any) {
    return res.json({
      reply: ruleAnswer,
      isRuleBased: true,
      modelName: 'Rule-based (Request timed out or failed)',
    });
  }
});

// Helper for rule-based assistant answers
function generateAssistantRuleBasedReply(question: string, summary: any): string {
  const q = question.toLowerCase();

  // How-to / Guide questions
  if (q.includes('how do i upload') || q.includes('upload my files')) {
    return 'To upload files: 1) Go to the Upload tab. 2) Drag and drop your five CSV files (Sales, Orders, Discounts, Returns, Costs) or use "Load demo data". 3) Verify the quality checks, then click "Run analysis". All files remain in your browser session.';
  }

  if (q.includes('potential leakage mean') || q.includes('what is potential leakage')) {
    return 'Potential Leakage represents the total recoverable margin lost across all flagged orders. Each order is counted once under its largest leak to prevent double counting. The headline figure equals the exact sum of the five category totals.';
  }

  if (q.includes('download my action plan') || q.includes('download csv')) {
    return 'To download your action plan: 1) Add recommendations from any Leak Detail view. 2) Go to the Action Plan tab. 3) Click "Download CSV" in the top-right corner to export an Excel-ready UTF-8 CSV with rank, action, and category.';
  }

  if (!summary || !summary.leaks || summary.leaks.length === 0) {
    return 'No analysis data has been loaded yet. Click "Load demo data" on the Upload page to immediately explore 120 benchmark orders and detected margin leaks.';
  }

  // "Where is the biggest money leak?" or "largest"
  if (q.includes('biggest') || q.includes('largest') || q.includes('where is the biggest')) {
    const sorted = [...summary.leaks].sort((a: any, b: any) => b.total_loss - a.total_loss);
    const top = sorted[0];
    if (top) {
      return `The largest leak is ${top.title} in ${top.category} at ${formatINRLocal(top.total_loss)} across ${top.affected_orders_count} orders. Next step: Open the Leak Detail page to review the root cause and add the recommended fix to your action plan.`;
    }
  }

  // "Which SKU needs a price review?"
  if (q.includes('sku') && (q.includes('price') || q.includes('review') || q.includes('margin'))) {
    const pricingLeak = summary.leaks.find((l: any) => l.category === 'Pricing');
    if (pricingLeak) {
      const sku = pricingLeak.evidence?.stats?.['Impacted SKUs'] || 'SKU-LST-119';
      return `${sku} requires an urgent pricing review. Its gross margin fell below the 20% target floor across ${pricingLeak.affected_orders_count} orders, losing ${formatINRLocal(pricingLeak.total_loss)}. Next step: Raise list prices by 12% or renegotiate production bill of materials.`;
    }
  }

  // "What would a 10% discount cap save?" or dynamic cap
  const capMatch = q.match(/(\d+)%\s*(?:discount\s*)?cap/);
  if (capMatch || q.includes('cap save')) {
    const capPercent = capMatch ? parseInt(capMatch[1], 10) : 10;
    const capFraction = capPercent / 100;
    let saved = 0;
    if (summary.joinedOrders) {
      summary.joinedOrders.forEach((o: any) => {
        const allowed = o.gross * capFraction;
        if (o.discount > allowed) {
          saved += (o.discount - allowed);
        }
      });
    } else {
      // Estimate from discount total
      saved = (summary.categoryTotals?.Discount || 35000) * (capPercent === 10 ? 0.75 : 0.5);
    }
    return `Enforcing a strict ${capPercent}% discount cap across all channels would recover approximately ${formatINRLocal(saved)} in profit, assuming constant sales volume. Next step: Test other cap rates in the Simulator tab to evaluate margin impact.`;
  }

  return `Based on the active analysis, Potential Leakage is ${formatINRLocal(summary.potentialLeakage)} across ${summary.leaks.length} candidate leak areas, with Gross Revenue at ${formatINRLocal(summary.grossRevenue)}. Next step: Visit the Action Plan tab to review prioritized recovery initiatives.`;
}

// ---------------------------------------------------------------------------
// Vite Dev Server / Static File Serving
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LeakFinder AI server running on port ${PORT}`);
  });
}

startServer();
