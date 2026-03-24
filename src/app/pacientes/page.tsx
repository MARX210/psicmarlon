
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, Search, FileText, FileEdit, Trash2, MessageCircle, Filter, User, X, Check, Users } from "lucide-react";
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

const formatPhone = (phone: string | null) => {
    if (!phone) return "N/A";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (clean.length === 10) return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return phone;
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
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
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
    const result = [...patients];
    switch (sortBy) {
      case "name-asc":
        return result.sort((a, b) => a.nome.localeCompare(b.nome));
      case "name-desc":
        return result.sort((a, b) => b.nome.localeCompare(a.nome));
      case "date-desc":
        return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "date-asc":
        return result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return result;
    }
  }, [patients, sortBy]);

  const fetchProntuarios = useCallback(async (pacienteId: string) => {
    setIsLoadingProntuario(true);
    try {
        const res = await fetch(`/api/prontuarios?pacienteId=${pacienteId}`);
        if (!res.ok) throw new Error();
        setProntuarios(await res.json());
    } catch (error) {
        setProntuarios([]);
    } finally {
        setIsLoadingProntuario(false);
    }
  }, []);

  useEffect(() => {
    if(isProntuarioOpen && selectedPatient) fetchProntuarios(selectedPatient.id);
  }, [isProntuarioOpen, selectedPatient, fetchProntuarios]);

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
      fetchProntuarios(selectedPatient.id);
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
      const date = parseISO(dateString);
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
              <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {patient.nome}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="font-mono">{patient.id}</Badge></TableCell>
                <TableCell className="text-muted-foreground font-mono">{formatPhone(patient.celular)}</TableCell>
                <TableCell className="text-right flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { 
                        setSelectedPatient(patient); 
                        setIsProntuarioOpen(false); 
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-500" onClick={() => { setSelectedPatient(patient); setIsProntuarioOpen(true); }} title="Ver Prontuário">
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
      <Dialog open={!!selectedPatient && !isProntuarioOpen} onOpenChange={v => !v && setSelectedPatient(null)}>
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
              <Button type="button" variant="ghost" onClick={() => setSelectedPatient(null)}>Cancelar</Button>
              <Button type="submit" disabled={isUpdating} onClick={form.handleSubmit(handleUpdatePatient)}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Alterações
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Prontuário */}
      <Dialog open={isProntuarioOpen} onOpenChange={setIsProntuarioOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Histórico Clínico: {selectedPatient?.nome}</DialogTitle></DialogHeader>
          <ScrollArea className="flex-grow border rounded-lg p-4 my-4 bg-muted/20">
            {isLoadingProntuario ? <div className="text-center py-4"><Loader2 className="animate-spin inline"/></div> :
              prontuarios.length > 0 ? (
                <div className="space-y-4">
                  {prontuarios.map(p => (
                    <div key={p.id} className="p-3 bg-card rounded-lg border-l-4 border-primary shadow-sm text-sm">
                      <p className="whitespace-pre-wrap">{p.conteudo}</p>
                      <div className="mt-2 text-[10px] text-muted-foreground flex justify-between italic">
                        <span>{p.profissional_nome}</span>
                        <span>{format(parseISO(p.data_registro), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center py-10 text-muted-foreground">Sem registros clínicos até o momento.</p>
            }
          </ScrollArea>
          <Form {...prontuarioForm}>
            <form onSubmit={prontuarioForm.handleSubmit(handleSaveProntuario)} className="space-y-4">
              <FormField control={prontuarioForm.control} name="conteudo" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Evolução de Atendimento</FormLabel><FormControl><Textarea placeholder="Descreva aqui o resumo da sessão..." rows={4} {...field}/></FormControl><FormMessage/></FormItem>
              )} />
              <div className="flex justify-end"><Button type="submit">Registrar Sessão</Button></div>
            </form>
          </Form>
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
