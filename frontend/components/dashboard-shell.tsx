import { Button } from "@/components/ui/button";

export function DashboardShell() {
  return (
    <main className="container py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">KPI Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Monitor key business metrics in real time.
          </p>
        </div>
        <Button>Refresh KPIs</Button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Example KPI
          </p>
          <p className="mt-2 text-2xl font-bold">123</p>
        </div>
      </section>
    </main>
  );
}

