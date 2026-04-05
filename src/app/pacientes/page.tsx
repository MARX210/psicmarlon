
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Loader2, 
  Search, 
  FileText, 
  FileEdit, 
  Trash2, 
  MessageCircle, 
  Filter, 
  User, 
  X, 
  Check, 
  Users, 
  Calendar, 
  Clock, 
  Stethoscope, 
  MessageSquareQuote, 
  UserCheck, 
  UserX, 
  Info,
  Printer,
  Copy,
  FileOutput,
  FileDown
} from "lucide-react";
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
  DialogDescription,
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
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

const safeFormatDate = (dateVal: any, formatStr: string = "dd/MM/yyyy HH:mm") => {
  if (!dateVal) return "N/A";
  try {
    let dateObj: Date | null = null;
    if (dateVal instanceof Date) {
      dateObj = dateVal;
    } else {
      const s = String(dateVal);
      dateObj = parseISO(s);
      if (!isValid(dateObj)) dateObj = new Date(s);
    }
    if (dateObj && isValid(dateObj)) return format(dateObj, formatStr, { locale: ptBR });
  } catch (error) {}
  return "Data inválida";
};

// Document Templates
const getAtestadoTemplate = (patientName: string, cpf: string, date: string) => `
ATESTADO PSICOLÓGICO

Atesto para os devidos fins que o(a) Sr(a). ${patientName}, portador(a) do CPF nº ${cpf || "________________"}, encontra-se em acompanhamento psicológico nesta data, sendo necessário o afastamento de suas atividades pelo período de ________ dia(s).

CID: ________ (Opcional, mediante autorização do paciente)

Local e Data: ________________, ${date}.

________________________________________________
Dr. Marlon
Psicólogo Clínico - CRP: 08/44838
`.trim();

const getDeclaracaoTemplate = (patientName: string, cpf: string, date: string) => `
DECLARAÇÃO DE PRESENÇA

Declaro, para os devidos fins, que o(a) Sr(a). ${patientName}, portador(a) do CPF nº ${cpf || "________________"}, compareceu à sessão de psicoterapia realizada no dia ${date}, no período das ________ às ________.

Local e Data: ________________, ${date}.

________________________________________________
Dr. Marlon
Psicólogo Clínico - CRP: 08/44838
`.trim();

