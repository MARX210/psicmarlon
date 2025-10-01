
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, DollarSign, Banknote, Hourglass, CalendarCheck2, CheckCircle2, TrendingUp, TrendingDown, Landmark, PlusCircle, Trash2, ArrowRightLeft, MoreHorizontal, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, getMonth, getYear, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type Appointment = {
  id: number;
  patientName: string;
  date: string; // YYYY-MM-DD
  price: number;
  status: string;
  professional: string;
};

type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'receita_consulta' | 'receita_outros' | 'despesa';
};

const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória."),
  amount: z.coerce.number().positive("O valor deve ser positivo."),
  type: z.enum(['receita_outros', 'despesa']),
  date: z.string(),
});
type TransactionFormValues = z.infer<typeof transactionSchema>;


const chartConfig = {
  revenue: { label: "Receita Clínica", color: "hsl(var(--chart-2))" },
  expenses: { label: "Despesa", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2000, i), "MMMM", { locale: ptBR }),
}));
const currentYear = getYear(new Date());
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);


export default function FinanceiroPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [otherTransactions, setOtherTransactions] = useState<Transaction[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(getMonth(new Date()));
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));

  const [isFormOpen, setIsFormOpen] = useState(false);

  const { toast } = useToast();
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: 0,
    }
  });


  const fetchAppointments = useCallback(async () => {
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
        description: "Não foi possível carregar os dados de agendamentos.",
      });
    }
  }, [toast]);

  const loadOtherTransactions = useCallback(() => {
    try {
      const stored = localStorage.getItem("otherTransactions");
      if (stored) {
        setOtherTransactions(JSON.parse(stored));
      }
    } catch(e) {
      console.error("Failed to load transactions from localStorage", e);
      setOtherTransactions([]);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
    if (!loggedIn) {
      window.location.href = "/login";
    } else {
      setIsLoading(true);
      Promise.all([fetchAppointments(), loadOtherTransactions()]).finally(() => setIsLoading(false));
    }
  }, [fetchAppointments, loadOtherTransactions]);

  const saveTransaction = (newTransaction: Transaction) => {
    const updatedTransactions = [...otherTransactions, newTransaction];
    setOtherTransactions(updatedTransactions);
    localStorage.setItem("otherTransactions", JSON.stringify(updatedTransactions));
  };
  
  const deleteTransaction = (id: string) => {
    const updatedTransactions = otherTransactions.filter(t => t.id !== id);
    setOtherTransactions(updatedTransactions);
    localStorage.setItem("otherTransactions", JSON.stringify(updatedTransactions));
    toast({ title: "Transação Removida", description: "O lançamento foi excluído com sucesso." });
  }

  const financialSummary = useMemo(() => {
    const selectedDate = new Date(selectedYear, selectedMonth);
    const interval = { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };

    const revenueFromAppointments = appointments
      .filter(app => app.status === "Pago" && isWithinInterval(parseISO(app.date), interval))
      .reduce((sum, app) => {
        let clinicShare = 0;
        if (app.professional === 'Psicólogo') {
            clinicShare = app.price; // 100% para a clínica
        } else { // Se for outro profissional
            if (app.price > 150) {
                clinicShare = app.price * 0.2; // 20% para a clínica
            } else {
                clinicShare = app.price * 0.5; // 50% para a clínica
            }
        }
        return sum + clinicShare;
      }, 0);

    const transactionsInPeriod = otherTransactions
      .filter(t => isWithinInterval(parseISO(t.date), interval));

    const otherRevenue = transactionsInPeriod
      .filter(t => t.type === 'receita_outros')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactionsInPeriod
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + t.amount, 0);

    const clinicTotalRevenue = revenueFromAppointments + otherRevenue;
    const netProfit = clinicTotalRevenue - totalExpenses;

    const totalBilledFromAppointments = appointments
      .filter(app => app.status === "Pago" && isWithinInterval(parseISO(app.date), interval))
      .reduce((sum, app) => sum + app.price, 0);

    return { clinicTotalRevenue, totalExpenses, netProfit, totalBilledFromAppointments };
}, [appointments, otherTransactions, selectedMonth, selectedYear]);
  
  const allTransactionsForPeriod: Transaction[] = useMemo(() => {
    const selectedDate = new Date(selectedYear, selectedMonth);
    const interval = { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };

    const fromAppointments: Transaction[] = appointments
        .filter(app => app.status === "Pago" && isWithinInterval(parseISO(app.date), interval))
        .map(app => ({
            id: `apt-${app.id}`,
            date: app.date,
            description: `Consulta - ${app.patientName} (${app.professional})`,
            amount: app.price,
            type: 'receita_consulta'
        }));

    const fromOthers: Transaction[] = otherTransactions
        .filter(t => isWithinInterval(parseISO(t.date), interval));
    
    return [...fromAppointments, ...fromOthers].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  }, [appointments, otherTransactions, selectedMonth, selectedYear]);

  const monthlyChartData = useMemo(() => {
    const dataByMonth: { [key: string]: { revenue: number, expenses: number } } = {};
    const today = new Date();

    for(let i=5; i>=0; i--){
      const d = subMonths(today, i);
      const monthKey = format(d, 'MMM/yy', { locale: ptBR });
      dataByMonth[monthKey] = { revenue: 0, expenses: 0 };
    }
    
    appointments.filter(a => a.status === 'Pago').forEach(app => {
      const date = parseISO(app.date);
      const monthKey = format(date, 'MMM/yy', { locale: ptBR });
      if (dataByMonth[monthKey]) {
          let clinicShare = 0;
          if (app.professional === 'Psicólogo') {
              clinicShare = app.price;
          } else {
              if (app.price > 150) {
                  clinicShare = app.price * 0.2;
              } else {
                  clinicShare = app.price * 0.5;
              }
          }
          dataByMonth[monthKey].revenue += clinicShare;
      }
    });
    
    otherTransactions.forEach(t => {
      const date = parseISO(t.date);
      const monthKey = format(date, 'MMM/yy', { locale: ptBR });
      if(dataByMonth[monthKey]) {
        if(t.type === 'receita_outros') dataByMonth[monthKey].revenue += t.amount;
        if(t.type === 'despesa') dataByMonth[monthKey].expenses += t.amount;
      }
    });

    return Object.entries(dataByMonth).map(([month, values]) => ({
      month,
      ...values
    }));
  }, [appointments, otherTransactions]);

  async function onTransactionSubmit(data: TransactionFormValues) {
    const newTransaction: Transaction = {
      ...data,
      id: `manual-${Date.now()}`,
    };
    saveTransaction(newTransaction);
    toast({ title: "Sucesso!", description: "Novo lançamento adicionado." });
    form.reset();
    setIsFormOpen(false);
  }

  if (!isClient || isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4">Carregando dados financeiros...</p>
      </div>
    );
  }

  const TransactionIcon = ({ type }: { type: Transaction['type'] }) => {
    switch (type) {
        case 'receita_consulta': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        case 'receita_outros': return <Landmark className="h-5 w-5 text-sky-500" />;
        case 'despesa': return <TrendingDown className="h-5 w-5 text-red-500" />;
        default: return <MoreHorizontal className="h-5 w-5 text-muted-foreground" />;
    }
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold font-headline">Painel Financeiro</h1>
            <p className="text-muted-foreground max-w-2xl">
            Analise as finanças do seu consultório por período.
            </p>
        </div>
        <div className="flex gap-2">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                Lucro Bruto (Receita Clínica)
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">Soma das comissões de consultas e outras receitas.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
             </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {financialSummary.clinicTotalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
             <p className="text-xs text-muted-foreground">Total faturado no mês: {financialSummary.totalBilledFromAppointments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {financialSummary.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">Custos fixos e variáveis.</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido do Mês</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialSummary.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">Lucro Bruto - Despesas.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Monthly Chart and Transactions */}
        <div className="lg:col-span-3 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Receita Clínica vs. Despesa (Últimos 6 meses)</CardTitle>
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
                        <Legend />
                        <Bar dataKey="revenue" name="Receita Clínica" fill="var(--color-revenue)" radius={4} />
                        <Bar dataKey="expenses" name="Despesa" fill="var(--color-expenses)" radius={4} />
                    </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <ArrowRightLeft /> Lançamentos do Mês
                    </CardTitle>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Lançamento Manual</DialogTitle>
                                <DialogDescription>Registre uma receita ou despesa que não seja de uma consulta.</DialogDescription>
                            </DialogHeader>
                             <form onSubmit={form.handleSubmit(onTransactionSubmit)} className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="type">Tipo de Lançamento</Label>
                                    <Select required onValueChange={(v) => form.setValue('type', v as 'receita_outros' | 'despesa')} >
                                        <SelectTrigger id="type">
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="receita_outros">Outra Receita</SelectItem>
                                            <SelectItem value="despesa">Despesa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <input type="hidden" {...form.register("date")} value={format(new Date(selectedYear, selectedMonth), "yyyy-MM-dd")} />

                                <div>
                                   <Label htmlFor="description">Descrição</Label>
                                   <Input id="description" {...form.register("description")} />
                                   {form.formState.errors.description && <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>}
                                </div>

                                <div>
                                   <Label htmlFor="amount">Valor (R$)</Label>
                                   <Input id="amount" type="number" step="0.01" {...form.register("amount")} />
                                   {form.formState.errors.amount && <p className="text-sm text-destructive mt-1">{form.formState.errors.amount.message}</p>}
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                                    <Button type="submit">Salvar Lançamento</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                       <TableHead className="w-[50px] text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTransactionsForPeriod.length > 0 ? allTransactionsForPeriod.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <TransactionIcon type={t.type} />
                            <div>
                                <div className="font-medium">{t.description}</div>
                                <div className="text-xs text-muted-foreground">
                                    {format(parseISO(t.date), 'dd/MM/yyyy')}
                                </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${t.type.startsWith('receita') ? 'text-green-600' : 'text-red-600'}`}>
                           {t.type === 'receita_consulta' ? '' : (t.type === 'receita_outros' ? '+' : '-')} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                         <TableCell className="text-right">
                           {t.id.startsWith('manual-') && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTransaction(t.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                           )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">Nenhum lançamento neste mês.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
