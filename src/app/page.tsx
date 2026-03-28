
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Calendar, 
  UserPlus, 
  Stethoscope, 
  Users, 
  DollarSign, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Loader2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
    setUserRole(localStorage.getItem("userRole"));

    if (!loggedIn) {
      window.location.href = "/login";
    }
  }, []);

  if (!isClient || !isLoggedIn) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4">Carregando...</p>
      </div>
    );
  }

  const isAdmin = userRole === 'Admin';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      {/* Overview Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Painel de Controle
          </h1>
          <p className="text-muted-foreground">
            Acesso rápido às ferramentas do consultório PsicMarlon.
          </p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-primary uppercase tracking-wider">Data de Hoje</p>
          <p className="text-2xl font-bold">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Primary Actions */}
        <QuickActionCard 
          href="/agenda"
          icon={<Calendar className="h-8 w-8 text-white" />}
          title="Minha Agenda"
          description="Consulte e gerencie seus agendamentos diários."
          bgColor="bg-blue-600"
          hoverBorder="hover:border-blue-600"
        />
        <QuickActionCard 
          href="/pacientes"
          icon={<Users className="h-8 w-8 text-white" />}
          title="Base de Pacientes"
          description="Acesse prontuários e dados cadastrais rapidamente."
          bgColor="bg-green-600"
          hoverBorder="hover:border-green-600"
        />
        {isAdmin ? (
          <QuickActionCard 
            href="/financeiro"
            icon={<DollarSign className="h-8 w-8 text-white" />}
            title="Financeiro"
            description="Fluxo de caixa, receitas e despesas da clínica."
            bgColor="bg-emerald-600"
            hoverBorder="hover:border-emerald-600"
          />
        ) : (
          <QuickActionCard 
            href="/profissionais"
            icon={<Stethoscope className="h-8 w-8 text-white" />}
            title="Equipe"
            description="Informações sobre os profissionais do consultório."
            bgColor="bg-slate-700"
            hoverBorder="hover:border-slate-700"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Registration Quick Link */}
        {isAdmin && (
          <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative group">
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl flex items-center gap-2">
                <UserPlus className="h-6 w-6" /> Novo Cadastro
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Adicione um novo paciente ao sistema em poucos segundos.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto font-bold shadow-lg">
                <Link href="/cadastro">Cadastrar Agora</Link>
              </Button>
            </CardContent>
            <UserPlus className="absolute -right-8 -bottom-8 h-48 w-48 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          </Card>
        )}

        {/* Informative Section */}
        <Card className="border-muted-foreground/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Gestão Eficiente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-accent/30 flex items-center justify-center shrink-0 mt-1">
                <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
              </div>
              <p className="text-sm">Prontuários eletrônicos com histórico completo de sessões.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-accent/30 flex items-center justify-center shrink-0 mt-1">
                <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
              </div>
              <p className="text-sm">Controle de inadimplência e status de pagamento automático.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-accent/30 flex items-center justify-center shrink-0 mt-1">
                <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
              </div>
              <p className="text-sm">Filtros avançados e busca inteligente por paciente ou ID.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual / Image Section */}
      <div className="relative rounded-2xl overflow-hidden h-[300px] shadow-xl">
        <Image
          src={"/images/imgmarlon-claro.jpg"}
          alt="Consultório"
          fill
          className="object-cover dark:hidden"
          data-ai-hint="modern clinic"
        />
        <Image
          src={"/images/imgmarlon.jpg"}
          alt="Consultório"
          fill
          className="object-cover hidden dark:block"
          data-ai-hint="modern clinic"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center p-8 md:p-12">
           <div className="max-w-md text-white space-y-4">
              <h2 className="text-3xl font-bold font-headline leading-tight">Excelência no Atendimento</h2>
              <p className="text-white/80">O foco do Dr. Marlon é o bem-estar dos pacientes. O sistema é apenas o meio para que sua excelência clínica brilhe no dia a dia.</p>
              <div className="flex items-center gap-2 text-accent font-bold">
                 <UserCheck className="h-5 w-5" />
                 <span>CRP Ativo: 08/44838</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ href, icon, title, description, bgColor, hoverBorder }: { href: string, icon: React.ReactNode, title: string, description: string, bgColor: string, hoverBorder: string }) {
  return (
    <Link href={href}>
      <Card className={cn(
        "h-full transition-all group cursor-pointer border-2 border-transparent shadow-md hover:shadow-lg",
        hoverBorder
      )}>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-lg",
            bgColor
          )}>
            {icon}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl group-hover:text-primary transition-colors">{title}</CardTitle>
            <CardDescription className="text-sm leading-snug">{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
