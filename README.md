# 🛋️ PsicMarlon - Sistema de Agendamento para Psicólogos

**PsicMarlon** é uma aplicação web moderna e intuitiva, projetada para simplificar a gestão de pacientes e agendamentos para psicólogos e outros profissionais da saúde. O sistema oferece uma interface limpa e organizada para cadastrar pacientes e visualizar a agenda de consultas.

## ✨ Funcionalidades Principais

-   **Cadastro Completo de Pacientes**: Formulário detalhado para registrar informações pessoais, de contato e endereço dos pacientes.
-   **Geração de ID Único**: Sistema automático de criação de um Nº de Cartão/ID para cada paciente com base no seu tipo.
-   **Busca de Endereço por CEP**: Preenchimento automático dos campos de endereço ao digitar o CEP, utilizando a API ViaCEP.
-   **Agenda de Consultas**: Uma interface visual com calendário para agendar e visualizar as consultas marcadas.
-   **Busca de Pacientes**: Encontre pacientes rapidamente através do CPF para agilizar o processo de agendamento.
-   **Disponibilidade de Horários**: O sistema exibe apenas os horários disponíveis no dia selecionado, evitando conflitos de agenda.
-   **Interface Responsiva e Tema Dark/Light**: A aplicação é totalmente adaptada para dispositivos móveis e oferece a opção de tema claro ou escuro.

## 🚀 Tecnologias Utilizadas

Este projeto foi construído com um conjunto de tecnologias modernas e eficientes, focadas em performance e na experiência do desenvolvedor:

-   **Framework**: [Next.js](https://nextjs.org/) (com App Router)
-   **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
-   **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
-   **Componentes UI**: [Shadcn/ui](https://ui.shadcn.com/)
-   **Gerenciamento de Formulários**: [React Hook Form](https://react-hook-form.com/)
-   **Validação de Schemas**: [Zod](https://zod.dev/)
-   **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/)
-   **Ícones**: [Lucide React](https://lucide.dev/)

## 🏁 Como Executar o Projeto

Para rodar este projeto em seu ambiente local, siga os passos abaixo.

### Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 18 ou superior)
-   [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
-   Uma instância de um banco de dados PostgreSQL rodando.

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/psicmarlon.git
cd psicmarlon
```

### 2. Instalar as Dependências

```bash
npm install
# ou
yarn install
```

### 3. Configurar as Variáveis de Ambiente

Crie um arquivo chamado `.env` na raiz do projeto, copiando o conteúdo do arquivo `.env.example` (se houver). Preencha com a sua string de conexão do PostgreSQL.

```env
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO"
```

### 4. Rodar a Aplicação

```bash
npm run dev
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000).

## 📂 Estrutura do Projeto

O projeto está organizado da seguinte forma para facilitar a manutenção e escalabilidade:

```
src
├── app/                  # Rotas principais da aplicação (App Router)
│   ├── api/              # Rotas de API
│   │   └── pacientes/
│   │       └── route.ts  # Endpoint para gerenciar pacientes
│   ├── agenda/           # Página da Agenda
│   ├── cadastro/         # Página de Cadastro de Pacientes
│   ├── layout.tsx        # Layout principal da aplicação
│   └── page.tsx          # Página inicial (Home)
│
├── components/           # Componentes React reutilizáveis
│   └── ui/               # Componentes base do Shadcn/ui (Button, Card, etc.)
│
├── hooks/                # Hooks personalizados (ex: useToast)
│
├── lib/                  # Funções utilitárias e configurações
│   ├── db.ts             # Conexão com o banco de dados (PostgreSQL)
│   ├── schemas.ts        # Schemas de validação com Zod
│   └── utils.ts          # Funções utilitárias gerais (ex: cn)
│
└── ...
```

---

<p align="center">
  Desenvolvido por <strong>Marlon e Marx Vinicius</strong>
</p>
