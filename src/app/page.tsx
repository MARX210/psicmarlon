"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, UserPlus, Stethoscope, UserCheck, LogOut, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  email: string;
  nome: string;
  role: 'medico' | 'recepcionista' | 'admin';
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const userData = localStorage.getItem('user');
    
    // A verificação do token agora é feita pelo middleware
    if (!userData) {
      // O middleware já deve ter redirecionado, mas como uma segurança extra
      router.push('/login');
      return;
    }
    
    try {
      setUser(JSON.parse(userData));
    } catch(e) {
      // Se os dados do usuário estiverem corrompidos, força o logout
      handleLogout();
    }
  }, [router]);

  const handleLogout = async () => {
    localStorage.removeItem('user');
    
    // Chama uma API para limpar o cookie httpOnly
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch(e) {
      console.error("Erro ao fazer logout", e)
    }

    toast({
      title: "Você saiu!",
      description: "Sua sessão foi encerrada com segurança.",
    });
    router.push('/login');
    router.refresh();
  };

  if (!isClient || !user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 md:space-y-24">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg shadow-sm border">
        <div>
           <p className="text-lg font-semibold text-foreground">Olá, {user.nome}!</p>
           <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
        </div>
        <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </Button>
      </div>

      <section className="text-center pt-8 md:pt-12">
        <div className="flex justify-center mb-6">
            <Stethoscope className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground">
          Bem-vindo ao seu Consultório Digital
        </h1>
        <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">
          Organize seus pacientes e sua agenda de forma simples, rápida e de forma inteligente.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/agenda">
              <Calendar className="mr-2 h-5 w-5" />
              <span className="font-bold">Ver Agenda</span>
            </Link>
          </Button>
           <Button asChild size="lg" variant="outline">
            <Link href="/cadastro">
              <UserPlus className="mr-2 h-5 w-5" />
              Cadastrar Paciente
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="text-center">
              <CardHeader>
                  <div className="flex justify-center mb-4">
                      <Calendar className="w-12 h-12 text-accent" />
                  </div>
                  <CardTitle className="font-headline">Agenda Organizada</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">
                      Visualize e gerencie todos os seus compromissos em apenas um local.
                  </p>
              </CardContent>
          </Card>
          <Card className="text-center">
              <CardHeader>
                  <div className="flex justify-center mb-4">
                      <UserCheck className="w-12 h-12 text-accent" />
                  </div>
                  <CardTitle className="font-headline">Gestão de Pacientes</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">
                      Cadastre e mantenha as informações dos seus pacientes de forma segura.
                  </p>
              </CardContent>
          </Card>
          <Card className="text-center md:col-span-2 lg:col-span-1">
              <CardHeader>
                  <div className="flex justify-center mb-4">
                      <Stethoscope className="w-12 h-12 text-accent" />
                  </div>
                  <CardTitle className="font-headline">Foco no Atendimento</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">
                      Passe menos tempo organizando e mais tempo cuidando dos seus pacientes.
                  </p>
              </CardContent>
          </Card>
      </section>

      <section className="bg-card p-6 md:p-8 rounded-lg shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold font-headline text-foreground">Pronto para organizar sua agenda?</h2>
              <p className="mt-2 text-muted-foreground">
                  Comece agora a otimizar seu tempo. Adicione um novo paciente ou visualize sua agenda de compromissos.
              </p>
               <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                 <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href="/agenda">
                    Ver Agenda
                  </Link>
                </Button>
                 <Button asChild size="lg" variant="outline">
                  <Link href="/cadastro">
                    Novo Paciente
                  </Link>
                </Button>
              </div>
          </div>
          <div className="flex-shrink-0">
            <Image 
                src={"/images/imgmarlon.jpg"}
                alt="Psicólogo em um ambiente de consultório"
                width={400}
                height={300}
                className="rounded-lg w-full max-w-sm h-auto"
                data-ai-hint="therapist office"
            />
          </div>
      </section>
    </div>
  );
}
