"use client";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/header";
import { GoalCard } from "@/components/goals/goal-card";
import type { Goal } from "@/types";

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    targetAmount: "",
    targetDate: "",
    imageUrl: "",
  });

  async function load() {
    const data = await fetch("/api/goals").then((r) => r.json());
    setGoals(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!form.title || !form.targetAmount || !form.targetDate) return;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        targetAmount: parseFloat(form.targetAmount),
      }),
    });
    setAddOpen(false);
    setForm({ title: "", description: "", targetAmount: "", targetDate: "", imageUrl: "" });
    load();
  }

  async function handleUpdate(id: string, data: Partial<Goal>) {
    await fetch(`/api/goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta meta?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <Header title="Metas" />
      <main className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Vision Board</h2>
            <p className="text-sm text-muted-foreground">
              Visualize e acompanhe suas metas financeiras
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" />
            Nova Meta
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
          {goals.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">
              Nenhuma meta cadastrada ainda. Crie sua primeira meta!
            </p>
          )}
        </div>
      </main>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Meta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome da meta *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Ex: Casa própria, Viagem..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor alvo (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.targetAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetAmount: e.target.value }))
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data limite *</Label>
                <Input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL da imagem (opcional)</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleAdd} className="flex-1">
                Criar Meta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
