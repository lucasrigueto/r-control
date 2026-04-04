import Papa from "papaparse";

export interface ParsedRow {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // always positive
  type: "INCOME" | "EXPENSE";
  categoryId?: string | null;
  categoryName?: string | null;
  isDuplicate?: boolean;
}

type Bank = "nubank" | "inter" | "generic";

function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `20${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return trimmed;
}

function normalizeAmount(raw: string): number {
  const clean = raw.trim().replace(/\s/g, "");
  if (/\d,\d{2}$/.test(clean)) {
    return Math.abs(parseFloat(clean.replace(/\./g, "").replace(",", ".")));
  }
  return Math.abs(parseFloat(clean.replace(",", "")));
}

function detectBank(headers: string[]): Bank {
  const lower = headers.map((h) => h.toLowerCase().trim());
  if (lower.includes("title") && lower.includes("amount") && lower.includes("category")) {
    return "nubank";
  }
  if (lower.some((h) => h.includes("lançamento") || h.includes("lancamento"))) {
    return "inter";
  }
  return "generic";
}

function parseNubank(rows: Record<string, string>[]): ParsedRow[] {
  return rows
    .filter((r) => r.date)
    .map((r): ParsedRow => {
      const rawAmount = r.amount ?? "0";
      const amount = normalizeAmount(rawAmount);
      const isNegativeInFile = rawAmount.trim().startsWith("-");
      return {
        date: normalizeDate(r.date ?? ""),
        description: (r.title ?? r.memo ?? "").trim(),
        amount,
        type: isNegativeInFile ? "INCOME" : "EXPENSE",
      };
    })
    .filter((r) => r.amount > 0);
}

function parseInter(rows: Record<string, string>[]): ParsedRow[] {
  return rows
    .filter((r) => Object.keys(r).some((k) => k.toLowerCase().includes("data")))
    .map((r): ParsedRow => {
      const dateKey = Object.keys(r).find((k) => k.toLowerCase().includes("data")) ?? "";
      const descKey = Object.keys(r).find((k) => k.toLowerCase().includes("descri")) ?? "";
      const valueKey = Object.keys(r).find((k) => k.toLowerCase().includes("valor")) ?? "";
      const typeKey = Object.keys(r).find((k) => k.toLowerCase().includes("tipo")) ?? "";

      const rawAmount = r[valueKey] ?? "0";
      const amount = normalizeAmount(rawAmount);
      const tipoValue = (r[typeKey] ?? "").toLowerCase();
      const isCredit =
        tipoValue.includes("crédito") ||
        tipoValue.includes("credito") ||
        tipoValue.includes("entrada") ||
        tipoValue.includes("pix recebido") ||
        tipoValue.includes("ted recebida");

      return {
        date: normalizeDate(r[dateKey] ?? ""),
        description: (r[descKey] ?? "").trim(),
        amount,
        type: isCredit ? "INCOME" : "EXPENSE",
      };
    })
    .filter((r) => r.amount > 0 && r.description);
}

function parseGeneric(rows: Record<string, string>[]): ParsedRow[] {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);

  const dateKey = headers.find((h) => /date|data|dt/i.test(h)) ?? headers[0];
  const descKey = headers.find((h) => /desc|memo|histor|title|nome/i.test(h)) ?? headers[1];
  const amountKey = headers.find((h) => /valor|amount|value|debito|credito|vlr/i.test(h)) ?? headers[2];

  return rows
    .map((r): ParsedRow => {
      const rawAmount = r[amountKey] ?? "0";
      const amount = normalizeAmount(rawAmount);
      const isNegative = rawAmount.trim().startsWith("-");
      return {
        date: normalizeDate(r[dateKey] ?? ""),
        description: (r[descKey] ?? "").trim(),
        amount,
        type: isNegative ? "EXPENSE" : "INCOME",
      };
    })
    .filter((r) => r.amount > 0 && r.description);
}

export function parseCSV(text: string): { rows: ParsedRow[]; bank: Bank } {
  // Strip BOM if present
  const clean = text.replace(/^\uFEFF/, "");

  // papaparse.parse with a string returns ParseResult synchronously
  const result = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length && !result.data.length) {
    throw new Error("Falha ao parsear CSV: " + result.errors[0].message);
  }

  const headers = result.meta.fields ?? [];
  const bank = detectBank(headers);

  let rows: ParsedRow[];
  if (bank === "nubank") rows = parseNubank(result.data);
  else if (bank === "inter") rows = parseInter(result.data);
  else rows = parseGeneric(result.data);

  return { rows, bank };
}
