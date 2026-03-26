import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const type = searchParams.get("type");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};

  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  if (type && type !== "ALL") where.type = type;
  if (userId) where.userId = userId;

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { name: true, icon: true, color: true } },
      account: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: body.userId ?? session.user.id,
      source: body.source ?? "manual",
    },
    include: {
      category: { select: { name: true, icon: true, color: true } },
      account: { select: { name: true } },
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
