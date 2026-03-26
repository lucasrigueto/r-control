import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    const completion = await groq.chat.completions.create({
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
    const file = new File([audioBuffer], "audio.ogg", { type: mimeType });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: "pt",
    });

    return transcription.text;
  } catch {
    return null;
  }
}

export async function analyzeReceiptImage(
  imageBase64: string
): Promise<ParsedTransaction | null> {
  const today = new Date().toISOString().split("T")[0];

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
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
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();
    const json = JSON.parse(clean);
    if (json.error) return null;
    return json as ParsedTransaction;
  } catch {
    return null;
  }
}
