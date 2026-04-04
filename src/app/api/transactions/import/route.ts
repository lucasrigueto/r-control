export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCSV } from "@/lib/parsers/csv";
import { autocategorize } from "@/lib/parsers/autocategorize";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("type") as string) ?? "csv";
    const creditCardId = (formData.get("creditCardId") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const categories = await prisma.category.findMany({
      select: { id: true, name: true, type: true },
    });

    let rows;

    if (fileType === "csv") {
      const text = await file.text();
      const result = parseCSV(text);
      rows = result.rows;
    } else if (fileType === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { parsePDF } = await import("@/lib/parsers/pdf");
      rows = await parsePDF(buffer);
    } else {
      return NextResponse.json({ error: "Tipo não suportado" }, { status: 400 });
    }

    // Auto-categorize
    const categorized = await autocategorize(rows, categories);

    // Flag potential duplicates (same date + same amount + similar description)
    const existingTxs = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      select: { date: true, amount: true, description: true },
    });

    const withDuplicateFlag = categorized.map((row) => {
      const rowDate = new Date(row.date);
      const isDuplicate = existingTxs.some((tx) => {
        const txDate = new Date(tx.date);
        const dayDiff = Math.abs(rowDate.getTime() - txDate.getTime()) / 86400000;
        const sameAmount = Math.abs(tx.amount - row.amount) < 0.01;
        const sameDesc =
          tx.description.toLowerCase().includes(row.description.toLowerCase().slice(0, 10)) ||
          row.description.toLowerCase().includes(tx.description.toLowerCase().slice(0, 10));
        return dayDiff <= 1 && sameAmount && sameDesc;
      });
      return { ...row, isDuplicate };
    });

    return NextResponse.json({
      transactions: withDuplicateFlag,
      total: withDuplicateFlag.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[import] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
