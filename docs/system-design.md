# System Design — Luppa (MVP ~100 users)

## 1. Visão geral

```mermaid
graph TB
    subgraph Clients
        WEB["🌐 Next.js (Vercel)"]
        WA["📱 WhatsApp (futuro)"]
    end

    subgraph Auth
        CLERK["🔐 Clerk"]
    end

    subgraph "API — NestJS (Railway)"
        GW["AuthGuard (JWT)"]
        UPLOAD["InvoicesController"]
        TX["TransactionsController"]
        HEALTH["HealthController"]

        subgraph "Processing Pipeline"
            EXT["ExtractionService"]
            CAT["CategorizationService"]
        end
    end

    subgraph "External"
        LLM["🤖 Claude API (Anthropic)"]
    end

    subgraph "Data (Supabase)"
        DB[("PostgreSQL")]
        STORAGE["📦 Storage (PDFs)"]
    end

    subgraph "Observability"
        SENTRY["Sentry"]
    end

    WEB -->|JWT| GW
    WA -.->|webhook futuro| GW
    CLERK -->|validate| GW
    GW --> UPLOAD
    GW --> TX
    UPLOAD --> STORAGE
    UPLOAD --> EXT
    EXT -->|PDF base64| LLM
    EXT --> CAT
    CAT -->|merchant desconhecido| LLM
    CAT --> DB
    TX --> DB
    HEALTH --> DB

    EXT -.->|errors| SENTRY
    CAT -.->|errors| SENTRY
```

---

## 2. Fluxo de upload de fatura

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js
    participant API as NestJS API
    participant Store as Supabase Storage
    participant LLM as Claude API
    participant DB as PostgreSQL

    User->>Web: Upload PDF
    Web->>API: POST /invoices (PDF + JWT)
    API->>API: AuthGuard valida JWT → userId

    API->>Store: Salva PDF
    API-->>Web: 202 Accepted { jobId }

    Note over API: Processamento async (in-process)

    API->>LLM: PDF base64 + extraction prompt
    LLM-->>API: tool_use → transactions[]

    API->>API: Validação (soma, datas, duplicatas)

    alt Validação OK
        API->>DB: Salva Invoice + Transactions (status: extracted)
        API->>API: Inicia categorização
    else Validação falhou
        API->>DB: Invoice (status: extraction_failed)
    end

    loop Polling
        Web->>API: GET /invoices/:jobId
        API-->>Web: { status, data? }
    end
```

---

## 3. Fluxo de categorização

```mermaid
flowchart TD
    TX["Transaction (description)"] --> LOOKUP{"Merchant table\nlookup"}

    LOOKUP -->|encontrado| ASSIGN["Atribui categoria\ncacheada"]
    LOOKUP -->|não encontrado| LLM["Claude API\nclassificação"]

    LLM --> CONF{"Confiança?"}

    CONF -->|alta| AUTO["Auto-categoriza\n+ salva na merchant table"]
    CONF -->|baixa| QUEUE["Fila de revisão\nmanual"]

    QUEUE --> USER["Usuário confirma\nno dashboard"]
    USER --> SAVE["Salva na\nmerchant table"]

    style LOOKUP fill:#e3f2fd
    style LLM fill:#fff3e0
    style QUEUE fill:#fce4ec
    style AUTO fill:#e8f5e9
    style SAVE fill:#e8f5e9
```

---

## 4. Modelo de dados

```mermaid
erDiagram
    USER ||--o{ INVOICE : "uploads"
    INVOICE ||--o{ TRANSACTION : "contains"
    TRANSACTION }o--o| MERCHANT : "matched to"
    MERCHANT }o--|| CATEGORY : "maps to"

    USER {
        string id PK "Clerk ID"
    }

    INVOICE {
        uuid id PK
        string userId FK
        string storageUrl
        string status "pending | extracted | failed"
        float totalAmount
        date dueDate
        datetime createdAt
    }

    TRANSACTION {
        uuid id PK
        uuid invoiceId FK
        date date
        string description
        float amount
        string type "debit | credit"
        string categoryId FK
        string status "auto | pending_review | confirmed"
    }

    MERCHANT {
        uuid id PK
        string pattern "ex: IFD*TREND"
        string categoryId FK
        string scope "global | user"
        string userId "null se global"
    }

    CATEGORY {
        string id PK
        string name "Food, Transport..."
        string subcategory "Delivery, Fuel..."
    }
