import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBillingCycle } from "@/lib/billing";

async function getCard(id: string, userId: string) {
  return prisma.creditCard.findFirst({ where: { id, userId } });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const card = await getCard(params.id, session.user.id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { start, end } = getBillingCycle(card.closingDay);

  const transactions = await prisma.transaction.findMany({
    where: { creditCardId: card.id, date: { gte: start, lte: end } },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const cycleSpent = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  return NextResponse.json({ ...card, cycleSpent, cycleStart: start, cycleEnd: end, transactions });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const card = await getCard(params.id, session.user.id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, lastDigits, limit, closingDay, dueDay, color } = body;

  if (closingDay && (closingDay < 1 || closingDay > 28)) {
    return NextResponse.json({ error: "Dia de fechamento deve ser entre 1 e 28" }, { status: 400 });
  }

  const updated = await prisma.creditCard.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(lastDigits !== undefined && { lastDigits: lastDigits || null }),
      ...(limit && { limit: parseFloat(limit) }),
      ...(closingDay && { closingDay: parseInt(closingDay) }),
      ...(dueDay && { dueDay: parseInt(dueDay) }),
      ...(color && { color }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const card = await getCard(params.id, session.user.id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unlink transactions before deleting
  await prisma.transaction.updateMany({
    where: { creditCardId: params.id },
    data: { creditCardId: null },
  });

  await prisma.creditCard.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
