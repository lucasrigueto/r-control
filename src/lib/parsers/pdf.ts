import type { ParsedRow } from "./csv";

export async function parsePDF(buffer: Buffer): Promise<ParsedRow[]> {
  // Dynamically import pdf-parse (CommonJS module, no default export in ESM context)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  const text: string = data.text;

  if (!text || text.trim().length < 20) {
    throw new Error("Não foi possível extrair texto do PDF.");
  }

  // Use Groq to parse the extracted text
  const Groq = (await import("groq-sdk")).default;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const today = new Date().toISOString().split("T")[0];

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `Você é um parser de extratos bancários e faturas de cartão de crédito.

Extraia TODAS as transações do texto abaixo.
Retorne APENAS um JSON array válido, sem markdown, sem explicações:
[{"date": "YYYY-MM-DD", "description": "string", "amount": number, "type": "INCOME" | "EXPENSE"}]

REGRAS:
- amount é sempre positivo
- type é "EXPENSE" para débitos/compras/pagamentos, "INCOME" para créditos/devoluções/depósitos
- Se a data não tiver ano, use o ano de hoje (${today.slice(0, 4)})
- Se não encontrar transações, retorne: []
- Ignore linhas de total, saldo, cabeçalho
`,
      },
      {
        role: "user",
        content: `TEXTO DO EXTRATO/FATURA:\n\n${text.slice(0, 8000)}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = completion.choices[0].message.content ?? "";
  const clean = content.replace(/```json\n?|\n?```/g, "").trim();

  let parsed: Array<{ date: string; description: string; amount: number; type: string }>;
  try {
    parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) return [];
  } catch {
    throw new Error("Groq retornou resposta mal-formatada. Tente novamente.");
  }

  return parsed
    .filter((r) => r.amount > 0 && r.description && r.date)
    .map((r) => ({
      date: r.date,
      description: r.description.trim(),
      amount: Math.abs(r.amount),
      type: r.type === "INCOME" ? "INCOME" : "EXPENSE",
    }));
}
