<div align="center">

<img width="1200" height="475" alt="Gestao Absenteismo Vonixx Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 📋 Gestão de Absenteísmo — Vonixx

**Sistema web/mobile para controle de frequência e gestão de férias da linha de produção Vonixx**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## 📌 Sobre o Projeto

O **Gestão de Absenteísmo Vonixx** é uma aplicação progressiva (PWA) desenvolvida para o setor de produção da empresa **Vonixx**. Permite o registro diário de presenças e faltas por turno, acompanhamento de métricas de absenteísmo, gestão de férias e geração de relatórios — tudo em tempo real via Firebase/Firestore.

A aplicação também pode ser instalada como **app nativo Android** via Capacitor, funcionando offline com sincronização automática ao reconectar.

---

## ✨ Funcionalidades

- 📊 **Dashboard de Absenteísmo** — taxa diária/mensal, ranking de faltas, alertas automáticos, gráficos por dia da semana
- 📝 **Registro de Frequência** — marcação de Presente / Falta / Férias / Atestado por funcionário e por dia
- 🏖️ **Gestão de Férias** — agendamento, controle de saldo e alertas de sobreposição
- 📈 **Analytics de Férias** — heatmap anual, passivo de férias, distribuição mensal
- 🔒 **Controle de Acesso por Turno** — cada turno (A/B/C/D) vê somente seus dados; supervisão tem visão global
- 🤖 **Insights com IA** — análise automática de padrões via Gemini / OpenRouter / Groq
- 📤 **Exportação** — relatórios em Excel (XLSX) e PDF com jsPDF
- 📱 **PWA + Android** — instalável como app, funciona offline, push notifications
- 🔐 **Senhas gerenciadas no Firestore** — alteração de senhas sem deploy, via Firebase Console

---

## 🏗️ Arquitetura

```
src/
├── App.tsx                  # Componente raiz, roteamento e estado global
├── firebase.ts              # Inicialização do Firebase (lê credenciais do .env)
├── components/
│   ├── Login/               # Tela de login por turno
│   ├── Header/              # Navegação, filtros de mês/dia, logout
│   ├── AbsenteeismDashboard/# Dashboard principal com gráficos
│   ├── AttendanceRegistry/  # Registro diário de frequência
│   ├── VacationManagement/  # CRUD de férias
│   ├── VacationAnalytics/   # Analytics e heatmap de férias
│   ├── AddEmployeeModal/    # Modal de cadastro de funcionário
│   ├── EditEmployeeModal/   # Modal de edição de funcionário
│   ├── EmployeeDetailModal/ # Histórico individual do funcionário
│   └── ErrorBoundary/       # Tratamento de erros de renderização
├── hooks/
│   ├── useAuth.ts           # Autenticação + busca de senhas no Firestore
│   ├── useFirestoreData.ts  # Leitura/escrita de dados (employees, attendance, vacations)
│   ├── useDashboardAnalytics.ts # Cálculos de métricas e analytics
│   ├── useVacationStats.tsx # Estatísticas de férias
│   └── useAIInsights.ts     # Integração com APIs de IA
├── services/
│   └── aiService.ts         # Chamadas para Gemini / OpenRouter / Groq
├── types/                   # Tipos TypeScript globais
└── utils/
    └── dateUtils.ts         # Helpers de data, dias úteis, dias de trabalho
```

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript 5.8 |
| Estilização | Tailwind CSS 4 |
| Animações | Framer Motion |
| Gráficos | Recharts |
| Backend / DB | Firebase Firestore |
| Autenticação | Firebase Auth (email/senha + Google) |
| Build | Vite 6 |
| Mobile | Capacitor 6 (Android) |
| IA | Google Gemini, OpenRouter, Groq |
| Exportação | jsPDF + jspdf-autotable + XLSX |

---

## 🔐 Segurança

- Credenciais do Firebase lidas exclusivamente via **variáveis de ambiente** (`.env`) — nunca hardcoded
- **Senhas dos turnos** armazenadas no Firestore (`config/passwords`) — alteráveis pelo admin sem redeploy
- Regras do Firestore garantem **isolamento por turno**: cada usuário acessa apenas os dados do seu turno
- Somente admins (`bernard30101994@gmail.com` e `supervisao@vonixx.com`) podem escrever em `config/passwords`

---

## 🚀 Instalação e Execução Local

### Pré-requisitos

- Node.js 18+
- Conta no [Firebase](https://firebase.google.com) com projeto configurado
- Android Studio (opcional, apenas para build Android)

### 1. Clonar o repositório

```bash
git clone https://github.com/Bernard301094/Gestao-Absenteismo-Vonixx.git
cd Gestao-Absenteismo-Vonixx
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env` com os dados do seu projeto Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
VITE_FIREBASE_FIRESTORE_DATABASE_ID=seu_database_id
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id

# Opcional — para funcionalidades de IA
VITE_GEMINI_API_KEY=
VITE_OPENROUTER_API_KEY=
VITE_GROQ_API_KEY=
```

### 4. Criar senhas no Firestore

No [Firebase Console](https://console.firebase.google.com) → Firestore → coleção `config` → documento `passwords`:

```json
{
  "turnoA":    "SuaSenhaTurnoA",
  "supervisao": "SuaSenhaSupervisao",
  "turnosBCD": "SuaSenhaTurnosBCD"
}
```

### 5. Executar em modo desenvolvimento

```bash
npm run dev
# Acesse: http://localhost:3000
```

---

## 📱 Build Android (APK)

```bash
# Build web + sync com Capacitor
npm run build:apk

# Abrir no Android Studio
npm run cap:open
```

---

## 📂 Coleções do Firestore

| Coleção | Descrição |
|---|---|
| `employees` | Cadastro de funcionários por turno |
| `attendance` | Registros de frequência diária |
| `vacations` | Férias agendadas e realizadas |
| `completions` | Marcações de dia completo por turno |
| `ai_insights` | Insights gerados pela IA |
| `config/passwords` | Senhas de acesso dos turnos |
| `system/ai_config` | Configurações do módulo de IA |

---

## 👥 Perfis de Acesso

| Perfil | Email | Permissões |
|---|---|---|
| **Admin** | `bernard30101994@gmail.com` | Acesso total, configurações |
| **Supervisão** | `supervisao@vonixx.com` | Leitura de todos os turnos |
| **Turno A** | `turno.a@vonixx.com` | CRUD somente do Turno A |
| **Turno B** | `turno.b@vonixx.com` | CRUD somente do Turno B |
| **Turno C** | `turno.c@vonixx.com` | CRUD somente do Turno C |
| **Turno D** | `turno.d@vonixx.com` | CRUD somente do Turno D |

---

## 📜 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento (porta 3000)
npm run build        # Build de produção
npm run preview      # Preview do build local
npm run lint         # Verificação de tipos TypeScript
npm run build:apk    # Build web + sync Capacitor para Android
npm run cap:open     # Abre o projeto no Android Studio
```

---

## 📄 Licença

Projeto privado — uso interno Vonixx. Todos os direitos reservados.
