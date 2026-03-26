import { Header } from "@/components/layout/header";

export default function DashboardPage() {
  return (
    <div>
      <Header title="Dashboard" />
      <main className="p-6">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </main>
    </div>
  );
}
