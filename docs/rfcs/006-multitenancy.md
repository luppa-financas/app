# RFC 006 — Multi-tenancy

## Model

Row-level multi-tenancy: single database, single schema, data isolated by `user_id`. Each user only ever sees their own invoices and transactions.

This is the natural fit for a personal finance SaaS at this scale — no need for schema-per-tenant or database-per-tenant.

## Enforcement layer

The NestJS API is the only access point to the database. There are no direct client-to-Supabase calls. This means isolation is enforced at the **application layer** — no Supabase RLS needed for the MVP.

Rule: **every service method that reads or writes data must receive `userId` and filter by it.** No query runs without a user scope.

```typescript
// Controller extracts userId from the Clerk JWT via AuthGuard
@Get('invoices')
findAll(@CurrentUser() userId: string) {
  return this.invoicesService.findAll(userId);
}

// Service always filters by userId — never queries without it
findAll(userId: string) {
  return this.prisma.invoice.findMany({ where: { userId } });
}
```

## Schema

`Invoice` carries `userId` directly. `Transaction` is always accessed through its parent `Invoice`, which already has the user scope — no need for `userId` on `Transaction`.

```
User (Clerk ID)
  └── Invoice (userId FK)
        └── Transaction (invoiceId FK)
```

## AuthGuard

The `AuthGuard` validates the Clerk JWT and attaches the user ID to the request. A `@CurrentUser()` decorator extracts it in controllers. This is the single entry point for user identity across the entire application.

## What this means in practice

- Every `invoicesService` method receives `userId` as its first argument
- Every Prisma query on user-owned data includes `where: { userId }`
- No service exposes a "get all" without a user scope
- Adding a new entity that belongs to a user: always add `userId` to the table and filter by it in the service

## Future

If the product ever needs team accounts (multiple users sharing data), the `userId` field becomes an `organizationId` and the same pattern holds. The change is isolated to the schema and service layer.