const getLaudoTemplate = (patientName: string, cpf: string, birth: string) => `
LAUDO PSICOLÓGICO

1. IDENTIFICAÇÃO
Nome: ${patientName}
CPF: ${cpf || "________________"}
Data de Nascimento: ${birth || "________________"}
Finalidade: ________________

2. DESCRIÇÃO DA DEMANDA
________________________________________________________________________________________________

3. PROCEDIMENTO
________________________________________________________________________________________________

4. ANÁLISE
________________________________________________________________________________________________

5. CONCLUSÃO
________________________________________________________________________________________________

Local e Data: ________________, ${new Date().toLocaleDateString('pt-BR')}.

________________________________________________
Dr. Marlon
Psicólogo Clínico - CRP: 08/44838
`.trim();

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
  
  // States para Documentos
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [selectedDocTemplate, setSelectedDocTemplate] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState("");

  const [patientHistory, setPatientHistory] = useState<HistoryItem[]>([]);
  const [isLoadingProntuario, setIsLoadingProntuario] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const { toast } = useToast();
  const form = useForm<PatientUpdateFormValues>({ resolver: zodResolver(patientUpdateSchema) });
  const prontuarioForm = useForm<ProntuarioFormValues>({ resolver: zodResolver(prontuarioSchema), defaultValues: { conteudo: "" } });

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

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
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
            data_registro: `${a.date}T${a.time}:00`,
            appointmentDetails: a
        }));
        const combined = [...historyAnotacoes, ...historyAgendamentos].sort((a, b) => new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime());
        setPatientHistory(combined);
    } catch (error) {
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
        await fetch(`/api/pacientes/${patient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newStatus }),
        });
        toast({ title: newStatus ? "Paciente Ativado" : "Paciente Inativado" });
        fetchAllData(searchTerm);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro" });
    }
  };

  const handleUpdatePatient = async (data: PatientUpdateFormValues) => {
    if (!selectedPatient) return;
    setIsUpdating(true);
    try {
        await fetch(`/api/pacientes/${selectedPatient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        toast({ title: "Sucesso!", description: "Dados atualizados com sucesso." });
        setIsUpdateOpen(false);
        setSelectedPatient(null);
        fetchAllData(searchTerm);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro na atualização" });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const handleSaveProntuario = async (data: ProntuarioFormValues) => {
    if (!selectedPatient || !userId) return;
    try {
      await fetch('/api/prontuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: selectedPatient.id, profissional_id: userId, conteudo: data.conteudo }),
      });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof PatientUpdateFormValues, mask: "cpf" | "nascimento" | "cep" | "celular") => {
    let value = e.target.value;
    const cleanValue = value.replace(/\D/g, "");
    let maskedValue = cleanValue;
    switch (mask) {
      case "cpf": maskedValue = cleanValue.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); break;
      case "nascimento": maskedValue = cleanValue.replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2"); break;
      case "cep": maskedValue = cleanValue.replace(/(\d{5})(\d)/, "$1-$2"); break;
      case "celular": maskedValue = cleanValue.length > 10 ? cleanValue.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2") : cleanValue.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2"); break;
    }
    const maxLength = { cpf: 14, nascimento: 10, cep: 9, celular: 15 };
    form.setValue(fieldName, maskedValue.slice(0, maxLength[mask]));
  };

  // Funções para Documentos
  const generateDocument = (type: string) => {
    if (!selectedPatient) return;
    const today = new Date().toLocaleDateString('pt-BR');
    let content = "";
    switch (type) {
      case 'atestado': content = getAtestadoTemplate(selectedPatient.nome, selectedPatient.cpf || "", today); break;
      case 'declaracao': content = getDeclaracaoTemplate(selectedPatient.nome, selectedPatient.cpf || "", today); break;
      case 'laudo': content = getLaudoTemplate(selectedPatient.nome, selectedPatient.cpf || "", selectedPatient.nascimento || ""); break;
    }
    setDocumentContent(content);
    setSelectedDocTemplate(type);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(documentContent);
    toast({ title: "Copiado!", description: "Texto pronto para colar no Word ou Google Docs." });
  };

  const printDocument = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Impressão de Documento - PsicMarlon</title>
            <style>
              body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; color: #333; white-space: pre-wrap; }
              @media print { body { padding: 0; } .no-print { display: none; } }
              h1 { text-align: center; text-transform: uppercase; margin-bottom: 40px; }
            </style>
          </head>
          <body>
            ${documentContent}
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
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
            <SelectTrigger className="w-full sm:w-48"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Ordenar por" /></SelectTrigger>
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
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{patient.nome}</div>
                </TableCell>
                <TableCell className={cn(!patient.is_active && "line-through opacity-50")}><Badge variant="outline" className="font-mono">{patient.id}</Badge></TableCell>
                <TableCell className={cn("text-muted-foreground font-mono", !patient.is_active && "line-through opacity-50")}>{formatPhone(patient.celular)}</TableCell>
                <TableCell className="text-right flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8", patient.is_active ? "text-green-500" : "text-muted-foreground")} onClick={() => handleToggleStatus(patient)}>
                        {patient.is_active ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setSelectedPatient(patient); setIsUpdateOpen(true); }}>
                        <FileEdit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-500" onClick={() => { setSelectedPatient(patient); setIsProntuarioOpen(true); }}>
                        <FileText className="h-4 w-4" />
                    </Button>
                    {userRole === 'Admin' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setPatientToDelete(patient); setShowDeleteAlert(true); }}>
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

      {/* Dialog Prontuário Integrado */}
      <Dialog open={isProntuarioOpen} onOpenChange={(v) => { setIsProntuarioOpen(v); if(!v) setSelectedPatient(null); }}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b flex flex-row justify-between items-center">
            <div>
                <DialogTitle>Prontuário e Evolução: {selectedPatient?.nome}</DialogTitle>
                <DialogDescription>Acesse o histórico clínico e gere documentos.</DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsDocumentsOpen(true)} className="gap-2 mr-6">
                <FileOutput className="h-4 w-4" />
                Documentos / PDFs
            </Button>
          </DialogHeader>

          <div className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="flex-grow p-6">
                {isLoadingProntuario ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Carregando...</p></div>
                ) : patientHistory.length > 0 ? (
                    <div className="space-y-6">
                        {patientHistory.map((item, idx) => {
                            const isAnotacao = item.historyType === 'anotacao';
                            return (
                                <div key={idx} className="relative flex items-start gap-6 group">
                                    <div className={`mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm z-10 ${isAnotacao ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {isAnotacao ? <MessageSquareQuote className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                                    </div>
                                    <div className="flex flex-col flex-grow min-w-0 bg-card border rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={isAnotacao ? "default" : "outline"} className="text-[10px] h-5">{isAnotacao ? 'ANOTAÇÃO' : 'AGENDA'}</Badge>
                                                <span className="text-xs text-muted-foreground font-medium"><Clock className="h-3 w-3 inline mr-1" />{safeFormatDate(item.data_registro)}</span>
                                            </div>
                                        </div>
                                        {isAnotacao ? (
                                            <>
                                                <p className="text-sm whitespace-pre-wrap">{item.conteudo}</p>
                                                <div className="mt-3 text-[10px] text-muted-foreground italic">Por {item.profissional_nome}</div>
                                            </>
                                        ) : (
                                            <div className="text-sm">
                                                <p className="font-semibold">Consulta {item.appointmentDetails?.type}</p>
                                                <p className="text-xs text-muted-foreground">{item.appointmentDetails?.professional} - R$ {item.appointmentDetails?.price.toFixed(2)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (<div className="flex flex-col items-center justify-center py-20 opacity-50"><FileText className="h-12 w-12 mb-4" /><p className="text-sm">Vazio.</p></div>)}
            </ScrollArea>
            <div className="p-6 bg-muted/30 border-t">
                <Form {...prontuarioForm}><form onSubmit={prontuarioForm.handleSubmit(handleSaveProntuario)} className="space-y-4">
                    <FormField control={prontuarioForm.control} name="conteudo" render={({ field }) => (
                        <FormItem><FormLabel className="text-sm font-bold">Nova Evolução Clínica</FormLabel><FormControl><Textarea placeholder="Descreva a sessão..." rows={3} className="bg-background" {...field}/></FormControl><FormMessage/></FormItem>
                    )} />
                    <div className="flex justify-end"><Button type="submit" size="sm" className="gap-2"><Check className="h-4 w-4" />Salvar</Button></div>
                </form></Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Documentos */}
      <Dialog open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
        <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Modelos de Documentos</DialogTitle>
            <DialogDescription>Gere atestados, declarações e laudos para {selectedPatient?.nome}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
            {/* Sidebar de Seleção */}
            <div className="w-full md:w-64 border-r bg-muted/20 p-4 space-y-2">
              <Button 
                variant={selectedDocTemplate === 'atestado' ? 'default' : 'ghost'} 
                className="w-full justify-start gap-2" 
                onClick={() => generateDocument('atestado')}
              >
                <FileText className="h-4 w-4" /> Atestado Psicológico
              </Button>
              <Button 
                variant={selectedDocTemplate === 'declaracao' ? 'default' : 'ghost'} 
                className="w-full justify-start gap-2" 
                onClick={() => generateDocument('declaracao')}
              >
                <ClipboardList className="h-4 w-4" /> Declaração de Presença
              </Button>
              <Button 
                variant={selectedDocTemplate === 'laudo' ? 'default' : 'ghost'} 
                className="w-full justify-start gap-2" 
                onClick={() => generateDocument('laudo')}
              >
                <FileOutput className="h-4 w-4" /> Laudo Psicológico
              </Button>
            </div>

            {/* Área de Visualização */}
            <div className="flex-grow flex flex-col p-6 bg-card">
              {selectedDocTemplate ? (
                <>
                  <ScrollArea className="flex-grow border rounded-md p-6 bg-white dark:bg-slate-900 shadow-inner">
                    <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground">
                      {documentContent}
                    </pre>
                  </ScrollArea>
                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
                      <Copy className="h-4 w-4" /> Copiar para Word/Docs
                    </Button>
                    <Button size="sm" onClick={printDocument} className="gap-2">
                      <Printer className="h-4 w-4" /> Imprimir / PDF
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center opacity-30">
                  <FileDown className="h-16 w-16 mb-4" />
                  <p>Selecione um modelo ao lado para visualizar e gerar.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Paciente?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Confirmar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
