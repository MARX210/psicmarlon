
"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, DollarSign, Banknote, Hourglass, CalendarCheck2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";

type Appointment = {
  id: number;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  price: number;
  status: string;
};

const chartConfig = {
  revenue: {
    label: "Receita",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function FinanceiroPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      const res = await fetch("/api/agendamentos");
      if (!res.ok) throw new Error("Erro ao buscar agendamentos");
      const data: Appointment[] = await res.json();
      setAppointments(data);
    } catch (error) {
      console.error("Erro no fetchAppointments:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
    if (!loggedIn) {
      window.location.href = "/login";
    } else {
      fetchAppointments();
    }
  }, []);

  const financialSummary = useMemo(() => {
    const now = new Date();
    const currentMonthInterval = {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };

    const totalRevenue = appointments
      .filter(app => app.status === "Pago")
      .reduce((sum, app) => sum + app.price, 0);

    const monthRevenue = appointments
      .filter(app =>
        app.status === "Pago" &&
        isWithinInterval(parseISO(app.date), currentMonthInterval)
      )
      .reduce((sum, app) => sum + app.price, 0);
      
    const pendingAmount = appointments
      .filter(app => app.status === "Realizado")
      .reduce((sum, app) => sum + app.price, 0);

    return { totalRevenue, monthRevenue, pendingAmount };
  }, [appointments]);

  const monthlyChartData = useMemo(() => {
    const revenueByMonth: { [key: string]: number } = {};

    appointments
      .filter(app => app.status === 'Pago')
      .forEach(app => {
        const date = parseISO(app.date);
        const month = getMonth(date);
        const year = getYear(date);
        const monthKey = format(new Date(year, month), 'MMM/yy', { locale: ptBR });

        if (!revenueByMonth[monthKey]) {
          revenueByMonth[monthKey] = 0;
        }
        revenueByMonth[monthKey] += app.price;
      });

    // Get last 6 months including current
    const dateKeys: string[] = [];
    let today = new Date();
    for(let i=5; i>=0; i--){
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      dateKeys.push(format(d, 'MMM/yy', { locale: ptBR }));
    }

    return dateKeys.map(month => ({
      month,
      revenue: revenueByMonth[month] || 0,
    }));
  }, [appointments]);


  const recentTransactions = useMemo(() => {
    return appointments
      .filter(app => ["Realizado", "Pago"].includes(app.status))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .slice(0, 10);
  }, [appointments]);

  const handleMarkAsPaid = async (appointmentId: number) => {
    const originalAppointments = [...appointments];
    
    // Optimistic update
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'Pago' } : a));

    try {
      const response = await fetch(`/api/agendamentos/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Pago' }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');
      
      toast({
        title: "Status Atualizado!",
        description: "A consulta foi marcada como paga.",
      });
      fetchAppointments(); // Re-sync with server
    } catch (error) {
      setAppointments(originalAppointments); // Revert on error
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar como pago.",
      });
    }
  };

  if (!isClient || !isLoggedIn || isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4">Carregando dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-center mb-4">
          Painel Financeiro
        </h1>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Acompanhe suas receitas, pagamentos pendentes e o desempenho do seu consultório.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialSummary.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total de consultas pagas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialSummary.monthRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">Faturamento de {format(new Date(), 'MMMM', { locale: ptBR })}.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialSummary.pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">Valor de consultas realizadas a receber.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="w-full h-[250px]">
              <BarChart data={monthlyChartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis tickFormatter={(value) => `R$${value / 1000}k`} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck2 /> Transações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length > 0 ? recentTransactions.map(app => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">{app.patientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(app.date), 'dd/MM/yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {app.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-center">
                      {app.status === "Realizado" ? (
                        <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(app.id)}>
                          Marcar como Pago
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center text-green-600 gap-1.5 text-sm">
                           <CheckCircle2 className="h-4 w-4" /> Pago
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">Nenhuma transação recente.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
