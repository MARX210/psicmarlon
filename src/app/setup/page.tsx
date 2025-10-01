
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck } from "lucide-react";

const setupSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("O e-mail é inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSetupAllowed, setIsSetupAllowed] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/profissionais/count");
        if (!res.ok) {
          // Se a API falhar (ex: tabela não existe), permite o setup.
          if (res.status === 500) {
             const errorData = await res.json().catch(() => null);
             if (errorData && errorData.error?.includes("undefined_table") || errorData.error?.includes("does not exist")) {
                setIsSetupAllowed(true);
                return;
             }
          }
          throw new Error("Falha ao verificar o status do sistema.");
        }
        const data = await res.json();
        if (data.count === 0) {
          setIsSetupAllowed(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        // Se a API de contagem falhar, uma causa provável é a tabela não existir,
        // então devemos permitir a configuração.
        console.warn("Assumindo permissão de setup devido a erro na verificação:", error);
        setIsSetupAllowed(true);
      } finally {
        setIsLoading(false);
      }
    }
    checkSetup();
  }, [router, toast]);

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      nome: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SetupFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/profissionais', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "Admin" }), // A API vai forçar 'Admin' se for o primeiro
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Algo deu errado no cadastro.");
      }

      toast({
        title: "Administrador Criado!",
        description: "Você agora pode fazer login com suas novas credenciais.",
      });
      router.push("/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error instanceof Error ? error.message : "Não foi possível completar a operação.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4">Verificando sistema...</p>
      </div>
    );
  }

  if (!isSetupAllowed) {
    // Redirecionamento já foi acionado, mas mantemos isso como fallback.
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <p>Sistema já configurado. Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Configuração Inicial
          </CardTitle>
          <CardDescription>
            Crie a conta do administrador principal para iniciar o sistema.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de Acesso</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@email.com" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Crie uma senha forte" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Administrador"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
