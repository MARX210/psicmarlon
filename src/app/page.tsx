
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, UserPlus, Stethoscope, UserCheck, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
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

  return (
    <div className="space-y-16 md:space-y-24">
      <section className="text-center pt-12 md:pt-20">
        <div className="flex justify-center mb-6">
          <Stethoscope className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground">
          Bem-vindo ao seu Consultório Digital
        </h1>
        <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">
          Organize seus pacientes e sua agenda de forma simples, rápida e de
          forma inteligente.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
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
              Visualize e gerencie todos os seus compromissos em apenas um
              local.
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
              Cadastre e mantenha as informações dos seus pacientes de forma
              segura.
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
              Passe menos tempo organizando e mais tempo cuidando dos seus
              pacientes.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="bg-card p-6 md:p-8 rounded-lg shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold font-headline text-foreground">
            Pronto para organizar sua agenda?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Comece agora a otimizar seu tempo. Adicione um novo paciente ou
            visualize sua agenda de compromissos.
          </p>
          <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/agenda">Ver Agenda</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/cadastro">Novo Paciente</Link>
            </Button>
          </div>
        </div>
        <div className="flex-shrink-0">
          {/* Imagem para modo claro */}
          <Image
            src={"/images/imgmarlon-claro.jpg"}
            alt="Psicólogo em um ambiente de consultório"
            width={9000}
            height={900}
            className="rounded-lg w-full max-w-sm h-auto dark:hidden ml-[-10%]"
            data-ai-hint="therapist office"
          />

          {/* Imagem para modo escuro */}
          <Image
            src={"/images/imgmarlon.jpg"}
            alt="Psicólogo em um ambiente de consultório (modo escuro)"
            width={9000}
            height={900}
            className="rounded-lg w-full max-w-sm h-auto hidden dark:block ml-[-10%]"
            data-ai-hint="therapist office"
          />
        </div>
      </section>
    </div>
  );
}
