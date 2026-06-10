# Primeiro upload — validando o ambiente local

Guia para confirmar que tudo está funcionando após o setup inicial.

## Pré-requisitos

- Stack rodando (`make dev` + `make migrate` + `make dev-web`)
- `make health` retornando `{"status":"OK"}`

---

## 1. Liberar acesso ao app (primeira vez)

O Clerk cria o usuário sem roles quando faz login pela primeira vez — o app vai te redirecionar para `/waitlist`. Isso é esperado em dev local (webhooks do Clerk não funcionam em localhost).

Para liberar o acesso, execute no terminal com o stack rodando:

```bash
make studio
```

Abre o Prisma Studio em `http://localhost:5555`.

1. Clique na tabela **User**
2. Localize o registro com o seu e-mail
3. Clique na linha para editar
4. No campo **roles**, adicione o valor `mvp` (o campo aceita um array — use `["mvp"]`)
5. Clique em **Save**

Recarregue `http://localhost:3000` — o app vai redirecionar para o dashboard.

> Você só precisa fazer isso uma vez por usuário novo em dev local.

---

## 2. Subir um PDF de teste

Qualquer PDF funciona para testar o fluxo. Se não tiver uma fatura real à mão, gere um PDF de exemplo simples (até um Print to PDF de qualquer página web serve para validar que o upload chega na API).

> ⚠️ Se quiser testar a extração real de transações, use uma fatura de cartão de crédito. Coloque na pasta `apps/api/src/extraction/testdata/` — ela está no `.gitignore`, seus arquivos nunca serão commitados.

No dashboard:

1. Selecione o mês de referência da fatura
2. Clique em **Selecionar PDF** e escolha o arquivo
3. Clique em **Enviar**

---

## 3. Validar o processamento

Após o upload:

- Status inicial: **PENDING** (aparecer no dashboard imediatamente)
- Status após ~15-30s: **DONE** (ou **FAILED** se o PDF não tiver transações reconhecíveis)
- Se DONE: as transações aparecem na lista abaixo do card da fatura

Se o status ficou **PENDING** por mais de 2 minutos, verifique os logs da API:

```bash
make dev-logs
```

---

## 4. Checklist de validação

- [ ] `make health` retorna `{"status":"OK"}`
- [ ] Login funciona em `http://localhost:3000`
- [ ] Roles setadas via Prisma Studio → app abre o dashboard (não waitlist)
- [ ] Upload de PDF → status muda para DONE
- [ ] Transações aparecem listadas com categoria
- [ ] Arquivo aparece no Supabase Storage em `invoices/local/<seu-userId>/`
