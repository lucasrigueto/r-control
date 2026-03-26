import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id, month, year },
    include: { category: true },
  });

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { type: "EXPENSE", date: { gte: startOfMonth, lte: endOfMonth } },
    select: { categoryId: true, amount: true, status: true },
  });

  const spentByCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (t.categoryId && t.status === "PAID") {
      spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] ?? 0) + t.amount;
    }
  }

  const result = budgets.map((b) => ({
    ...b,
    spent: spentByCategory[b.categoryId] ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId: session.user.id,
        categoryId: body.categoryId,
        month: body.month,
        year: body.year,
      },
    },
    update: { amount: body.amount },
    create: { ...body, userId: session.user.id },
    include: { category: true },
  });

  return NextResponse.json(budget, { status: 201 });
}
