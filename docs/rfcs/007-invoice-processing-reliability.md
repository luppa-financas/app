# RFC 007 — Invoice Processing Reliability

## Status

**Deferred** — MVP accepted risk. To be revisited before public launch.

## Contexto

O fluxo de `POST /invoices` executa três operações em sequência sem garantia de atomicidade:

```
1. StorageService.upload()       → salva PDF no Supabase Storage
2. InvoicesRepository.create()   → cria Invoice PENDING no banco
3. eventEmitter.emit()           → dispara invoice.created (in-process)
4. return { invoiceId }
```

Em seguida, de forma assíncrona:

```
5. TransactionsListener.handleInvoiceCreated()
   ├── StorageService.download()
   ├── ExtractionService.extract()       → Claude API
   ├── TransactionsRepository.createMany()
   └── InvoicesRepository.updateStatus(DONE | FAILED)
```

## Riscos conhecidos

### Risco 1 — Arquivo órfão no storage

**Quando ocorre:** o upload (passo 1) é bem-sucedido, mas o `create()` (passo 2) falha.

**Consequência:** o PDF existe no Supabase Storage sem Invoice correspondente no banco. O arquivo ocupa espaço e nunca será processado nem deletado.

**Probabilidade:** baixa (falha de banco logo após upload bem-sucedido).

**Impacto MVP:** negligível (~100 usuários, storage gratuito).

### Risco 2 — Invoice presa em PENDING

**Quando ocorre:** o processo da API cai entre o `emit()` (passo 3) e o listener terminar de processar.

**Consequência:** Invoice fica com status `PENDING` para sempre. O usuário não recebe feedback e a fatura não é reprocessada automaticamente.

**Probabilidade:** baixa, mas não desprezível em restarts de deploy.

**Impacto MVP:** o usuário precisaria fazer upload novamente (aceitável para ~100 usuários que podem reportar o problema diretamente).

### Risco 3 — Transações salvas mas status não atualizado

**Quando ocorre:** `createMany()` é bem-sucedido mas `updateStatus(DONE)` falha (ou o processo cai entre os dois).

**Consequência:** transações existem no banco mas a Invoice ainda aparece como `PENDING`.

**Probabilidade:** muito baixa.

**Impacto MVP:** dado inconsistente, mas recuperável manualmente via SQL.

## Por que foi feito assim no MVP

- **EventEmitter in-process:** zero dependências externas. Sem Redis, sem BullMQ, sem infra adicional.
- **Sem retry nem persistência de jobs:** simplicidade operacional para ~100 usuários.
- **Falhas aceitas:** o produto está em fase de validação com um círculo fechado de usuários que podem reportar problemas diretamente.
- **Rollback manual é viável:** com poucos usuários, corrigir uma Invoice PENDING via SQL tem custo aceitável.

## Solução para pós-MVP: Transactional Outbox Pattern

Quando o produto sair do círculo fechado, o risco 2 (Invoice presa em PENDING) se torna inaceitável.

### O padrão

Em vez de emitir o evento diretamente, gravar o evento na mesma transação de banco que cria a Invoice:

```
BEGIN TRANSACTION
  INSERT INTO Invoice (status = PENDING)
  INSERT INTO OutboxEvent (type = 'invoice.created', payload = { invoiceId, storagePath })
COMMIT
```

Um worker separado (polling ou trigger) lê a tabela `OutboxEvent`, processa cada evento e o marca como consumido. Se o worker cair no meio, o evento permanece na fila e é reprocessado.

### Benefícios

- **Invoice nunca fica presa em PENDING:** se o processo cair, o evento ainda está na outbox.
- **At-least-once delivery:** o worker pode reprocessar sem perda de eventos.
- **Auditoria:** a tabela de outbox serve como log de eventos processados.

### Implementação

1. Adicionar modelo `OutboxEvent` ao schema Prisma com campos `type`, `payload`, `processedAt`.
2. Modificar `InvoicesService.create()` para usar `prisma.$transaction([...])` incluindo o insert do evento.
3. Criar um `OutboxWorker` que faz polling da tabela a cada N segundos, chama o listener e marca o evento como processado.
4. Alternativamente: substituir o EventEmitter por BullMQ + Redis (mais robusto, mas adiciona infra).

### Pré-requisito

Definir a estratégia de retry: quantas tentativas antes de marcar o evento como `DEAD_LETTER`, e como notificar o usuário sobre falha permanente.
