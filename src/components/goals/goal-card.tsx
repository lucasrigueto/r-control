"use client";
import { useState } from "react";
import { format } from "date-fns";
import { Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { Goal } from "@/types";

interface Props {
  goal: Goal;
  onUpdate: (id: string, data: Partial<Goal>) => void;
  onDelete: (id: string) => void;
}

export function GoalCard({ goal, onUpdate, onDelete }: Props) {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [contribution, setContribution] = useState("");

  const pct =
    goal.targetAmount > 0
      ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
      : 0;

  const remaining = goal.targetAmount - goal.currentAmount;

  function handleContribution() {
    const value = parseFloat(contribution);
    if (isNaN(value) || value <= 0) return;
    const newAmount = Math.min(
      goal.currentAmount + value,
      goal.targetAmount
    );
    onUpdate(goal.id, {
      currentAmount: newAmount,
      status: newAmount >= goal.targetAmount ? "COMPLETED" : "ACTIVE",
    });
    setContribution("");
    setUpdateOpen(false);
  }

  return (
    <>
      <Card className="overflow-hidden group">
        <div
          className="h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative"
          style={
            goal.imageUrl
              ? {
                  backgroundImage: `url(${goal.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}
          }
        >
          {!goal.imageUrl && <span className="text-5xl">🎯</span>}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => setUpdateOpen(true)}
              title="Adicionar valor"
            >
              <Plus size={13} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(goal.id)}
              title="Excluir meta"
            >
              <Trash2 size={13} />
            </Button>
          </div>
          <Badge
            className="absolute top-2 left-2"
            variant={goal.status === "COMPLETED" ? "default" : "secondary"}
          >
            {goal.status === "COMPLETED" ? "✓ Concluída" : "Ativa"}
          </Badge>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold">{goal.title}</h3>
            {goal.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {goal.description}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(goal.currentAmount)}</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Meta: {formatCurrency(goal.targetAmount)}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Faltam:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(remaining)}
              </span>
            </span>
            <span className="text-muted-foreground">
              {format(new Date(goal.targetDate), "dd/MM/yyyy")}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setUpdateOpen(true)}
          >
            <Plus size={14} className="mr-1" /> Adicionar valor
          </Button>
        </CardContent>
      </Card>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar valor à meta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{goal.title}</p>
          <div className="space-y-2">
            <Label>Quanto você guardou? (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="0,00"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setUpdateOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleContribution} className="flex-1">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
