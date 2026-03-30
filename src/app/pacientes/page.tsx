"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, Search, FileText, FileEdit, Trash2, MessageCircle, Filter, User, X, Check, Users, Calendar, Clock, Stethoscope, MessageSquareQuote, UserCheck, UserX, Info } from "lucide-react";
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
import { format, parseISO, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Patient = {
  id: string;
  nome: string;
  cpf: string | null;
  celular: string | null;
  email: string | null;
  sexo: string | null;
  nascimento: string | null;
  como_conheceu: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  created_at: string;
  is_active: boolean;
};

const patientUpdateSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
  celular: z.string().min(10, "Celular é obrigatório."),
  cpf: z.string().optional().nullable().or(z.literal('')),
  sexo: z.string().optional().nullable().or(z.literal('')),
  nascimento: z.string().optional().nullable().or(z.literal('')),
  como_conheceu: z.string().optional().nullable().or(z.literal('')),
  cep: z.string().optional().nullable().or(z.literal('')),
  logradouro: z.string().optional().nullable().or(z.literal('')),
  numero: z.string().optional().nullable().or(z.literal('')),
  complemento: z.string().optional().nullable().or(z.literal('')),
  bairro: z.string().optional().nullable().or(z.literal('')),
  cidade: z.string().optional().nullable().or(z.literal('')),
  estado: z.string().optional().nullable().or(z.literal('')),
  pais: z.string().optional().nullable().or(z.literal('')),
});

const prontuarioSchema = z.object({
  conteudo: z.string().min(5, "A anotação deve ter pelo menos 5 caracteres."),
});

type PatientUpdateFormValues = z.infer<typeof patientUpdateSchema>;
type ProntuarioFormValues = z.infer<typeof prontuarioSchema>;

type Prontuario = {
  id: number;
  data_registro: string;
  conteudo: string;
  profissional_nome: string;
};

type Appointment = {
  id: number;
  date: string;
  time: string;
  professional: string;
  type: string;
  status: string;
  price: number;
  duration: number;
};

type HistoryItem = {
  id: number | string;
  historyType: 'anotacao' | 'agendamento';
  data_registro: string;
  conteudo?: string;
  profissional_nome?: string;
  appointmentDetails?: Appointment;
};

const formatPhone = (phone: string | null) => {
    if (!phone) return "N/A";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (clean.length === 10) return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return phone;
};

// Função de formatação de data extremamente resiliente
const safeFormatDate = (dateVal: any, formatStr: string = "dd/MM/yyyy HH:mm") => {
  if (!dateVal) return "N/A";
  
  try {
    let dateObj: Date | null = null;

    if (dateVal instanceof Date) {
      dateObj = dateVal;
    } else {
      const s = String(dateVal);
      
      // 1. Tenta parseISO (muito eficiente para strings vindas de JSON)
      dateObj = parseISO(s);
      
      // 2. Se falhou, tenta o construtor nativo do JavaScript
      if (!isValid(dateObj)) {
        dateObj = new Date(s);
      }

      // 3. Se falhou e tem espaço, tenta formatar para ISO trocando espaço por T
      if (!isValid(dateObj) && s.includes(' ')) {
        dateObj = new Date(s.replace(' ', 'T'));
      }
      
      // 4. Se falhou, tenta um parse manual robusto (YYYY-MM-DD HH:mm:ss)
      if (!isValid(dateObj)) {
        const parts = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (parts) {
          const year = parseInt(parts[1]);
          const month = parseInt(parts[2]) - 1;
          const day = parseInt(parts[3]);
          const hour = parts[4] ? parseInt(parts[4]) : 0;
          const minute = parts[5] ? parseInt(parts[5]) : 0;
          const second = parts[6] ? parseInt(parts[6]) : 0;
          dateObj = new Date(year, month, day, hour, minute, second);
        }
      }
    }

    if (dateObj && isValid(dateObj)) {
      return format(dateObj, formatStr, { locale: ptBR });
    }
  } catch (error) {
    // Silencia o erro para não poluir
  }
  
  return "Data inválida";
};

