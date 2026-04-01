import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBillingCycle } from "@/lib/billing";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await prisma.creditCard.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  // Enrich each card with current cycle spending
  const now = new Date();
  const enriched = await Promise.all(
    cards.map(async (card) => {
      const { start, end } = getBillingCycle(card.closingDay, now);
      const agg = await prisma.transaction.aggregate({
        where: {
          creditCardId: card.id,
          type: "EXPENSE",
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      });
      return {
        ...card,
        cycleSpent: agg._sum.amount ?? 0,
        cycleStart: start,
        cycleEnd: end,
      };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, lastDigits, limit, closingDay, dueDay, color } = body;

  if (!name || !limit || !closingDay || !dueDay) {
    return NextResponse.json({ error: "Campos obrigatórios: nome, limite, fechamento, vencimento" }, { status: 400 });
  }

  if (closingDay < 1 || closingDay > 28 || dueDay < 1 || dueDay > 28) {
    return NextResponse.json({ error: "Dias devem ser entre 1 e 28" }, { status: 400 });
  }

  const card = await prisma.creditCard.create({
    data: {
      name,
      lastDigits: lastDigits || null,
      limit: parseFloat(limit),
      closingDay: parseInt(closingDay),
      dueDay: parseInt(dueDay),
      color: color || "#6366f1",
      userId: session.user.id,
    },
  });

  return NextResponse.json(card, { status: 201 });
}
