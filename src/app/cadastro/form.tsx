"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { patientRegistrationSchema } from "@/lib/schemas";
import type { z } from "zod";
import InputMask from "react-input-mask";

type PatientFormValues = z.infer<typeof patientRegistrationSchema>;

const patientTypes = {
  "1": "Cliente já fidelizado antigo",
  "2": "Cliente por indicação",
  "3": "Cliente pela página parceira",
  "4": "Cliente novo",
};

export function RegistrationForm() {
  const { toast } = useToast();
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      sexo: undefined,
      nascimento: "",
      email: "",
      celular: "",
      comoConheceu: "",
      tipoPaciente: undefined,
      cartaoId: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
    },
  });

  const [cep, setCep] = useState("");
  const selectedPatientType = form.watch("tipoPaciente");

  // Geração de cartaoId
  useEffect(() => {
    if (selectedPatientType) {
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 9);
      const uniqueId = `${selectedPatientType}-${timestamp}-${randomPart}`.toUpperCase().slice(0, 20);
      form.setValue("cartaoId", uniqueId);
    }
  }, [selectedPatientType, form]);

  // Busca CEP
  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.erro) {
            form.setValue("logradouro", data.logradouro);
            form.setValue("bairro", data.bairro);
            form.setValue("cidade", data.localidade);
            form.setValue("estado", data.uf);
            form.setValue("pais", "Brasil");
            toast({ title: "Endereço encontrado", description: "Campos preenchidos automaticamente." });
          } else {
            toast({ variant: "destructive", title: "CEP não encontrado", description: "Verifique o CEP digitado." });
          }
        })
        .catch(() => {
          toast({ variant: "destructive", title: "Erro na busca", description: "Não foi possível buscar o CEP." });
        });
    }
  }, [cep, form, toast]);

  // Submit
  async function onSubmit(data: PatientFormValues) {
    try {
      const response = await fetch("/api/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Algo deu errado no servidor.");
      }

      toast({ title: "Cadastro realizado", description: "Paciente cadastrado com sucesso." });
      form.reset();
      setCep("");

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error instanceof Error ? error.message : "Não foi possível cadastrar o paciente."
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>Informações básicas do paciente.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>Nome Completo*</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo do paciente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF*</FormLabel>
                  <FormControl>
                    <InputMask mask="999.999.999-99" {...field}>
                      {(inputProps: any) => <Input {...inputProps} placeholder="000.000.000-00" />}
                    </InputMask>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="sexo" render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                    <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="nascimento" render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Nascimento*</FormLabel>
                <FormControl>
                  <InputMask mask="99/99/9999" {...field}>
                    {(inputProps: any) => <Input {...inputProps} placeholder="dd/mm/aaaa" />}
                  </InputMask>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tipoPaciente" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Paciente*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(patientTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cartaoId" render={({ field }) => (
              <FormItem>
                <FormLabel>Nº Cartão/ID Gerado</FormLabel>
                <FormControl>
                  <Input placeholder="Selecione o tipo para gerar" {...field} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="celular" render={({ field }) => (
              <FormItem>
                <FormLabel>Celular</FormLabel>
                <FormControl>
                  <InputMask mask="(99) 99999-9999" {...field}>
                    {(inputProps: any) => <Input {...inputProps} placeholder="(99) 99999-9999" />}
                  </InputMask>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="comoConheceu" render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2 lg:col-span-3">
                <FormLabel>Como conheceu o consultório?</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Indicação, Google, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <FormField control={form.control} name="cep" render={({ field }) => (
              <FormItem className="sm:col-span-1">
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <InputMask
                    mask="99999-999"
                    value={cep}
                    onChange={(e) => {
                      field.onChange(e.target.value.replace(/\D/g, ''));
                      setCep(e.target.value);
                    }}
                  >
                    {(inputProps: any) => <Input {...inputProps} placeholder="00000-000" />}
                  </InputMask>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="logradouro" render={({ field }) => (
              <FormItem className="sm:col-span-2 md:col-span-3 lg:col-span-3">
                <FormLabel>Logradouro*</FormLabel>
                <FormControl>
                  <Input placeholder="Rua, Avenida, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="numero" render={({ field }) => (
              <FormItem>
                <FormLabel>Número*</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="complemento" render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input placeholder="Apto, Bloco, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bairro" render={({ field }) => (
              <FormItem className="md:col-span-1 lg:col-span-2">
                <FormLabel>Bairro*</FormLabel>
                <FormControl>
                  <Input placeholder="Bairro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cidade" render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade*</FormLabel>
                <FormControl>
                  <Input placeholder="Cidade" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="estado" render={({ field }) => (
              <FormItem>
                <FormLabel>Estado*</FormLabel>
                <FormControl>
                  <Input placeholder="UF" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pais" render={({ field }) => (
              <FormItem>
                <FormLabel>País*</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar Cadastro"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
