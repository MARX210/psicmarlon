
"use client";

import { SchedulingForm } from "./scheduling-form";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function AgendaPage() {
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
    <div>
      <h1 className="text-3xl md:text-4xl font-bold font-headline text-center mb-8">
        Minha Agenda
      </h1>
      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Visualize seus compromissos e agende novas consultas.
      </p>
      <SchedulingForm />
    </div>
  );
}
