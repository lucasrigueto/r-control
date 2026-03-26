"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import type { DashboardSummary } from "@/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div>
      <Header title="Dashboard" />
      <main className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            Olá, {session?.user?.name}! 👋
          </h2>
          <p className="text-muted-foreground">
            Aqui está o resumo das suas finanças este mês.
          </p>
        </div>

        {data ? (
          <SummaryCards data={data} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Fluxo de Caixa — Últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data ? (
                <CashflowChart data={data.cashflow} />
              ) : (
                <div className="h-[280px] bg-muted animate-pulse rounded" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Transações Recentes</CardTitle>
              <Link
                href="/transacoes"
                className="text-xs text-primary hover:underline"
              >
                Ver todas
              </Link>
            </CardHeader>
            <CardContent>
              {data && (
                <RecentTransactions transactions={data.recentTransactions} />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