export default function PacientesPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [isProntuarioOpen, setIsProntuarioOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [patientHistory, setPatientHistory] = useState<HistoryItem[]>([]);
  const [isLoadingProntuario, setIsLoadingProntuario] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const { toast } = useToast();
  const form = useForm<PatientUpdateFormValues>({ resolver: zodResolver(patientUpdateSchema) });
  const prontuarioForm = useForm<ProntuarioFormValues>({ resolver: zodResolver(prontuarioSchema), defaultValues: { conteudo: "" } });

  const cepValue = form.watch("cep");

  const fetchAllData = useCallback(async (searchQuery = "") => {
    setIsLoading(true);
    try {
      const patientsRes = await fetch(`/api/pacientes${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      if (!patientsRes.ok) throw new Error('Falha ao carregar dados');
      setPatients(await patientsRes.json());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setIsClient(true);
    setUserRole(localStorage.getItem("userRole"));
    setUserId(localStorage.getItem("userId"));
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const delay = setTimeout(() => fetchAllData(searchTerm), 500);
    return () => clearTimeout(delay);
  }, [searchTerm, fetchAllData]);

  useEffect(() => {
    const cleanCep = cepValue?.replace(/\D/g, "") || "";
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
          }
        })
        .catch(() => {});
    }
  }, [cepValue, form, toast]);

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      switch (sortBy) {
        case "name-asc": return a.nome.localeCompare(b.nome);
        case "name-desc": return b.nome.localeCompare(a.nome);
        case "date-desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });
  }, [patients, sortBy]);

  const fetchPatientHistory = useCallback(async (pacienteId: string) => {
    setIsLoadingProntuario(true);
    try {
        const [prontRes, appRes] = await Promise.all([
            fetch(`/api/prontuarios?pacienteId=${pacienteId}`),
            fetch(`/api/agendamentos?patientId=${pacienteId}`)
        ]);

        if (!prontRes.ok || !appRes.ok) throw new Error('Falha ao buscar histórico');

        const prontuarios: Prontuario[] = await prontRes.json();
        const agendamentos: Appointment[] = await appRes.json();

        const historyAnotacoes: HistoryItem[] = prontuarios.map(p => ({
            id: p.id,
            historyType: 'anotacao',
            data_registro: p.data_registro,
            conteudo: p.conteudo,
            profissional_nome: p.profissional_nome
        }));

        const historyAgendamentos: HistoryItem[] = agendamentos.map(a => ({
            id: `app-${a.id}`,
            historyType: 'agendamento',
            data_registro: `${a.date}T${a.time}:00`, // Formato ISO robusto YYYY-MM-DDTHH:mm:00
            appointmentDetails: a
        }));

        const combined = [...historyAnotacoes, ...historyAgendamentos].sort((a, b) => {
            const dateA = new Date(a.data_registro).getTime();
            const dateB = new Date(b.data_registro).getTime();
            return dateB - dateA;
        });

        setPatientHistory(combined);
    } catch (error) {
        console.error(error);
        setPatientHistory([]);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar o histórico." });
    } finally {
        setIsLoadingProntuario(false);
    }
  }, [toast]);

  useEffect(() => {
    if(isProntuarioOpen && selectedPatient) fetchPatientHistory(selectedPatient.id);
  }, [isProntuarioOpen, selectedPatient, fetchPatientHistory]);

  const handleToggleStatus = async (patient: Patient) => {
    try {
        const newStatus = !patient.is_active;
        const res = await fetch(`/api/pacientes/${patient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newStatus }),
        });
        if (!res.ok) throw new Error('Erro ao atualizar status');
        toast({ title: newStatus ? "Paciente Ativado" : "Paciente Inativado" });
        fetchAllData(searchTerm);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro" });
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedPatient?.celular) return;
    let phoneNumber = selectedPatient.celular.replace(/\D/g, "");
    if (phoneNumber.length >= 10 && !phoneNumber.startsWith('55')) phoneNumber = '55' + phoneNumber;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
    setIsWhatsAppDialogOpen(false);
  };

  const handleUpdatePatient = async (data: PatientUpdateFormValues) => {
    if (!selectedPatient) return;
    setIsUpdating(true);
    try {
        const res = await fetch(`/api/pacientes/${selectedPatient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Erro ao atualizar');
        toast({ title: "Sucesso!", description: "Dados atualizados com sucesso." });
        setIsUpdateOpen(false);
        setSelectedPatient(null);
        fetchAllData(searchTerm);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro na atualização", description: "Não foi possível salvar as alterações." });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const handleSaveProntuario = async (data: ProntuarioFormValues) => {
    if (!selectedPatient || !userId) return;
    try {
      const res = await fetch('/api/prontuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: selectedPatient.id, profissional_id: userId, conteudo: data.conteudo }),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      toast({ title: 'Anotação salva!' });
      prontuarioForm.reset();
      fetchPatientHistory(selectedPatient.id);
    } catch (error) {
       toast({ variant: "destructive", title: "Erro ao salvar" });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;
    try {
      await fetch(`/api/pacientes/${patientToDelete.id}`, { method: 'DELETE' });
      toast({ title: "Excluído!", description: "Paciente removido com sucesso." });
      fetchAllData(searchTerm);
    } finally {
      setShowDeleteAlert(false);
      setPatientToDelete(null);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: keyof PatientUpdateFormValues,
    mask: "cpf" | "nascimento" | "cep" | "celular"
  ) => {
    let value = e.target.value;
    const cleanValue = value.replace(/\D/g, "");
    let maskedValue = cleanValue;

    switch (mask) {
      case "cpf":
        maskedValue = cleanValue
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        break;
      case "nascimento":
        maskedValue = cleanValue
          .replace(/(\d{2})(\d)/, "$1/$2")
          .replace(/(\d{2})(\d)/, "$1/$2");
        break;
      case "cep":
        maskedValue = cleanValue.replace(/(\d{5})(\d)/, "$1-$2");
        break;
      case "celular":
        if (cleanValue.length > 10) {
          maskedValue = cleanValue
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2");
        } else {
          maskedValue = cleanValue
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2");
        }
        break;
    }

    const maxLength = { cpf: 14, nascimento: 10, cep: 9, celular: 15 };
    form.setValue(fieldName, maskedValue.slice(0, maxLength[mask]));
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return "";
      return format(date, "dd/MM/yyyy");
    } catch {
      return dateString;
    }
  };

  if (!isClient) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold font-headline">Gerenciar Pacientes</h1>
          <Badge variant="secondary" className="px-2 py-1 flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4" />
            {patients.length} {patients.length === 1 ? 'Paciente' : 'Pacientes'}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-grow sm:w-64">
            <Input placeholder="Buscar por Nome ou ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Mais Novos</SelectItem>
              <SelectItem value="date-asc">Mais Antigos</SelectItem>
              <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
              <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
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
            {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
            ) : sortedPatients.length > 0 ? sortedPatients.map(patient => (
              <TableRow key={patient.id} className={cn("hover:bg-muted/30 transition-colors", !patient.is_active && "bg-muted/20")}>
                <TableCell className={cn("font-medium", !patient.is_active && "line-through opacity-50")}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {patient.nome}
                    {!patient.is_active && <Badge variant="outline" className="text-[10px] ml-2">Inativo</Badge>}
                  </div>
                </TableCell>
                <TableCell className={cn(!patient.is_active && "line-through opacity-50")}>
                    <Badge variant="outline" className="font-mono">{patient.id}</Badge>
                </TableCell>
                <TableCell className={cn("text-muted-foreground font-mono", !patient.is_active && "line-through opacity-50")}>
                    {formatPhone(patient.celular)}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8", patient.is_active ? "text-green-500" : "text-muted-foreground")} onClick={() => handleToggleStatus(patient)} title={patient.is_active ? "Inativar" : "Ativar"}>
                        {patient.is_active ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { 
                        setSelectedPatient(patient); 
                        setIsProntuarioOpen(false); 
                        setIsUpdateOpen(true);
                        form.reset({ 
                            nome: patient.nome,
                            email: patient.email || '', 
                            celular: patient.celular || '',
                            cpf: patient.cpf || '',
                            sexo: patient.sexo || '',
                            nascimento: formatDateForInput(patient.nascimento),
                            como_conheceu: patient.como_conheceu || '',
                            cep: patient.cep || '',
                            logradouro: patient.logradouro || '',
                            numero: patient.numero || '',
                            complemento: patient.complemento || '',
                            bairro: patient.bairro || '',
                            cidade: patient.cidade || '',
                            estado: patient.estado || '',
                            pais: patient.pais || 'Brasil',
                        }); 
                    }} title="Atualizar Cadastro">
                        <FileEdit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-500" onClick={() => { 
                        setSelectedPatient(patient); 
                        setIsUpdateOpen(false);
                        setIsProntuarioOpen(true); 
                    }} title="Ver Prontuário">
                        <FileText className="h-4 w-4" />
                    </Button>
                    {userRole === 'Admin' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setPatientToDelete(patient); setShowDeleteAlert(true); }} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum paciente encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Edição Completa */}
      <Dialog open={isUpdateOpen} onOpenChange={(v) => {
          setIsUpdateOpen(v);
          if(!v) setSelectedPatient(null);
      }}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle>Atualizar Cadastro: {selectedPatient?.nome}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto px-6 py-4">
            <div className="flex gap-2 mb-6">
              <Button onClick={() => { setWhatsappMessage(`Olá, ${selectedPatient?.nome?.split(" ")[0]}! Tudo bem?`); setIsWhatsAppDialogOpen(true); }} className="bg-green-600 hover:bg-green-700 w-full">
                  <MessageCircle className="mr-2 h-4 w-4" /> Iniciar conversa no WhatsApp
              </Button>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdatePatient)} className="space-y-6 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="nome" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Nome Completo*</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="cpf" render={({ field }) => (
                      <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} onChange={(e) => handleInputChange(e, "cpf", "cpf")}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="nascimento" render={({ field }) => (
                      <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input placeholder="dd/mm/aaaa" {...field} onChange={(e) => handleInputChange(e, "nascimento", "nascimento")}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="sexo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                          <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="como_conheceu" render={({ field }) => (
                      <FormItem><FormLabel>Como conheceu?</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm">Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="celular" render={({ field }) => (
                        <FormItem><FormLabel>Celular*</FormLabel><FormControl><Input {...field} onChange={(e) => handleInputChange(e, "celular", "celular")}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm">Endereço (Opcional)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="cep" render={({ field }) => (
                        <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} onChange={(e) => handleInputChange(e, "cep", "cep")}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="logradouro" render={({ field }) => (
                        <FormItem className="col-span-2 md:col-span-3"><FormLabel>Logradouro</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="numero" render={({ field }) => (
                        <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="complemento" render={({ field }) => (
                        <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="bairro" render={({ field }) => (
                        <FormItem className="col-span-2"><FormLabel>Bairro</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="cidade" render={({ field }) => (
                        <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="estado" render={({ field }) => (
                        <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                </div>
              </form>
            </Form>
          </div>

          <div className="flex justify-end gap-2 p-4 border-t bg-background sticky bottom-0 z-20">
              <Button type="button" variant="ghost" onClick={() => {
                  setIsUpdateOpen(false);
                  setSelectedPatient(null);
              }}>Cancelar</Button>
              <Button type="submit" disabled={isUpdating} onClick={form.handleSubmit(handleUpdatePatient)}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Alterações
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Prontuário Integrado */}
      <Dialog open={isProntuarioOpen} onOpenChange={(v) => {
          setIsProntuarioOpen(v);
          if(!v) setSelectedPatient(null);
      }}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Histórico Clínico e Evolução: {selectedPatient?.nome}</DialogTitle>
          </DialogHeader>

          <div className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow p-6">
                {isLoadingProntuario ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Carregando histórico do paciente...</p>
                    </div>
                ) : patientHistory.length > 0 ? (
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
                        {patientHistory.map((item, idx) => {
                            const isAnotacao = item.historyType === 'anotacao';
                            return (
                                <div key={`${item.historyType}-${item.id}-${idx}`} className="relative flex items-start gap-6 group">
                                    <div className={`mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm z-10 ${isAnotacao ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {isAnotacao ? <MessageSquareQuote className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                                    </div>
                                    <div className="flex flex-col flex-grow min-w-0 bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={isAnotacao ? "default" : "outline"} className="text-[10px] h-5">
                                                    {isAnotacao ? 'ANOTAÇÃO CLÍNICA' : 'AGENDAMENTO'}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {safeFormatDate(item.data_registro)}
                                                </span>
                                            </div>
                                            {!isAnotacao && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {item.appointmentDetails?.status}
                                                </Badge>
                                            )}
                                        </div>

                                        {isAnotacao ? (
                                            <>
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                                                    {item.conteudo}
                                                </p>
                                                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
                                                    <User className="h-3 w-3" />
                                                    Registrado por {item.profissional_nome}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold">
                                                    Consulta {item.appointmentDetails?.type} de {item.appointmentDetails?.duration} min
                                                </p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Stethoscope className="h-3 w-3" /> {item.appointmentDetails?.professional}
                                                    </span>
                                                    <span>R$ {item.appointmentDetails?.price.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <FileText className="h-12 w-12 mb-4" />
                        <p className="text-sm">Nenhum evento registrado no histórico deste paciente.</p>
                    </div>
                )}
            </ScrollArea>

            <div className="p-6 bg-muted/30 border-t mt-auto">
                <Form {...prontuarioForm}>
                    <form onSubmit={prontuarioForm.handleSubmit(handleSaveProntuario)} className="space-y-4">
                        <FormField control={prontuarioForm.control} name="conteudo" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-bold flex items-center gap-2">
                                    <MessageSquareQuote className="h-4 w-4 text-primary" />
                                    Registrar Nova Evolução Clínica / Comentário
                                </FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Descreva o resumo da sessão ou anotações importantes..." 
                                        rows={3} 
                                        className="bg-background resize-none shadow-inner"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="flex justify-end">
                            <Button type="submit" size="sm" className="gap-2">
                                <Check className="h-4 w-4" />
                                Registrar Anotação
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog WhatsApp */}
      <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>WhatsApp: {selectedPatient?.nome}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <Select onValueChange={v => {
                    const first = selectedPatient?.nome?.split(" ")[0] || "";
                    if (v === 'confirmacao') setWhatsappMessage(`Olá, ${first}! Gostaria de confirmar nossa consulta agendada.`);
                    else if (v === 'reagendamento') setWhatsappMessage(`Olá, ${first}! Preciso reagendar nossa consulta por motivo de força maior. Podemos ver um novo horário?`);
                }}>
                    <SelectTrigger><SelectValue placeholder="Usar um modelo de mensagem"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="confirmacao">Confirmar Consulta</SelectItem>
                        <SelectItem value="reagendamento">Pedir Reagendamento</SelectItem>
                    </SelectContent>
                </Select>
                <FormLabel>Mensagem Personalizada</FormLabel>
                <Textarea value={whatsappMessage} onChange={e => setWhatsappMessage(e.target.value)} rows={5}/>
                <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700 w-full font-bold">Abrir Conversa</Button>
            </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Paciente?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação é permanente e removerá todos os dados e o histórico clínico de {patientToDelete?.nome}.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Confirmar Exclusão</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}