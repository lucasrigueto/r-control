"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, MessageCircle, Smartphone, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";

const COMMANDS = [
  {
    category: "Registrar transações",
    items: [
      { cmd: "Mensagem de texto", example: "Gastei R$ 50 no mercado", desc: "Registra despesa" },
      { cmd: "Mensagem de texto", example: "Recebi R$ 2.000 de salário", desc: "Registra receita" },
      { cmd: "Áudio", example: "Fale o lançamento em voz", desc: "Transcreve e registra" },
      { cmd: "Foto", example: "Foto do comprovante/nota", desc: "Lê e registra automaticamente" },
    ],
  },
  {
    category: "Confirmar lançamento",
    items: [
      { cmd: "1", example: "1", desc: "Confirma o lançamento pendente" },
      { cmd: "2", example: "2", desc: "Cancela o lançamento pendente" },
    ],
  },
  {
    category: "Comandos de consulta",
    items: [
      { cmd: "/saldo", example: "/saldo", desc: "Resumo financeiro do mês" },
      { cmd: "/gastos", example: "/gastos", desc: "Top categorias do mês" },
      { cmd: "/ajuda", example: "/ajuda", desc: "Lista todos os comandos" },
    ],
  },
];

export default function WhatsAppPage() {
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/user/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        setWhatsappNumber(data.whatsappNumber);
        if (data.whatsappNumber) setInput(data.whatsappNumber);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/user/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNumber: input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar");
      } else {
        setWhatsappNumber(data.whatsappNumber);
        setSuccess("Número salvo com sucesso!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Desconectar o WhatsApp?")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/user/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNumber: null }),
      });
      if (res.ok) {
        setWhatsappNumber(null);
        setInput("");
        setSuccess("WhatsApp desconectado.");
        setTimeout(() => setSuccess(""), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  function copyNumber() {
    if (whatsappNumber) {
      navigator.clipboard.writeText(whatsappNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const isConnected = !!whatsappNumber;

  return (
    <div>
      <Header title="WhatsApp" />
      <main className="p-6 max-w-2xl mx-auto space-y-6">

        {/* Status card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isConnected ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                  <MessageCircle size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Assistente no WhatsApp</CardTitle>
                  <CardDescription>
                    Registre transações enviando mensagens, áudios ou fotos
                  </CardDescription>
                </div>
              </div>
              <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600" : ""}>
                {isConnected ? (
                  <><CheckCircle2 size={12} className="mr-1" /> Conectado</>
                ) : (
                  <><XCircle size={12} className="mr-1" /> Desconectado</>
                )}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                {isConnected && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <Smartphone size={16} className="text-green-600 shrink-0" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-400 flex-1">
                      +{whatsappNumber}
                    </span>
                    <button onClick={copyNumber} className="text-green-600 hover:text-green-800 transition-colors">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Número do WhatsApp</Label>
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="5531999999999 (com código do país)"
                      className="flex-1"
                    />
                    <Button onClick={handleSave} disabled={saving || !input.trim()}>
                      {saving ? "Salvando..." : isConnected ? "Atualizar" : "Conectar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formato: código país + DDD + número. Ex: <strong>5531999999999</strong>
                  </p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                {isConnected && (
                  <div className="pt-1">
                    <Button variant="outline" size="sm" onClick={handleRemove} disabled={saving}>
                      Desconectar
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Commands reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como usar o assistente</CardTitle>
            <CardDescription>
              Envie mensagens para o número configurado na Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {COMMANDS.map((section) => (
              <div key={section.category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {section.category}
                </p>
                <div className="space-y-2">
                  {section.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                      <code className="text-xs bg-background border rounded px-1.5 py-0.5 font-mono shrink-0 mt-0.5">
                        {item.example}
                      </code>
                      <span className="text-sm text-muted-foreground">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Flow explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de confirmação</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                <span>Você envia uma mensagem descrevendo a transação</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                <span>O assistente interpreta e envia uma confirmação com os detalhes</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                <span>Responda <strong className="text-foreground">1</strong> para confirmar ou <strong className="text-foreground">2</strong> para cancelar</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
                <span>A transação é salva automaticamente no R-Control</span>
              </li>
            </ol>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
