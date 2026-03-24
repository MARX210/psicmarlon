"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, Search, FileText, User, FileEdit, Trash2, Filter, Phone, MessageCircle, CalendarClock, CheckCircle2, XCircle, AlertCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";


type Patient = {
  id: string;
  nome: string;
  cpf: string | null;
  celular: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  created_at: string;
};

type Appointment = {
  id: number;
  patientId: string;
  patientName: string;
  date: string; 
  time: string; 
  type: string;
  status: string;
  professional: string;
};

type Prontuario = {
  id: number;
  data_registro: string;
  conteudo: string;
  profissional_nome: string;
};

type AppointmentStatus = "Confirmado" | "Realizado" | "Cancelado" | "Faltou" | "Pago";
type SortOption = "name-asc" | "name-desc" | "date-desc" | "date-asc";

const statusConfig: Record<AppointmentStatus, { label: string; icon: React.ElementType; color: string }> = {
  Confirmado: { label: "Confirmado", icon: CalendarClock, color: "text-blue-500" },
  Realizado: { label: "Realizado", icon: CheckCircle2, color: "text-green-500" },
  Pago: { label: "Pago", icon: CreditCard, color: "text-emerald-500" },
  Cancelado: { label: "Cancelado", icon: XCircle, color: "text-gray-500" },
  Faltou: { label: "Faltou", icon: AlertCircle, color: "text-red-500" },
};

const messageTemplates = {
  confirmacao: (nome: string, data: string, hora: string) => `Olá, ${nome}! Tudo bem? Gostaria de confirmar sua consulta para o dia ${data} às ${hora}.`,
  reagendamento: (nome: string) => `Olá, ${nome}! Tudo bem? Notei que você precisa reagendar sua consulta. Quais dias e horários seriam melhores para você?`,
  cancelamento: (nome: string) => `Olá, ${nome}. Recebi sua solicitação de cancelamento. Sem problemas! Se precisar, pode me chamar para agendar uma nova data.`,
};

const patientUpdateSchema = z.object({
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  celular: z.string().optional().or(z.literal('')),
  cep: z.string().optional().or(z.literal('')),
  logradouro: z.string().optional().or(z.literal('')),
  numero: z.string().optional().or(z.literal('')),
  complemento: z.string().optional(),
  bairro: z.string().optional().or(z.literal('')),
  cidade: z.string().optional().or(z.literal('')),
  estado: z.string().optional().or(z.literal('')),
  pais: z.string().optional().or(z.literal('')),
});

const prontuarioSchema = z.object({
  conteudo: z.string().min(10, "A anotação deve ter pelo menos 10 caracteres."),
});

type PatientUpdateFormValues = z.infer<typeof patientUpdateSchema>;
type ProntuarioFormValues = z.infer<typeof prontuarioSchema>;

