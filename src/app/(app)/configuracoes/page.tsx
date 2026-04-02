"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/header";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "INCOME" | "EXPENSE" | "BOTH";
}

const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#64748b", "#84cc16", "#f43f5e",
];

const COMMON_ICONS = [
  "🏠", "🍔", "🚗", "💊", "📚", "🎮", "✈️", "💇",
  "🛒", "💡", "📱", "🎵", "🐾", "👗", "🏋️", "☕",
  "💰", "📈", "🏦", "💼", "🎁", "🔧", "🌱", "🍺",
];

const TYPE_LABELS = { INCOME: "Receita", EXPENSE: "Despesa", BOTH: "Ambos" };
const TYPE_COLORS = {
  INCOME: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  EXPENSE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  BOTH: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const emptyForm = { name: "", icon: "🏠", color: "#6366f1", type: "EXPENSE" as Category["type"] };

export default function ConfiguracoesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
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

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
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

  async function handleDelete(cat: Category) {
    if (!confirm(`Excluir "${cat.name}"?`)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Erro ao excluir");
      return;
    }
    load();
  }

  const byType = {
    EXPENSE: categories.filter((c) => c.type === "EXPENSE" || c.type === "BOTH"),
    INCOME: categories.filter((c) => c.type === "INCOME" || c.type === "BOTH"),
  };

  return (
    <div>
      <Header title="Configurações" />
      <main className="p-6 space-y-6 max-w-3xl mx-auto">

        {/* Categories */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag size={16} /> Categorias
              </CardTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} className="mr-1.5" /> Nova
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
            ) : (
              <div className="space-y-4">
                {(["EXPENSE", "INCOME"] as const).map((t) => (
                  byType[t].length > 0 && (
                    <div key={t}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {t === "EXPENSE" ? "Despesas" : "Receitas"}
                      </p>
                      <div className="space-y-1">
                        {byType[t].map((cat) => (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                style={{ backgroundColor: cat.color + "22" }}
                              >
                                {cat.icon}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{cat.name}</p>
                                <Badge className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[cat.type]}`} variant="secondary">
                                  {TYPE_LABELS[cat.type]}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                                <Pencil size={13} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(cat)}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </main>

      {/* Category dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Alimentação, Salário..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as Category["type"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="BOTH">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon }))}
                    className={`w-8 h-8 rounded-md text-base flex items-center justify-center transition-colors
                      ${form.icon === icon ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Label className="text-xs text-muted-foreground">Ou digite:</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="w-16 text-center"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-full transition-transform
                      ${form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
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
                disabled={saving || !form.name.trim()}
                className="flex-1"
              >
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
