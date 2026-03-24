"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, Search, Edit, CalendarClock, CheckCircle2, XCircle, AlertCircle, CreditCard, MessageCircle, FileText, User, FileEdit, Trash2, Filter, Phone } from "lucide-react";
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
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
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
type SortOption = "name-asc" | "name-desc" | "date-asc" | "date-desc";

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
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [isProntuarioOpen, setIsProntuarioOpen] = useState(false);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [isLoadingProntuario, setIsLoadingProntuario] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);



  const { toast } = useToast();
  const form = useForm<PatientUpdateFormValues>({
    resolver: zodResolver(patientUpdateSchema),
  });

  const prontuarioForm = useForm<ProntuarioFormValues>({
    resolver: zodResolver(prontuarioSchema),
    defaultValues: { conteudo: "" },
  });
  
  const ITEMS_PER_PAGE = 10;
  const isAdmin = userRole === 'Admin';


  const fetchAllData = useCallback(async (searchTerm = "") => {
    setIsLoading(true);
    try {
      let patientsUrl = '/api/pacientes';
      if (searchTerm) {
          patientsUrl += `?search=${encodeURIComponent(searchTerm)}`;
      }

      const [patientsRes, appointmentsRes] = await Promise.all([
        fetch(patientsUrl),
        fetch('/api/agendamentos')
      ]);

      if (!patientsRes.ok) throw new Error('Erro ao buscar pacientes');
      if (!appointmentsRes.ok) throw new Error('Erro ao buscar agendamentos');
      
      const patientsData: Patient[] = await patientsRes.json();
      const appointmentsData: Appointment[] = await appointmentsRes.json();
      
      if (searchTerm) {
        setPatients(patientsData);
      } else {
        setAllPatients(patientsData);
        setPatients(patientsData);
      }
      setAppointments(appointmentsData);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados. Verifique o banco de dados.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isAdmin) {
        fetchAllData(searchTerm);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchAllData, isAdmin]);


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
         toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível carregar os registros do prontuário.",
        });
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
    } else {
      fetchAllData();
    }
  }, [fetchAllData]);
  
  useEffect(() => {
    if (selectedPatient && isAdmin) {
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
  }, [selectedPatient, form, isAdmin]);

  useEffect(() => {
    if(isProntuarioOpen && selectedPatient) {
        fetchProntuarios(selectedPatient.id);
    }
  }, [isProntuarioOpen, selectedPatient, fetchProntuarios]);


  const professionalPatients = useMemo(() => {
    if (isAdmin) return patients;
    
    const professionalRoles = userRole ? userRole.split(',').map(r => r.trim()) : [];
    
    const patientIds = new Set<string>();
    appointments.forEach(app => {
        if (professionalRoles.includes(app.professional)) {
            patientIds.add(app.patientId);
        }
    });

    return allPatients.filter(patient => patientIds.has(patient.id));
  }, [patients, allPatients, appointments, userRole, isAdmin]);


  const filteredAndSortedPatients = useMemo(() => {
    let list = isAdmin ? patients : professionalPatients;
    
    return [...list].sort((a, b) => {
        switch (sortOption) {
            case "name-asc":
                return a.nome.localeCompare(b.nome);
            case "name-desc":
                return b.nome.localeCompare(a.nome);
            case "date-asc":
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case "date-desc":
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            default:
                return a.nome.localeCompare(b.nome);
        }
    });
}, [patients, professionalPatients, isAdmin, sortOption]);


  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedPatients, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedPatients.length / ITEMS_PER_PAGE);

  const patientAppointments = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments
      .filter(app => app.patientId === selectedPatient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, selectedPatient]);


  const handleTemplateChange = (templateKey: keyof typeof messageTemplates | "custom") => {
    if (!selectedPatient?.nome) return;
    
    if (templateKey === "custom") {
        setWhatsappMessage("");
        return;
    }

    const nextAppointment = patientAppointments.find(app => new Date(app.date) >= new Date());
    const date = nextAppointment ? format(parseISO(nextAppointment.date), 'dd/MM/yyyy', { locale: ptBR }) : '[Data da consulta]';
    const time = nextAppointment ? nextAppointment.time : '[Hora da consulta]';

    const message = messageTemplates[templateKey](selectedPatient.nome.split(" ")[0], date, time);
    setWhatsappMessage(message);
  };

  const handleSendWhatsApp = () => {
    if (!selectedPatient || !selectedPatient.celular) {
      toast({ variant: "destructive", title: "Erro", description: "Paciente sem número de celular cadastrado." });
      return;
    }
    
    if (!whatsappMessage) {
        toast({ variant: "destructive", title: "Mensagem vazia", description: "Escreva uma mensagem ou selecione um modelo." });
        return;
    }

    let phoneNumber = selectedPatient.celular!.replace(/\D/g, "");
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
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao atualizar paciente.');
        }
        toast({
            title: "Sucesso!",
            description: "Os dados do paciente foram atualizados.",
        });
        setSelectedPatient(null);
        fetchAllData();
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro na Atualização",
            description: error instanceof Error ? error.message : "Ocorreu um erro.",
        });
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

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar anotação.');
      }
      
      toast({ title: 'Anotação salva com sucesso!' });
      prontuarioForm.reset();
      fetchProntuarios(selectedPatient.id);

    } catch (error) {
       toast({
          variant: "destructive",
          title: "Erro ao Salvar",
          description: error instanceof Error ? error.message : "Ocorreu um erro.",
        });
    }
  };

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient);
    setShowDeleteAlert(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;
    
    try {
      const response = await fetch(`/api/pacientes/${patientToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.status !== 204) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao excluir paciente.');
      }
      toast({
        title: "Paciente Excluído!",
        description: "O paciente e todos os seus dados foram removidos.",
      });
      fetchAllData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao Excluir",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
      });
    } finally {
      setShowDeleteAlert(false);
      setPatientToDelete(null);
    }
  };


  const openEditModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsProntuarioOpen(false);
  }

  const openProntuarioModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsProntuarioOpen(true);
  }


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
          {isAdmin ? "Gerenciar Pacientes" : "Meus Pacientes"}
        </h1>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          {isAdmin ? "Gerencie as informações dos seus pacientes, histórico clínico e ações de contato." : "Acesse o prontuário dos pacientes que você atende."}
        </p>
      </div>
      
      {isAdmin && (
        <div className="flex justify-center flex-col sm:flex-row gap-4">
          <div className="relative w-full max-w-md">
            <Input 
              placeholder="Buscar por Nome, ID..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
           <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4"/>
                    <SelectValue placeholder="Ordenar por..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Ordem Alfabética (A-Z)</SelectItem>
                <SelectItem value="name-desc">Ordem Alfabética (Z-A)</SelectItem>
                <SelectItem value="date-asc">Recentemente Adicionados</SelectItem>
                <SelectItem value="date-desc">Mais Antigos</SelectItem>
              </SelectContent>
            </Select>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Nome</TableHead>
              <TableHead className="font-bold">Nº ID / Cartão</TableHead>
              <TableHead className="font-bold">Celular/Telefone</TableHead>
              <TableHead className="text-right font-bold">Ações Rápidas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPatients.length > 0 ? paginatedPatients.map(patient => (
              <TableRow key={patient.id} >
                <TableCell className="font-medium">
                    <button onClick={() => openEditModal(patient)} className="flex items-center gap-2 hover:text-primary transition-colors text-left">
                        <User className="h-4 w-4 text-muted-foreground"/> {patient.nome}
                    </button>
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
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(patient)} title="Atualizar Cadastro">
                            <FileEdit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openProntuarioModal(patient)} title="Ver Prontuário">
                            <FileText className="h-4 w-4 text-sky-500" />
                        </Button>
                        {isAdmin && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(patient)} title="Excluir Paciente">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  {isAdmin ? "Nenhum paciente encontrado." : "Nenhum paciente vinculado ao seu perfil de atendimento."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && isAdmin && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Próximo
          </Button>
        </div>
      )}

      {/* Dialog de Detalhes e Edição para ADMIN */}
      {isAdmin && (
        <Dialog open={!!selectedPatient && isAdmin && !isProntuarioOpen} onOpenChange={(isOpen) => !isOpen && setSelectedPatient(null)}>
            <DialogContent className="sm:max-w-[800px] md:max-w-[900px] max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Cadastro de {selectedPatient?.nome}</DialogTitle>
                <DialogDescription>
                Atualize os dados cadastrais ou entre em contato com o paciente via WhatsApp.
                </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-start gap-2 border-b pb-4">
                <Button onClick={() => {
                    if (!selectedPatient) return;
                    setIsWhatsAppDialogOpen(true);
                }} disabled={!selectedPatient?.celular} className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar Mensagem (WhatsApp)
                </Button>
                <Button variant="outline" onClick={() => setIsProntuarioOpen(true)}>
                    <FileText className="mr-2 h-4 w-4 text-sky-500" />
                    Acessar Prontuário
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 flex-grow overflow-y-auto pr-4 pt-4">
                {/* Coluna de Histórico */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><CalendarClock className="w-5 h-5"/> Últimas Consultas</h3>
                    <ScrollArea className="h-[400px] border rounded-md">
                        {patientAppointments.length > 0 ? (
                        <ul className="space-y-2 p-3">
                            {patientAppointments.map(app => {
                                const status = (app.status as AppointmentStatus) || "Confirmado";
                                const CurrentStatusIcon = statusConfig[status]?.icon || CalendarClock;
                                const currentStatusColor = statusConfig[status]?.color || "text-blue-500";
                                const currentStatusLabel = statusConfig[status]?.label || "Confirmado";

                                return(
                                <li key={app.id} className="text-sm p-2 bg-muted rounded-md flex justify-between items-center">
                                    <div>
                                    <p><span className="font-bold">{format(parseISO(app.date), 'dd/MM/yyyy', { locale: ptBR })}</span> às {app.time}</p>
                                    <p className="text-xs text-muted-foreground">{app.type} - {app.professional}</p>
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-1 ${currentStatusColor}`}>
                                        <CurrentStatusIcon className="h-3.5 w-3.5" />
                                        {currentStatusLabel}
                                    </div>
                                </li>
                                )
                            })}
                        </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center pt-4">Nenhum agendamento encontrado.</p>
                        )}
                    </ScrollArea>
                </div>
                
                {/* Coluna de Edição */}
                <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Atualizar Cadastro</h3>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleUpdatePatient)} className="space-y-4">
                    <FormField control={form.control} name="celular" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Celular (Obrigatório)</FormLabel>
                        <FormControl>
                            <Input placeholder="(99) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="cep" render={({ field }) => (
                        <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                            <Input placeholder="00000-000" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="logradouro" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                            <Input placeholder="Rua, Avenida..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="numero" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                                <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="complemento" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                                <Input placeholder="Apto, Bloco..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="bairro" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                            <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="cidade" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                                <Input placeholder="Cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="estado" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                                <Input placeholder="UF" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <DialogFooter className="pt-4 sticky bottom-0 bg-background/95 pb-2">
                        <Button type="button" variant="outline" onClick={() => setSelectedPatient(null)}>Fechar</Button>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                    </form>
                </Form>
                </div>

            </div>
            </DialogContent>
        </Dialog>
      )}
      
      {/* Dialog do WhatsApp */}
      <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mensagem para {selectedPatient?.nome}</DialogTitle>
                <DialogDescription>
                    O link abrirá a conversa já com a mensagem pronta para envio.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Select onValueChange={(value: keyof typeof messageTemplates | "custom") => handleTemplateChange(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Escolha um modelo de mensagem" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="confirmacao">Confirmar consulta</SelectItem>
                        <SelectItem value="reagendamento">Sugerir reagendamento</SelectItem>
                        <SelectItem value="cancelamento">Confirmar cancelamento</SelectItem>
                        <SelectItem value="custom">Mensagem personalizada</SelectItem>
                    </SelectContent>
                </Select>
                <Textarea 
                    placeholder="Escreva sua mensagem aqui..."
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    rows={5}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsWhatsAppDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700">Abrir WhatsApp</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog do Prontuário */}
      <Dialog open={isProntuarioOpen} onOpenChange={(isOpen) => {
          setIsProntuarioOpen(isOpen);
          if (!isOpen && !isAdmin) setSelectedPatient(null);
          if (!isOpen && isAdmin) setIsProntuarioOpen(false);
      }}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Prontuário de {selectedPatient?.nome}</DialogTitle>
                  <DialogDescription>
                      Histórico de evoluções e anotações clínicas.
                  </DialogDescription>
              </DialogHeader>
              
              <div className="flex-grow space-y-4 overflow-y-hidden flex flex-col">
                  
                  <div className="space-y-2">
                      <h3 className="font-semibold text-md">Registro de Consultas</h3>
                       <ScrollArea className="h-40 border rounded-lg p-2">
                           {patientAppointments.length > 0 ? (
                              <ul className="space-y-2 p-2">
                                {patientAppointments.map(app => {
                                    const status = (app.status as AppointmentStatus) || "Confirmado";
                                    const CurrentStatusIcon = statusConfig[status]?.icon || CalendarClock;
                                    const currentStatusColor = statusConfig[status]?.color || "text-blue-500";
                                    const currentStatusLabel = statusConfig[status]?.label || "Confirmado";

                                    return(
                                    <li key={app.id} className="text-sm p-2 bg-muted rounded-md flex justify-between items-center">
                                        <div>
                                        <p><span className="font-bold">{format(parseISO(app.date), 'dd/MM/yyyy', { locale: ptBR })}</span> às {app.time}</p>
                                        <p className="text-xs text-muted-foreground">{app.type}</p>
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-1 ${currentStatusColor}`}>
                                            <CurrentStatusIcon className="h-3.5 w-3.5" />
                                            {currentStatusLabel}
                                        </div>
                                    </li>
                                    )
                                })}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center pt-4">Nenhum agendamento encontrado.</p>
                            )}
                      </ScrollArea>
                  </div>
                  
                  <div className="space-y-2 flex-grow flex flex-col min-h-0">
                    <h3 className="font-semibold text-md">Evolução do Paciente</h3>
                    <ScrollArea className="flex-grow border rounded-lg p-2">
                          {isLoadingProntuario ? (
                              <div className="flex justify-center items-center h-32">
                                  <Loader2 className="w-6 h-6 animate-spin" />
                              </div>
                          ) : prontuarios.length > 0 ? (
                              <div className="space-y-4 p-2">
                                  {prontuarios.map(p => (
                                      <div key={p.id} className="text-sm p-3 bg-muted rounded-lg border-l-4 border-primary">
                                          <p className="whitespace-pre-wrap">{p.conteudo}</p>
                                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t text-right italic">
                                              Registrado por <span className="font-bold">{p.profissional_nome}</span> em {format(parseISO(p.data_registro), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                          </p>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <p className="text-sm text-muted-foreground text-center py-10">Ainda não há anotações para este paciente.</p>
                          )}
                    </ScrollArea>
                  </div>

                  <Form {...prontuarioForm}>
                      <form onSubmit={prontuarioForm.handleSubmit(handleSaveProntuario)} className="space-y-4 pt-4 border-t">
                          <FormField
                              control={prontuarioForm.control}
                              name="conteudo"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="font-semibold">Nova Evolução/Anotação</FormLabel>
                                      <FormControl>
                                          <Textarea 
                                              placeholder={`Descreva aqui a evolução do atendimento... (Registrando como ${userName})`} 
                                              rows={3} 
                                              {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <DialogFooter>
                              <Button type="button" variant="ghost" onClick={() => setIsProntuarioOpen(false)}>Cancelar</Button>
                              <Button type="submit" disabled={prontuarioForm.formState.isSubmitting}>
                                  {prontuarioForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                  Salvar no Prontuário
                              </Button>
                          </DialogFooter>
                      </form>
                  </Form>
              </div>
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o paciente
              <span className="font-bold"> {patientToDelete?.nome} </span>
              e todos os dados associados (agendamentos e prontuários). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPatientToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
