"use client";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { Budget } from "@/types";

interface Props {
  budgets: (Budget & { spent: number })[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, amount: number) => void;
}

export function BudgetTable({ budgets, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const totalPlanned = budgets.reduce((a, b) => a + b.amount, 0);
  const totalSpent = budgets.reduce((a, b) => a + b.spent, 0);

  function getStatus(pct: number) {
    if (pct >= 100)
      return { label: "Estourado", variant: "destructive" as const };
    if (pct >= 80)
      return { label: "Próximo do Limite", variant: "secondary" as const };
    return { label: "OK", variant: "default" as const };
  }

  return (
    <div className="space-y-4">
      {/* Totais */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Planejado</p>
          <p className="font-bold text-lg">{formatCurrency(totalPlanned)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Realizado</p>
          <p className="font-bold text-lg">{formatCurrency(totalSpent)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Economia</p>
          <p
            className={`font-bold text-lg ${
              totalPlanned - totalSpent >= 0
                ? "text-emerald-600"
                : "text-red-500"
            }`}
          >
            {formatCurrency(totalPlanned - totalSpent)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-3 px-4 font-medium">Categoria</th>
              <th className="text-right py-3 px-4 font-medium">Planejado</th>
              <th className="text-right py-3 px-4 font-medium">Realizado</th>
              <th className="text-right py-3 px-4 font-medium hidden md:table-cell">
                Diferença
              </th>
              <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">
                Progresso
              </th>
              <th className="text-center py-3 px-4 font-medium hidden md:table-cell">
                Status
              </th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => {
              const pct =
                b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
              const diff = b.amount - b.spent;
              const status = getStatus(pct);

              return (
                <tr
                  key={b.id}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span>
                      {b.category.icon} {b.category.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {editingId === b.id ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 h-7 text-right text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onUpdate(b.id, parseFloat(editValue));
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      formatCurrency(b.amount)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {formatCurrency(b.spent)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right hidden md:table-cell ${
                      diff >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {diff >= 0 ? "+" : ""}
                    {formatCurrency(diff)}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(pct, 100)}
                        className="h-2 w-24"
                      />
                      <span className="text-xs text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center hidden md:table-cell">
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(b.id);
                          setEditValue(String(b.amount));
                        }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(b.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {budgets.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  Nenhum orçamento configurado. Adicione uma categoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
