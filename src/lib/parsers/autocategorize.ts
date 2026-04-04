import type { ParsedRow } from "./csv";
import Groq from "groq-sdk";

interface Category {
  id: string;
  name: string;
  type: string;
}

export async function autocategorize(
  rows: ParsedRow[],
  categories: Category[]
): Promise<ParsedRow[]> {
  if (!rows.length || !categories.length) return rows;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Only send descriptions — no sensitive data
  const descriptions = rows.map((r) => r.description);
  const catList = categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }));

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `Você é um categorizador de transações financeiras brasileiras.

Dado uma lista de descrições de transações e uma lista de categorias disponíveis, retorne um JSON object mapeando cada descrição ao categoryId mais adequado.

Categorias disponíveis:
${JSON.stringify(catList)}

REGRAS:
- Retorne APENAS JSON válido, sem markdown
- Formato: {"DESCRIÇÃO EXATA": "categoryId"}
- Use o categoryId exato da lista
- Se não souber categorizar, use null
- Considere o tipo: EXPENSE vai em categorias EXPENSE ou BOTH, INCOME vai em categorias INCOME ou BOTH
`,
        },
        {
          role: "user",
          content: JSON.stringify(descriptions),
        },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const content = completion.choices[0].message.content ?? "";
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();
    const mapping: Record<string, string | null> = JSON.parse(clean);

    return rows.map((row) => ({
      ...row,
      categoryId: mapping[row.description] ?? null,
      categoryName:
        categories.find((c) => c.id === mapping[row.description])?.name ??
        null,
    }));
  } catch {
    // If Groq fails, return rows without categories (don't block import)
    return rows;
  }
}
