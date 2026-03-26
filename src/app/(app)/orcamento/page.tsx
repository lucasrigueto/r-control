"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { BudgetTable } from "@/components/budget/budget-table";
import type { Budget, Category } from "@/types";

const MONTHS = [
  "Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez",
];

export default function OrcamentoPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year] = useState(String(now.getFullYear()));
  const [budgets, setBudgets] = useState<(Budget & { spent: number })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const load = useCallback(async () => {
    const [b, c] = await Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setBudgets(b);
    setCategories(
      c.filter((cat: Category) => cat.type === "EXPENSE" || cat.type === "BOTH")
    );
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!newCategoryId || !newAmount) return;
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: newCategoryId,
        amount: parseFloat(newAmount),
        month: Number(month),
        year: Number(year),
      }),
    });
    setAddOpen(false);
    setNewCategoryId("");
    setNewAmount("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover orçamento desta categoria?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    load();
  }

  async function handleUpdate(id: string, amount: number) {
    await fetch(`/api/budgets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    load();
  }

  return (
    <div>
      <Header title="Orçamento" />
      <main className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {m} {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" />
            Adicionar Categoria
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orçamento por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetTable
              budgets={budgets}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          </CardContent>
        </Card>
      </main>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Categoria ao Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={newCategoryId}
                onValueChange={setNewCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Planejado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleAdd} className="flex-1">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
