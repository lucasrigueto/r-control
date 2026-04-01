import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { whatsappNumber: true },
  });

  return NextResponse.json({ whatsappNumber: user?.whatsappNumber ?? null });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { whatsappNumber } = await req.json();

  // Normalize: keep only digits
  const normalized = whatsappNumber ? whatsappNumber.replace(/\D/g, "") : null;

  if (normalized && (normalized.length < 10 || normalized.length > 13)) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }

  // Check uniqueness if setting a number
  if (normalized) {
    const existing = await prisma.user.findFirst({
      where: { whatsappNumber: normalized, id: { not: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Número já cadastrado" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { whatsappNumber: normalized },
    select: { whatsappNumber: true },
  });

  return NextResponse.json({ whatsappNumber: user.whatsappNumber });
}
