
"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, PlusCircle, Edit, Trash2, ShieldCheck, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const professionalSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("O e-mail é inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional().or(z.literal('')),
  role: z.string().min(1, "A função é obrigatória."),
});

type ProfessionalFormValues = z.infer<typeof professionalSchema>;

type Professional = {
  id: number;
  nome: string;
  email: string;
  role: string;
  is_active: boolean;
};

export default function ProfissionaisPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState<Professional | null>(null);
  const [adminCount, setAdminCount] = useState(0);


  const { toast } = useToast();
  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
  });

  const fetchProfessionals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profissionais');
      if (!res.ok) throw new Error('Erro ao buscar profissionais');
      const data: Professional[] = await res.json();
      setProfessionals(data);
      const activeAdmins = data.filter(p => p.role === 'Admin' && p.is_active).length;
      setAdminCount(activeAdmins);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar a lista de profissionais.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("userRole");
    const id = localStorage.getItem("userId");
    
    setIsLoggedIn(loggedIn);
    setUserRole(role);
    setUserId(id);
    setIsLoadingRole(false);

    if (!loggedIn) {
      window.location.href = "/login";
    } else if (role !== "Admin") {
      window.location.href = "/";
    } else {
      fetchProfessionals();
    }
  }, []);
  
  useEffect(() => {
    if (editingProfessional) {
      form.reset({
        nome: editingProfessional.nome,
        email: editingProfessional.email,
        role: editingProfessional.role,
        password: "",
      });
    } else {
      form.reset({
        nome: "",
        email: "",
        password: "",
        role: "Psicólogo",
      });
    }
  }, [editingProfessional, form]);


  async function onFormSubmit(data: ProfessionalFormValues) {
    const isEditing = !!editingProfessional;
    const url = isEditing ? `/api/profissionais/${editingProfessional.id}` : '/api/profissionais';
    const method = isEditing ? 'PUT' : 'POST';

    const submissionData: any = { ...data };
    if (isEditing && (!data.password || data.password.trim() === '')) {
        delete submissionData.password;
    } else if (!isEditing && (!data.password || data.password.trim() === '')) {
        form.setError("password", { message: "A senha é obrigatória para novos profissionais." });
        return;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Algo deu errado ao ${isEditing ? 'atualizar' : 'cadastrar'}.`);
      }

      toast({ title: "Sucesso!", description: `Profissional ${isEditing ? 'atualizado' : 'adicionado'}.` });
      form.reset();
      setIsFormOpen(false);
      setEditingProfessional(null);
      fetchProfessionals();
    } catch (error) {
      toast({
        variant: "destructive",
        title: `Erro ao ${isEditing ? 'Atualizar' : 'Cadastrar'}`,
        description: error instanceof Error ? error.message : "Não foi possível completar a operação.",
      });
    }
  }

  const handleToggleActive = async (professional: Professional) => {
    const newStatus = !professional.is_active;
    try {
      const response = await fetch(`/api/profissionais/${professional.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }
      
      toast({
        title: "Status Alterado!",
        description: `O profissional ${professional.nome} foi ${newStatus ? 'ativado' : 'bloqueado'}.`
      });
      fetchProfessionals();

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro ao Alterar Status",
            description: error instanceof Error ? error.message : "Não foi possível alterar o status.",
        });
    }
  };

  const handleDeleteClick = (professional: Professional) => {
    setProfessionalToDelete(professional);
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!professionalToDelete) return;
    try {
        const response = await fetch(`/api/profissionais/${professionalToDelete.id}`, {
            method: 'DELETE',
        });
        if (response.status === 204) {
             toast({
                title: "Profissional Excluído!",
                description: "O registro foi removido permanentemente.",
            });
        } else if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Erro ao excluir profissional.");
        }
        fetchProfessionals();
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro ao Excluir",
            description: error instanceof Error ? error.message : "Ocorreu um erro.",
        });
    } finally {
        setShowDeleteAlert(false);
        setProfessionalToDelete(null);
    }
  };
  
  const handleOpenForm = (professional: Professional | null) => {
    setEditingProfessional(professional);
    setIsFormOpen(true);
  }


  if (!isClient || isLoadingRole || !isLoggedIn || userRole !== "Admin") {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-headline">
            Gerenciar Profissionais
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Adicione, edite ou remova profissionais do sistema.
          </p>
        </div>
        <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Profissional
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          if(!isOpen) setEditingProfessional(null);
          setIsFormOpen(isOpen);
      }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProfessional ? 'Editar Profissional' : 'Adicionar Novo Profissional'}</DialogTitle>
              <DialogDescription>
                {editingProfessional ? 'Altere os dados abaixo.' : 'Preencha os dados para criar um novo acesso.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input placeholder="Nome do profissional" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl><Input type="password" placeholder={editingProfessional ? "Deixe em branco para não alterar" : "Crie uma senha forte"} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função (separe com vírgulas)</FormLabel>
                    <FormControl><Input placeholder="Ex: Psicólogo,Nutricionista" {...field} disabled={editingProfessional?.id === Number(userId) && adminCount <= 1} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionals.length > 0 ? professionals.map(pro => {
                 const isLastAdmin = pro.role === 'Admin' && adminCount <= 1;
                 const isSelf = pro.id === Number(userId);

                return (
                  <TableRow key={pro.id}>
                    <TableCell className="font-medium">{pro.nome}</TableCell>
                    <TableCell>{pro.email}</TableCell>
                    <TableCell>{pro.role}</TableCell>
                    <TableCell>
                      {pro.is_active ? (
                        <Badge variant="secondary" className="text-green-600 border-green-600/50">
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <ShieldOff className="mr-1 h-3.5 w-3.5" /> Bloqueado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Switch
                          checked={pro.is_active}
                          onCheckedChange={() => handleToggleActive(pro)}
                          aria-label="Ativar ou bloquear profissional"
                          disabled={isSelf && isLastAdmin}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(pro)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(pro)} disabled={isSelf && isLastAdmin}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Nenhum profissional cadastrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

       <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o profissional
              <span className="font-bold"> {professionalToDelete?.nome} </span>
              e todo o seu acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProfessionalToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
