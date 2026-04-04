"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, ChevronLeft, X, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { ParsedRow } from "@/lib/parsers/csv";

interface CreditCard {
  id: string;
  name: string;
}

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  creditCards?: CreditCard[];
}

type Step = "upload" | "preview" | "done";
type FileType = "csv" | "pdf";

const FMT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ImportDialog({ open, onClose, onImported, creditCards = [] }: ImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [fileType, setFileType] = useState<FileType>("csv");
  const [creditCardId, setCreditCardId] = useState<string>("none");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editCategory, setEditCategory] = useState<Record<number, string | null>>({});
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setFile(null);
    setRows([]);
    setSelected(new Set());
    setEditCategory({});
    setResult(null);
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const analyze = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", fileType);
    if (creditCardId && creditCardId !== "none") formData.append("creditCardId", creditCardId);

    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao analisar arquivo");

      const fetchedRows: ParsedRow[] = data.transactions;
      setRows(fetchedRows);
      // Select all non-duplicate rows by default
      setSelected(new Set(fetchedRows.map((_, i) => i).filter((i) => !fetchedRows[i].isDuplicate)));
      setStep("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [file, fileType, creditCardId]);

  const confirm = useCallback(async () => {
    const toImport = rows.filter((_, i) => selected.has(i)).map((row, origIdx) => {
      const idx = rows.indexOf(row);
      return {
        ...row,
        categoryId: editCategory[origIdx] !== undefined ? editCategory[origIdx] : row.categoryId,
      };
    });

    if (!toImport.length) {
      setError("Selecione pelo menos uma transação para importar.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/transactions/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: toImport,
          creditCardId: creditCardId !== "none" ? creditCardId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao importar");
      setResult(data);
      setStep("done");
      onImported();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [rows, selected, editCategory, creditCardId, onImported]);

  function toggleAll() {
    if (selected.size === rows.filter((r) => !r.isDuplicate).length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((_, i) => i).filter((i) => !rows[i].isDuplicate)));
    }
  }

  function toggleRow(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const accept = fileType === "pdf" ? ".pdf" : ".csv";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} />
            Importar Transações
            {step === "preview" && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setStep("upload")}>
                <ChevronLeft size={14} className="mr-1" /> Voltar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-2 text-xs text-muted-foreground mb-2">
          {["upload", "preview", "done"].map((s, i) => (
            <span key={s} className={`flex items-center gap-1 ${step === s ? "text-primary font-medium" : ""}`}>
              {i > 0 && <span className="mx-1">›</span>}
              {i + 1}. {s === "upload" ? "Upload" : s === "preview" ? "Revisar" : "Concluído"}
            </span>
          ))}
        </div>

        {/* ── STEP 1: UPLOAD ── */}
        {step === "upload" && (
          <div className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de arquivo</label>
                <Select value={fileType} onValueChange={(v) => { setFileType(v as FileType); setFile(null); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (extrato bancário)</SelectItem>
                    <SelectItem value="pdf">PDF (fatura de cartão)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cartão de crédito (opcional)</label>
                <Select value={creditCardId} onValueChange={setCreditCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum / Débito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Débito</SelectItem>
                    {creditCards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileChange}
              />
              <FileText size={40} className="mx-auto mb-3 text-muted-foreground" />
              {file ? (
                <div>
                  <p className="font-medium text-primary">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Clique ou arraste o arquivo aqui</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fileType === "csv" ? "Aceita CSV do Nubank, Inter e outros bancos" : "Aceita PDF de fatura de cartão"}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={analyze} disabled={!file || loading}>
                {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />Analisando...</> : "Analisar arquivo"}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: PREVIEW ── */}
        {step === "preview" && (
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                <strong className="text-foreground">{rows.length}</strong> transações detectadas ·{" "}
                <strong className="text-foreground">{selected.size}</strong> selecionadas
              </span>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selected.size === rows.filter((r) => !r.isDuplicate).length ? "Desmarcar todas" : "Selecionar todas"}
              </Button>
            </div>

            <div className="overflow-auto flex-1 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="w-8 p-2"></th>
                    <th className="p-2 text-left font-medium">Data</th>
                    <th className="p-2 text-left font-medium">Descrição</th>
                    <th className="p-2 text-left font-medium">Categoria</th>
                    <th className="p-2 text-right font-medium">Valor</th>
                    <th className="p-2 text-center font-medium">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t transition-colors ${
                        row.isDuplicate
                          ? "opacity-50 bg-muted/30"
                          : selected.has(i)
                          ? "bg-primary/5"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <td className="p-2 text-center">
                        {row.isDuplicate ? (
                          <span title="Possível duplicata">⚠️</span>
                        ) : (
                          <Checkbox
                            checked={selected.has(i)}
                            onCheckedChange={() => toggleRow(i)}
                          />
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap text-muted-foreground">
                        {new Date(row.date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-2 max-w-[200px] truncate" title={row.description}>
                        {row.description}
                      </td>
                      <td className="p-2">
                        <span className="text-xs text-muted-foreground">
                          {row.categoryName ?? "—"}
                        </span>
                      </td>
                      <td className="p-2 text-right font-medium tabular-nums">
                        {FMT.format(row.amount)}
                      </td>
                      <td className="p-2 text-center">
                        <Badge
                          variant={row.type === "INCOME" ? "default" : "destructive"}
                          className={`text-xs ${row.type === "INCOME" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}`}
                        >
                          {row.type === "INCOME" ? "Receita" : "Despesa"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.some((r) => r.isDuplicate) && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Transações com este símbolo são possíveis duplicatas e foram desmarcadas automaticamente.
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={confirm} disabled={selected.size === 0 || loading}>
                {loading ? (
                  <><Loader2 size={14} className="mr-2 animate-spin" />Importando...</>
                ) : (
                  `Importar ${selected.size} transação${selected.size !== 1 ? "ões" : ""}`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === "done" && result && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 size={56} className="text-emerald-500" />
            <div>
              <h3 className="text-lg font-semibold">Importação concluída!</h3>
              <p className="text-muted-foreground mt-1">
                <strong className="text-foreground">{result.created}</strong> transaç{result.created !== 1 ? "ões importadas" : "ão importada"}
                {result.skipped > 0 && (
                  <> · <strong>{result.skipped}</strong> duplicata{result.skipped !== 1 ? "s" : ""} ignorada{result.skipped !== 1 ? "s" : ""}</>
                )}
              </p>
            </div>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
