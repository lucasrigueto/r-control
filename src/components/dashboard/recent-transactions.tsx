import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

export function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="text-xl w-8 text-center">
              {t.category?.icon ?? "💸"}
            </div>
            <div>
              <p className="text-sm font-medium">{t.description}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(t.date), "dd MMM", { locale: ptBR })} ·{" "}
                {t.user?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${
                t.type === "INCOME"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500"
              }`}
            >
              {t.type === "INCOME" ? "+" : "-"}
              {formatCurrency(t.amount)}
            </span>
            <Badge
              variant={t.status === "PAID" ? "default" : "secondary"}
              className="text-xs hidden sm:inline-flex"
            >
              {t.status === "PAID" ? "Pago" : "Pendente"}
            </Badge>
          </div>
        </div>
      ))}
      {transactions.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-6">
          Nenhuma transação este mês.
        </p>
      )}
    </div>
  );
}