const formatPhone = (phone: string | null) => {
    if (!phone) return "N/A";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
        return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    if (clean.length === 10) {
        return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
};

export default function PacientesPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [isProntuarioOpen, setIsProntuarioOpen] = useState(false);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [isLoadingProntuario, setIsLoadingProntuario] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const { toast } = useToast();
  const form = useForm<PatientUpdateFormValues>({
    resolver: zodResolver(patientUpdateSchema),
  });

  const prontuarioForm = useForm<ProntuarioFormValues>({
    resolver: zodResolver(prontuarioSchema),
    defaultValues: { conteudo: "" },
  });
  
  const isAdmin = userRole === 'Admin';

  const fetchAllData = useCallback(async (searchQuery = "") => {
    setIsLoading(true);
    try {
      let patientsUrl = `/api/pacientes`;
      if (searchQuery) {
          patientsUrl += `?search=${encodeURIComponent(searchQuery)}`;
      }

      const [patientsRes, appointmentsRes] = await Promise.all([
        fetch(patientsUrl),
        fetch('/api/agendamentos')
      ]);

      if (!patientsRes.ok) throw new Error('Erro ao buscar pacientes');
      if (!appointmentsRes.ok) throw new Error('Erro ao buscar agendamentos');
      
      const patientsData: Patient[] = await patientsRes.json();
      const appointmentsData: Appointment[] = await appointmentsRes.json();
      
      setPatients(patientsData);
      setAppointments(appointmentsData);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de Carregamento",
        description: error.message || "Não foi possível carregar os dados. Verifique a conexão.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isLoggedIn) {
        fetchAllData(searchTerm);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchAllData, isLoggedIn]);

  const fetchProntuarios = useCallback(async (pacienteId: string) => {
    if (!pacienteId) return;
    setIsLoadingProntuario(true);
    try {
        const profissionalIdQuery = userRole !== 'Admin' && userId ? `&profissionalId=${userId}` : '';
        const res = await fetch(`/api/prontuarios?pacienteId=${pacienteId}${profissionalIdQuery}`);
        if (!res.ok) throw new Error('Erro ao buscar prontuário');
        const data: Prontuario[] = await res.json();
        setProntuarios(data);
    } catch (error) {
         toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar o prontuário." });
         setProntuarios([]);
    } finally {
        setIsLoadingProntuario(false);
    }
  }, [toast, userId, userRole]);

  useEffect(() => {
    setIsClient(true);
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("userRole");
    const id = localStorage.getItem("userId");
    const name = localStorage.getItem("userName");
    
    setIsLoggedIn(loggedIn);
    setUserRole(role);
    setUserId(id);
    setUserName(name);
    setIsLoadingRole(false);

    if (!loggedIn) {
      window.location.href = "/login";
    }
  }, []);
  
  useEffect(() => {
    if (selectedPatient) {
      form.reset({
        email: selectedPatient.email || "",
        celular: selectedPatient.celular || "",
        cep: selectedPatient.cep || "",
        logradouro: selectedPatient.logradouro || "",
        numero: selectedPatient.numero || "",
        complemento: selectedPatient.complemento || "",
        bairro: selectedPatient.bairro || "",
        cidade: selectedPatient.cidade || "",
        estado: selectedPatient.estado || "",
        pais: selectedPatient.pais || "Brasil",
      });
    }
  }, [selectedPatient, form]);

  useEffect(() => {
    if(isProntuarioOpen && selectedPatient) {
        fetchProntuarios(selectedPatient.id);
    }
  }, [isProntuarioOpen, selectedPatient, fetchProntuarios]);

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
        switch (sortOption) {
            case "name-asc": return a.nome.localeCompare(b.nome);
            case "name-desc": return b.nome.localeCompare(a.nome);
            case "date-desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case "date-asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            default: return 0;
        }
    });
  }, [patients, sortOption]);

  const handleSendWhatsApp = () => {
    if (!selectedPatient?.celular) return;
    let phoneNumber = selectedPatient.celular.replace(/\D/g, "");
    if (phoneNumber.length >= 10 && !phoneNumber.startsWith('55')) {
      phoneNumber = '55' + phoneNumber;
    }
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setIsWhatsAppDialogOpen(false);
  };

  const handleUpdatePatient = async (data: PatientUpdateFormValues) => {
    if (!selectedPatient) return;
    setIsUpdating(true);
    try {
        const response = await fetch(`/api/pacientes/${selectedPatient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Erro ao atualizar');
        toast({ title: "Sucesso!", description: "Dados atualizados." });
        setSelectedPatient(null);
        fetchAllData(searchTerm);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro na atualização." });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const handleSaveProntuario = async (data: ProntuarioFormValues) => {
    if (!selectedPatient || !userId) return;
    try {
      const response = await fetch('/api/prontuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: selectedPatient.id,
          profissional_id: userId,
          conteudo: data.conteudo,
        }),
      });
      if (!response.ok) throw new Error('Erro ao salvar');
      toast({ title: 'Anotação salva com sucesso!' });
      prontuarioForm.reset();
      fetchProntuarios(selectedPatient.id);
    } catch (error) {
       toast({ variant: "destructive", title: "Erro ao Salvar" });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;
    try {
      const response = await fetch(`/api/pacientes/${patientToDelete.id}`, { method: 'DELETE' });
      if (response.status !== 204) throw new Error('Erro ao excluir');
      toast({ title: "Paciente Excluído!" });
      fetchAllData(searchTerm);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Excluir" });
    } finally {
      setShowDeleteAlert(false);
      setPatientToDelete(null);
    }
  };

  if (!isClient || isLoadingRole || isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-center mb-4">
          Gerenciar Pacientes
        </h1>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Gerencie o histórico e o prontuário dos seus pacientes de forma organizada.
        </p>
      </div>
      
      <div className="flex justify-center flex-col sm:flex-row gap-4">
        <div className="relative w-full max-w-md">
          <Input 
            placeholder="Buscar por Nome, ID ou CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4"/>
                <SelectValue placeholder="Ordenar por..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Recentemente Adicionados</SelectItem>
            <SelectItem value="date-asc">Mais Antigos</SelectItem>
            <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
            <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Nome do Paciente</TableHead>
              <TableHead className="font-bold">Nº ID / Cartão</TableHead>
              <TableHead className="font-bold">Telefone/Celular</TableHead>
              <TableHead className="text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPatients.length > 0 ? sortedPatients.map(patient => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground"/> {patient.nome}
                    </div>
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">{patient.id}</Badge>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5"/> {formatPhone(patient.celular)}
                    </div>
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(patient)} title="Atualizar Cadastro">
                            <FileEdit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedPatient(patient); setIsProntuarioOpen(true); }} title="Ver Prontuário">
                            <FileText className="h-4 w-4 text-sky-500" />
                        </Button>
                        {isAdmin && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setPatientToDelete(patient); setShowDeleteAlert(true); }} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={!!selectedPatient && !isProntuarioOpen} onOpenChange={(v) => !v && setSelectedPatient(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atualizar Cadastro: {selectedPatient?.nome}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-start gap-2 border-b pb-4">
            <Button onClick={() => setIsWhatsAppDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={() => setIsProntuarioOpen(true)}>
                <FileText className="mr-2 h-4 w-4 text-sky-500" /> Prontuário
            </Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdatePatient)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <FormField control={form.control} name="celular" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Celular</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="cep" render={({ field }) => (
                    <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="logradouro" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Logradouro</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="numero" render={({ field }) => (
                    <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="bairro" render={({ field }) => (
                    <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )} />
                <div className="md:col-span-2 flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setSelectedPatient(null)}>Cancelar</Button>
                    <Button type="submit" disabled={isUpdating}>{isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar</Button>
                </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Prontuário */}
      <Dialog open={isProntuarioOpen} onOpenChange={(v) => setIsProntuarioOpen(v)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Prontuário: {selectedPatient?.nome}</DialogTitle></DialogHeader>
          <ScrollArea className="flex-grow border rounded-lg p-4 my-4 bg-muted/20">
            {isLoadingProntuario ? <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div> :
              prontuarios.length > 0 ? (
                <div className="space-y-4">
                  {prontuarios.map(p => (
                    <div key={p.id} className="p-3 bg-card rounded-lg border-l-4 border-primary shadow-sm">
                      <p className="whitespace-pre-wrap text-sm">{p.conteudo}</p>
                      <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground flex justify-between italic">
                        <span>{p.profissional_nome}</span>
                        <span>{format(parseISO(p.data_registro), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center py-10 text-muted-foreground">Sem registros clínicos.</p>
            }
          </ScrollArea>
          <Form {...prontuarioForm}>
            <form onSubmit={prontuarioForm.handleSubmit(handleSaveProntuario)} className="space-y-4">
              <FormField control={prontuarioForm.control} name="conteudo" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Evolução Clínica</FormLabel><FormControl><Textarea rows={3} {...field}/></FormControl><FormMessage/></FormItem>
              )} />
              <DialogFooter><Button type="submit">Salvar Registro</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog WhatsApp */}
      <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Enviar WhatsApp para {selectedPatient?.nome}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <Select onValueChange={(v: any) => {
                    const next = appointments.find(a => a.patientId === selectedPatient?.id && new Date(a.date) >= new Date());
                    const d = next ? format(parseISO(next.date), 'dd/MM/yyyy') : '...';
                    const h = next ? next.time : '...';
                    if (v === 'confirmacao') setWhatsappMessage(messageTemplates.confirmacao(selectedPatient?.nome?.split(" ")[0] || "", d, h));
                    else if (v === 'reagendamento') setWhatsappMessage(messageTemplates.reagendamento(selectedPatient?.nome?.split(" ")[0] || ""));
                    else if (v === 'cancelamento') setWhatsappMessage(messageTemplates.cancelamento(selectedPatient?.nome?.split(" ")[0] || ""));
                }}>
                    <SelectTrigger><SelectValue placeholder="Modelos de mensagem"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="confirmacao">Confirmar Consulta</SelectItem>
                        <SelectItem value="reagendamento">Sugerir Reagendamento</SelectItem>
                        <SelectItem value="cancelamento">Confirmar Cancelamento</SelectItem>
                    </SelectContent>
                </Select>
                <Textarea placeholder="Mensagem..." value={whatsappMessage} onChange={e => setWhatsappMessage(e.target.value)} rows={5}/>
            </div>
            <DialogFooter>
                <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700 w-full">Abrir WhatsApp</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Paciente?</AlertDialogTitle>
          <AlertDialogDescription>Isso removerá permanentemente os dados e prontuários de {patientToDelete?.nome}.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
