"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CreditCard as CreditCardIcon, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Header } from "@/components/layout/header";
import { formatCycleLabel } from "@/lib/billing";
import { ImportDialog } from "@/components/cartoes/import-dialog";

interface CreditCardData {
  id: string;
  name: string;
  lastDigits: string | null;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  cycleSpent: number;
  cycleStart: string;
  cycleEnd: string;
}

interface TransactionItem {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  category: { name: string; icon: string; color: string } | null;
}

interface CardDetail extends CreditCardData {
  transactions: TransactionItem[];
}

const CARD_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#64748b",
];

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const emptyForm = {
  name: "", lastDigits: "", limit: "", closingDay: "", dueDay: "", color: "#6366f1",
};

export default function CartoesPage() {
  const [cards, setCards] = useState<CreditCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCardData | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Drill-down sheet
  const [sheetCard, setSheetCard] = useState<CardDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Import dialog
  const [importCard, setImportCard] = useState<{ id: string; name: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/credit-cards");
      if (!res.ok) { setCards([]); return; }
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(card: CreditCardData) {
    setEditing(card);
    setForm({
      name: card.name,
      lastDigits: card.lastDigits ?? "",
      limit: String(card.limit),
      closingDay: String(card.closingDay),
      dueDay: String(card.dueDay),
      color: card.color,
    });
    setError("");
    setDialogOpen(true);
  }

  function openImport(card: CreditCardData) {
    setImportCard({ id: card.id, name: card.name });
    setImportOpen(true);
  }

  async function openDetail(card: CreditCardData) {
    setSheetOpen(true);
    setSheetLoading(true);
    setSheetCard(null);
    try {
      const res = await fetch(`/api/credit-cards/${card.id}`);
      if (res.ok) setSheetCard(await res.json());
    } finally {
      setSheetLoading(false);
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const url = editing ? `/api/credit-cards/${editing.id}` : "/api/credit-cards";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar"); return; }
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir o cartão "${name}"? Os lançamentos vinculados não serão excluídos.`)) return;
    await fetch(`/api/credit-cards/${id}`, { method: "DELETE" });
    load();
  }

  function usagePercent(spent: number, limit: number) {
    return Math.min(Math.round((spent / limit) * 100), 100);
  }

  function usageColor(pct: number) {
    if (pct >= 100) return "bg-red-500";
    if (pct >= 85) return "bg-orange-500";
    if (pct >= 70) return "bg-yellow-500";
    return "bg-green-500";
  }

  const totalSpent = cards.reduce((s, c) => s + c.cycleSpent, 0);

  return (
    <div>
      <Header title="Cartões de Crédito" />
      <main className="p-6 space-y-6 max-w-4xl mx-auto">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Seus cartões</h2>
            <p className="text-sm text-muted-foreground">
              {cards.length > 0
                ? `Total em aberto: ${formatBRL(totalSpent)}`
                : "Acompanhe o gasto de cada cartão no ciclo atual"}
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-2" />
            Novo Cartão
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : cards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <CreditCardIcon size={40} className="text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">Nenhum cartão cadastrado ainda</p>
              <Button variant="outline" onClick={openCreate}>
                <Plus size={14} className="mr-2" /> Adicionar cartão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card) => {
              const pct = usagePercent(card.cycleSpent, card.limit);
              const available = card.limit - card.cycleSpent;
              const cycleLabel = formatCycleLabel(card.closingDay, new Date(card.cycleStart));

              return (
                <Card key={card.id} className="overflow-hidden">
                  <div className="h-1.5 w-full" style={{ backgroundColor: card.color }} />

                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: card.color }}
                        >
                          {card.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm truncate">{card.name}</CardTitle>
                          {card.lastDigits && (
                            <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(card)}>
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(card.id, card.name)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Gasto no ciclo</span>
                        <span>{pct}% do limite</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${usageColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{formatBRL(card.cycleSpent)}</span>
                        <span className="text-muted-foreground">de {formatBRL(card.limit)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Disponível</p>
                        <p className={`text-sm font-semibold ${available < 0 ? "text-destructive" : "text-green-600"}`}>
                          {formatBRL(Math.max(available, 0))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Fecha dia {card.closingDay}</p>
                        <p className="text-xs text-muted-foreground">Vence dia {card.dueDay}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-xs font-normal">{cycleLabel}</Badge>
                      {pct >= 85 && (
                        <Badge variant="destructive" className="text-xs">
                          {pct >= 100 ? "Limite atingido" : "Limite próximo"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-1.5 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-between text-xs h-8"
                        onClick={() => openDetail(card)}
                      >
                        Ver fatura
                        <ChevronRight size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        title="Importar fatura CSV"
                        onClick={() => openImport(card)}
                      >
                        <Upload size={13} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome do cartão *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Nubank, Inter, C6..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Últimos 4 dígitos</Label>
                <Input
                  value={form.lastDigits}
                  onChange={(e) => setForm((f) => ({ ...f, lastDigits: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="0000"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Limite (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.limit}
                  onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))}
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dia de fechamento *</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.closingDay}
                  onChange={(e) => setForm((f) => ({ ...f, closingDay: e.target.value }))}
                  placeholder="5"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dia de vencimento *</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dueDay}
                  onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name || !form.limit || !form.closingDay || !form.dueDay}
                className="flex-1"
              >
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      {importCard && (
        <ImportDialog
          cardId={importCard.id}
          cardName={importCard.name}
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={() => load()}
        />
      )}

      {/* Fatura drill-down Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {sheetLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Carregando fatura...</p>
            </div>
          ) : sheetCard ? (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: sheetCard.color }}
                  >
                    {sheetCard.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle>{sheetCard.name}</SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      {formatCycleLabel(sheetCard.closingDay, new Date(sheetCard.cycleStart))}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Gasto no ciclo</p>
                    <p className="text-lg font-semibold">{formatBRL(sheetCard.cycleSpent)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.min(Math.round((sheetCard.cycleSpent / sheetCard.limit) * 100), 100)}% do limite
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Disponível</p>
                    <p className={`text-lg font-semibold ${sheetCard.limit - sheetCard.cycleSpent < 0 ? "text-destructive" : "text-green-600"}`}>
                      {formatBRL(Math.max(sheetCard.limit - sheetCard.cycleSpent, 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Vence dia {sheetCard.dueDay}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions list */}
              <div className="space-y-1">
                <p className="text-sm font-medium mb-3">
                  Lançamentos ({sheetCard.transactions.length})
                </p>
                {sheetCard.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum lançamento neste ciclo
                  </p>
                ) : (
                  sheetCard.transactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {t.category && (
                          <span className="text-base flex-shrink-0">{t.category.icon}</span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm truncate">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(t.date)}
                            {t.category && ` · ${t.category.name}`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium flex-shrink-0 ml-2 ${t.type === "INCOME" ? "text-green-600" : ""}`}>
                        {t.type === "INCOME" ? "+" : "-"}{formatBRL(t.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
