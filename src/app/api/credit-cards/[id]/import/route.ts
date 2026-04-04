import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ImportTx {
  description: string;
  amount: number;
  date: string;
  categoryId?: string;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const card = await prisma.creditCard.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

  const { transactions } = (await req.json()) as { transactions: ImportTx[] };
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: "Nenhuma transação enviada" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;

  for (const tx of transactions) {
    const date = new Date(tx.date);
    if (isNaN(date.getTime()) || !tx.description?.trim() || !(tx.amount > 0)) {
      skipped++;
      continue;
    }

    const exists = await prisma.transaction.findFirst({
      where: {
        creditCard: { id: params.id },
        userId: session.user.id,
        description: tx.description.trim(),
        amount: tx.amount,
        date,
      },
    });
    if (exists) {
      skipped++;
      continue;
    }

    await prisma.transaction.create({
      data: {
        description: tx.description.trim(),
        amount: tx.amount,
        type: "EXPENSE",
        date,
        status: "PENDING",
        source: "import",
        creditCard: { connect: { id: params.id } },
        user: { connect: { id: session.user.id } },
        ...(tx.categoryId ? { category: { connect: { id: tx.categoryId } } } : {}),
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
