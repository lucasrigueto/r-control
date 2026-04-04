export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ParsedRow } from "@/lib/parsers/csv";

interface ConfirmBody {
  transactions: ParsedRow[];
  creditCardId?: string | null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: ConfirmBody = await req.json();
  const { transactions, creditCardId } = body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: "Nenhuma transação para importar" }, { status: 400 });
  }

  // Fetch existing transactions to check for duplicates at save time
  const existingTxs = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    select: { date: true, amount: true, description: true },
  });

  let created = 0;
  let skipped = 0;

  for (const row of transactions) {
    const rowDate = new Date(row.date);

    // Final dedup check
    const isDuplicate = existingTxs.some((tx) => {
      const txDate = new Date(tx.date);
      const dayDiff = Math.abs(rowDate.getTime() - txDate.getTime()) / 86400000;
      const sameAmount = Math.abs(tx.amount - row.amount) < 0.01;
      const sameDesc =
        tx.description.toLowerCase().includes(row.description.toLowerCase().slice(0, 10)) ||
        row.description.toLowerCase().includes(tx.description.toLowerCase().slice(0, 10));
      return dayDiff <= 1 && sameAmount && sameDesc;
    });

    if (isDuplicate) {
      skipped++;
      continue;
    }

    // Build data object — creditCardId is either connected or null
    const txData = {
      description: row.description,
      amount: row.amount,
      type: row.type,
      date: rowDate,
      status: "PAID" as const,
      source: "import",
      user: { connect: { id: session.user.id } },
      ...(row.categoryId ? { category: { connect: { id: row.categoryId } } } : {}),
      ...(creditCardId ? { creditCard: { connect: { id: creditCardId } } } : {}),
    };

    await prisma.transaction.create({ data: txData });

    created++;
    // Add to local dedup set to avoid duplicates within the same batch
    existingTxs.push({
      date: rowDate,
      amount: row.amount,
      description: row.description,
    });
  }

  return NextResponse.json({ created, skipped });
}
