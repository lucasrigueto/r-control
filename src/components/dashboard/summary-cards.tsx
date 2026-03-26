import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

export function SummaryCards({ data }: { data: DashboardSummary }) {
  const cards = [
    {
      title: "Saldo do Mês",
      value: data.balance,
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Receitas",
      value: data.monthlyIncome,
      change: data.incomeChange,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Despesas",
      value: data.monthlyExpenses,
      change: data.expenseChange,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Pendentes",
      value: data.pendingAmount,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={16} className={card.color} />
              </div>
            </div>
            <p className="text-xl font-bold">{formatCurrency(card.value)}</p>
            {card.change !== undefined && (
              <p
                className={`text-xs mt-1 ${
                  card.change >= 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {card.change >= 0 ? "+" : ""}
                {card.change}% vs mês anterior
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
