# RFC 004 — Channel architecture

## Problem

The system needs to accept invoice uploads and return responses today via web. In the future, users should be able to interact via WhatsApp — sending invoices, querying spending data, getting summaries. Adding a new channel should not require changes to core processing logic.

## Design principle: channels are I/O only

The processing pipeline is completely decoupled from how input arrives or how output is delivered. A channel is responsible only for:
1. Receiving a file or message
2. Putting it into the processing pipeline
3. Delivering the response back to the user

```
┌─────────────┐     ┌─────────────┐
│  Web upload │     │  WhatsApp   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────┐
│         file storage            │  ← stores the PDF, returns a job ID
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│        processing queue         │  ← async job: parse → categorize → save
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  llm extractor → categorizer → db  │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│       response dispatcher       │  ← knows which channel originated the job
└──────┬──────────────────────────┘
       │
       ├──▶ Web: update UI via polling or websocket
       └──▶ WhatsApp: send message back to user
```

## MVP (web only)

Processing is synchronous — no queue needed at this scale. File storage via Supabase Storage. Response is the HTTP response.

The channel abstraction does not need to be implemented now, but **the processing logic must not be written assuming HTTP context** (no `http.ResponseWriter` inside the parser or categorizer).

## WhatsApp (future)

Integration via WhatsApp Business API through a provider (Twilio, Zenvia, or Infobip). The provider sends a webhook when a user sends a message or file.

Flow:
1. User sends PDF via WhatsApp
2. Provider webhook fires → API receives file + user phone number
3. File stored, job queued with `channel: whatsapp, user_id: X`
4. After processing, response dispatcher sends summary back via WhatsApp message

Natural interactions to support:
- Send invoice → get confirmation + summary
- "quanto gastei esse mês?" → spending breakdown
- "qual minha maior categoria?" → top category

The LLM categorization layer (RFC 005) also enables natural language queries over spending data without building a custom query interface.

## What this means for the API design

- Parsing and categorization logic lives in their own NestJS modules with no HTTP dependencies
- Controllers in the `invoices` module are thin: receive file, call the service, return result
- When WhatsApp arrives: add a webhook controller that calls the same service
