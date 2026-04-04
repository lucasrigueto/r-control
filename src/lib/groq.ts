import Groq from "groq-sdk";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

export interface ParsedTransaction {
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  date: string;
  confidence: number;
}

export async function parseFinancialMessage(
  text: string
): Promise<ParsedTransaction | null> {
  const today = new Date().toISOString().split("T")[0];

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Você é um assistente financeiro. Extraia informações de transações financeiras de mensagens em português.
Retorne APENAS um JSON válido com os campos:
- description: string (nome do estabelecimento ou descrição curta)
- amount: number (valor em reais, positivo)
- type: "INCOME" ou "EXPENSE"
- category: string (uma dessas: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Assinaturas, Supermercado, Salário, Freelance, Investimentos, Outros)
- date: string (formato YYYY-MM-DD, use ${today} se não especificado)
- confidence: number (0-1)

Se a mensagem não for uma transação financeira, retorne: {"error": "not_a_transaction"}`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 256,
    });

    const content = completion.choices[0].message.content ?? "";
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(clean);
    if (json.error) return null;
    return json as ParsedTransaction;
  } catch {
    return null;
  }
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  try {
    const file = new File([audioBuffer.buffer as ArrayBuffer], "audio.ogg", { type: mimeType });

    const transcription = await getGroq().audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: "pt",
    });

    return transcription.text;
  } catch {
    return null;
  }
}

// ── Conversational financial query ───────────────────────────────────────────

interface QueryContext {
  monthIncome: number;
  monthExpense: number;
  month: string;
  topCategories: Array<{ name: string; icon: string; total: number }>;
  recentTx: Array<{ description: string; amount: number; type: string; date: string }>;
}

export async function handleFinancialQuery(
  text: string,
  context: QueryContext
): Promise<string | null> {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const balance = context.monthIncome - context.monthExpense;

  const ctx = [
    `Mês: ${context.month}`,
    `Receitas: ${fmt(context.monthIncome)}`,
    `Despesas: ${fmt(context.monthExpense)}`,
    `Saldo: ${fmt(balance)}`,
    `Top gastos: ${context.topCategories.map((c) => `${c.icon} ${c.name}: ${fmt(c.total)}`).join(", ")}`,
    `Recentes: ${context.recentTx.map((t) => `${t.description} (${fmt(t.amount)}, ${t.type === "INCOME" ? "receita" : "despesa"}, ${t.date})`).join("; ")}`,
  ].join("\n");

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Você é um assistente financeiro pessoal respondendo via WhatsApp.
Use os dados abaixo para responder perguntas do usuário de forma concisa.

DADOS:
${ctx}

REGRAS:
- Máximo 6 linhas
- Use emojis relevantes
- Formate valores em BRL
- Se a mensagem NÃO for uma pergunta financeira, retorne exatamente: {"not_financial":true}
- Se faltar dados, diga claramente`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const content = completion.choices[0].message.content?.trim() ?? "";
    if (content.includes('"not_financial"')) return null;
    return content || null;
  } catch {
    return null;
  }
}

// ── Receipt image analysis ────────────────────────────────────────────────────

export async function analyzeReceiptImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<ParsedTransaction | null> {
  const today = new Date().toISOString().split("T")[0];

  // Groq vision supports jpeg/png/webp — normalize webp to jpeg if needed
  const supportedMime = mimeType.includes("webp") ? "image/jpeg" : mimeType;

  try {
    const completion = await getGroq().chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${supportedMime};base64,${imageBase64}` },
            },
            {
              type: "text",
              text: `Analise este comprovante/cupom fiscal e extraia a transação financeira.
Retorne APENAS JSON com: description, amount (número positivo), type ("INCOME" ou "EXPENSE"), category (Alimentação/Transporte/Supermercado/etc), date (YYYY-MM-DD, use ${today} se não visível), confidence (0-1).
Se não for um comprovante financeiro, retorne: {"error": "not_a_receipt"}`,
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 256,
    });

    const content = completion.choices[0].message.content ?? "";
    console.log("[analyzeReceiptImage] raw response:", content.slice(0, 300));
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(clean);
    if (json.error) return null;
    return json as ParsedTransaction;
  } catch (err) {
    console.error("[analyzeReceiptImage] error:", err);
    return null;
  }
}
