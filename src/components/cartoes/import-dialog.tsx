"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
}

interface ParsedRow {
  id: string;
  date: Date;
  description: string;
  amount: number;
  selected: boolean;
  categoryId: string;
}

interface ImportDialogProps {
  cardId: string;
  cardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (count: number) => void;
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  return (line.match(/;/g) || []).length > (line.match(/,/g) || []).length
    ? ";"
    : ",";
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(str: string): Date | null {
  const s = str.replace(/['"]/g, "").trim();
  if (!s) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10) + "T12:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY or DD/MM/YY
  const parts = s.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year =
      parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseAmount(str: string): number {
  let s = str.replace(/['"R$\s\u00a0]/g, "").trim();
  if (!s) return NaN;
  const negative = s.startsWith("-");
  s = s.replace(/^-/, "");
  // BR format: 1.234,56
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return negative ? -n : n;
}

const DATE_HEADERS = ["data", "date", "dt", "data lançamento", "data lancamento"];
const DESC_HEADERS = [
  "titulo", "title", "descrição", "descricao", "description",
  "lançamento", "lancamento", "estabelecimento", "histórico",
  "historico", "portador",
];
const AMOUNT_HEADERS = ["valor", "amount", "value", "montante"];

function findCol(headers: string[], patterns: string[]): number {
  for (const p of patterns) {
    const idx = headers.findIndex((h) => h.includes(p));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map((h) =>
    h.replace(/['"]/g, "").toLowerCase().trim()
  );

  let dateCol = findCol(headers, DATE_HEADERS);
  let descCol = findCol(headers, DESC_HEADERS);
  let amountCol = findCol(headers, AMOUNT_HEADERS);

  // Positional fallback
  if ((dateCol === -1 || descCol === -1 || amountCol === -1) && headers.length >= 3) {
    if (dateCol === -1) dateCol = 0;
    if (amountCol === -1) amountCol = headers.length - 1;
    if (descCol === -1) descCol = 1;
  } else if (dateCol === -1 || descCol === -1 || amountCol === -1) {
    return [];
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delimiter);
    const dateStr = cols[dateCol] ?? "";
    const descStr = (cols[descCol] ?? "").replace(/['"]/g, "").trim();
    const amountStr = cols[amountCol] ?? "";

    const date = parseDate(dateStr);
    const rawAmount = parseAmount(amountStr);

    if (!date || !descStr || isNaN(rawAmount) || rawAmount === 0) continue;

    rows.push({
      id: `row-${i}`,
      date,
      description: descStr,
      amount: Math.abs(rawAmount),
      selected: true,
      categoryId: "",
    });
  }
  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────

const FMT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ImportDialog({
  cardId,
  cardName,
  open,
  onOpenChange,
  onImported,
}: ImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setRows([]);
    setParseError("");
    setResult(null);
    setImportError("");
  }, []);

  // Fetch categories whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) =>
        setCategories(
          Array.isArray(data) ? data.filter((c: Category) => c.type !== "INCOME") : []
        )
      )
      .catch(() => {});
  }, [open]);

  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (!val) reset();
      onOpenChange(val);
    },
    [onOpenChange, reset]
  );

  function handleFile(file: File) {
    setParseError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setParseError(
          "Não foi possível detectar transações neste arquivo. Verifique se é um CSV válido com colunas de data, descrição e valor."
        );
        return;
      }
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function toggleRow(id: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  }

  function toggleAll(val: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected: val })));
  }

  function setCategoryForRow(id: string, categoryId: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, categoryId } : r))
    );
  }

  async function handleImport() {
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) return;
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch(`/api/credit-cards/${cardId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: selected.map((r) => ({
            description: r.description,
            amount: r.amount,
            date: r.date.toISOString(),
            ...(r.categoryId ? { categoryId: r.categoryId } : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Erro ao importar");
        return;
      }
      setResult(data);
      setStep("done");
      onImported(data.created);
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Importar fatura — {cardName}</DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Faça upload do CSV exportado pelo seu banco. Suporte: Nubank, Inter, Itaú e formato genérico.
            </p>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={36} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">.csv</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {parseError && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <p>{parseError}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === "preview" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {rows.length} transações detectadas
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleAll(!allSelected)}
                  className="text-xs text-primary hover:underline"
                >
                  {allSelected ? "Desmarcar todas" : "Selecionar todas"}
                </button>
                <Badge variant="outline">{selectedCount} selecionadas</Badge>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 border rounded-lg min-h-0" style={{ maxHeight: "50vh" }}>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="w-8 px-3 py-2 text-left" />
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Data</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Descrição</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Valor</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition-opacity ${row.selected ? "" : "opacity-35"}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(row.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-xs">
                        {row.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="truncate block">{row.description}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {FMT.format(row.amount)}
                      </td>
                      <td className="px-3 py-2 w-44">
                        <Select
                          value={row.categoryId || "_none"}
                          onValueChange={(v) =>
                            setCategoryForRow(row.id, v === "_none" ? "" : v)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Sem categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Sem categoria</SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
                className="flex-1"
              >
                {importing
                  ? "Importando..."
                  : `Importar ${selectedCount} transaç${selectedCount === 1 ? "ão" : "ões"}`}
              </Button>
            </div>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check size={28} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-lg">Importação concluída!</p>
              <p className="text-muted-foreground text-sm mt-1">
                {result?.created ?? 0} transaç{(result?.created ?? 0) === 1 ? "ão importada" : "ões importadas"}
                {(result?.skipped ?? 0) > 0 &&
                  ` · ${result!.skipped} ignorada${result!.skipped === 1 ? "" : "s"} (duplicadas)`}
              </p>
            </div>
            <Button onClick={() => handleOpenChange(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