```

---

## 5. Infraestrutura MVP

```mermaid
graph LR
    subgraph "Frontend"
        V["Vercel (free)"]
    end

    subgraph "Backend"
        R["Railway (~$5/mo)\nDocker container"]
    end

    subgraph "Data"
        S["Supabase (free)\nPostgreSQL + Storage"]
    end

    subgraph "Auth"
        C["Clerk (free)\n< 10k MAU"]
    end

    subgraph "AI"
        A["Claude API\n~$2-10/mo"]
    end

    subgraph "Observability"
        SE["Sentry (free)"]
    end

    V -->|HTTPS| R
    R -->|Prisma| S
    R -->|SDK| A
    V -->|JWT| C
    R -->|verify JWT| C
    R -.-> SE
    V -.-> SE
```

**Custo total: ~$7–15/mês**

---

## 6. CI/CD Pipeline

```mermaid
flowchart LR
    subgraph "PR aberto"
        A1["install"] --> A2["lint"]
        A2 --> A3["typecheck"]
        A3 --> A4["test (turbo)"]
        A4 --> A5["✅ ou ❌"]
    end

    subgraph "Merge em main"
        B1["checks ✅"] --> B2["prisma migrate\ndeploy"]
        B2 --> B3["deploy API\n(Railway)"]
        B2 --> B4["deploy Web\n(Vercel)"]
    end

    A5 -->|merge| B1
```

---

## 7. Pontos de evolução

```mermaid
graph TB
    subgraph "MVP (~100 users)"
        M1["In-process async"]
        M2["Supabase free"]
        M3["Railway $5"]
        M4["Clerk free"]
        M5["Polling status"]
    end

    subgraph "Crescimento (~5k users)"
        G1["BullMQ + Redis"]
        G2["Supabase Pro $25"]
        G3["Fly.io multi-region"]
        G4["Clerk $25"]
        G5["WebSocket updates"]
    end

    subgraph "Escala (~20k+ users)"
        S1["Dedicated queue\n(SQS/RabbitMQ)"]
        S2["AWS RDS / managed PG"]
        S3["AWS ECS + ALB"]
        S4["Cognito / self-hosted"]
        S5["WhatsApp channel"]
    end

    M1 -.->|"add Redis"| G1
    M2 -.->|"upgrade plan"| G2
    M3 -.->|"redeploy Docker"| G3
    M4 -.->|"upgrade plan"| G4
    M5 -.->|"add WS"| G5

    G1 -.-> S1
    G2 -.->|"pg_dump + restore"| S2
    G3 -.->|"redeploy Docker"| S3
    G4 -.->|"swap AuthGuard"| S4
    G5 -.-> S5

    style M1 fill:#e8f5e9
    style M2 fill:#e8f5e9
    style M3 fill:#e8f5e9
    style M4 fill:#e8f5e9
    style M5 fill:#e8f5e9
```

---

## 8. Limites e decisões-chave

| Decisão | Escolha MVP | Por quê | Quando muda |
|---|---|---|---|
| Fila de jobs | In-process async | Simples, sem infra extra | Volume > timeout de request |
| Multi-tenancy | Row-level (userId) | Suficiente, sem overhead | Nunca (padrão escalável) |
| Auth | Clerk JWT | Zero código de auth | > 10k MAU |
| Extração | Claude API direta | Melhor acurácia, zero parsers | Se custo LLM explodir |
| Categorização | Merchant table + LLM | LLM calls diminuem com tempo | Merchant table cobre 90%+ |
| Storage | Supabase Storage | Free, integrado | > 1GB de PDFs |
| Migrations | Prisma no CI | Automático, sem manual | Nunca (padrão correto) |
| Observability | Sentry apenas | Suficiente pro tamanho | Adicionar APM quando necessário |
