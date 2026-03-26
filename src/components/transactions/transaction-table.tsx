"use client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionTable({ transactions, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-3 px-4 font-medium">Descrição</th>
            <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Data</th>
            <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Categoria</th>
            <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">Quem</th>
            <th className="text-right py-3 px-4 font-medium">Valor</th>
            <th className="text-center py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b hover:bg-muted/50 transition-colors">
              <td className="py-3 px-4">
                <div className="font-medium">{t.description}</div>
                <div className="text-xs text-muted-foreground md:hidden">
                  {format(new Date(t.date), "dd/MM/yyyy")}
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                {format(new Date(t.date), "dd MMM yyyy", { locale: ptBR })}
              </td>
              <td className="py-3 px-4 hidden md:table-cell">
                {t.category ? (
                  <span>
                    {t.category.icon} {t.category.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                {t.user?.name ?? "—"}
              </td>
              <td
                className={`py-3 px-4 text-right font-semibold ${
                  t.type === "INCOME"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500"
                }`}
              >
                {t.type === "INCOME" ? "+" : "-"} {formatCurrency(t.amount)}
              </td>
              <td className="py-3 px-4 text-center">
                <Badge
                  variant={t.status === "PAID" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {t.status === "PAID" ? "Pago" : "Pendente"}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(t)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(t.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="py-12 text-center text-muted-foreground"
              >
                Nenhuma transação encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
