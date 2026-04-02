"use client";
import { useState, useEffect } from "react";
import { User, Lock, MessageCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/layout/header";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  whatsappNumber: string | null;
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setName(data.name ?? "");
        setAvatarUrl(data.avatar ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar: avatarUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMsg({ type: "err", text: data.error ?? "Erro ao salvar" });
      } else {
        setProfile((p) => p ? { ...p, ...data } : data);
        setProfileMsg({ type: "ok", text: "Perfil atualizado!" });
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "As senhas não coincidem" });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: "err", text: "A nova senha deve ter ao menos 6 caracteres" });
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ type: "err", text: data.error ?? "Erro ao alterar senha" });
      } else {
        setPwMsg({ type: "ok", text: "Senha alterada com sucesso!" });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      }
    } finally {
      setSavingPw(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Perfil" />
        <main className="p-6"><p className="text-sm text-muted-foreground">Carregando...</p></main>
      </div>
    );
  }

  return (
    <div>
      <Header title="Perfil" />
      <main className="p-6 space-y-6 max-w-2xl mx-auto">

        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden text-2xl">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">{profile?.name}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        <Separator />

        {/* Profile info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={16} /> Informações pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>

            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={profile?.email ?? ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Camera size={13} /> URL do avatar (opcional)
              </Label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {profileMsg && (
              <p className={`text-sm ${profileMsg.type === "ok" ? "text-green-600" : "text-destructive"}`}>
                {profileMsg.text}
              </p>
            )}

            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle size={16} /> WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.whatsappNumber ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{profile.whatsappNumber}</p>
                  <p className="text-xs text-green-600">Conectado</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/whatsapp">Gerenciar</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Nenhum número cadastrado</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/whatsapp">Conectar</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock size={16} /> Alterar senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Senha atual</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {pwMsg && (
              <p className={`text-sm ${pwMsg.type === "ok" ? "text-green-600" : "text-destructive"}`}>
                {pwMsg.text}
              </p>
            )}

            <Button onClick={savePassword} disabled={savingPw || !currentPw || !newPw}>
              {savingPw ? "Alterando..." : "Alterar senha"}
            </Button>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
