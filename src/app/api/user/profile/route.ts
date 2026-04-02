import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, avatar: true, whatsappNumber: true, theme: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, avatar, currentPassword, newPassword } = body;

  const data: Record<string, string> = {};
  if (name?.trim()) data.name = name.trim();
  if (avatar !== undefined) data.avatar = avatar;

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Senha atual é obrigatória" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const valid = user && await bcrypt.compare(currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    data.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, avatar: true },
  });

  return NextResponse.json(updated);
}
