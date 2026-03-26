import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [currentTxs, lastTxs] = await Promise.all([
    prisma.transaction.findMany({ where: { date: { gte: startOfMonth, lte: endOfMonth } } }),
    prisma.transaction.findMany({ where: { date: { gte: lastMonthStart, lte: lastMonthEnd } } }),
  ]);

  const sum = (
    txs: typeof currentTxs,
    type: "INCOME" | "EXPENSE",
    status?: string
  ) =>
    txs
      .filter((t) => t.type === type && (!status || t.status === status))
      .reduce((acc, t) => acc + t.amount, 0);

  const monthlyIncome = sum(currentTxs, "INCOME", "PAID");
  const monthlyExpenses = sum(currentTxs, "EXPENSE", "PAID");
  const pendingAmount = sum(currentTxs, "EXPENSE", "PENDING");
  const lastIncome = sum(lastTxs, "INCOME", "PAID");
  const lastExpenses = sum(lastTxs, "EXPENSE", "PAID");

  const pct = (current: number, last: number) =>
    last === 0 ? 0 : Math.round(((current - last) / last) * 100);

  // Last 6 months cashflow
  const cashflow = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return prisma.transaction
        .findMany({ where: { date: { gte: start, lte: end } } })
        .then((txs) => ({
          month: d.toLocaleDateString("pt-BR", { month: "short" }),
          income: sum(txs, "INCOME"),
          expenses: sum(txs, "EXPENSE"),
        }));
    })
  );

  const recentTransactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { date: "desc" },
    include: {
      category: { select: { name: true, icon: true, color: true } },
      user: { select: { name: true } },
    },
  });

  return NextResponse.json({
    balance: monthlyIncome - monthlyExpenses,
    monthlyIncome,
    monthlyExpenses,
    pendingAmount,
    incomeChange: pct(monthlyIncome, lastIncome),
    expenseChange: pct(monthlyExpenses, lastExpenses),
    cashflow,
    recentTransactions,
  });
}
