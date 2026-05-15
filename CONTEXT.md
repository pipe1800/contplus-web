# ContPlus 6 — Reverse Engineering & Rebuild

**Started:** 2026-05-14  
**Status:** Phase 1 complete — database deployed, data imported, auth working, catalog module live  
**Next:** Libro Diario (journal entry form)

---

## What This Is

Rebuilding a Visual FoxPro 9.0 + SQL Server accounting system as a modern web app.
Stack: **Supabase (PostgreSQL) + Next.js 16 + Vercel**.

Two repos, both on Felipe's personal GitHub (`pipe1800`):

| Repo | URL |
|------|-----|
| DB (migrations) | `https://github.com/pipe1800/contplus-db` |
| Frontend | `https://github.com/pipe1800/contplus-web` |

---

## Supabase Project

| Key | Value |
|-----|-------|
| URL | `https://roprnxkzzmlwdoahclwq.supabase.co` |
| Project Ref | `roprnxkzzmlwdoahclwq` |
| Publishable Key | `sb_publishable_SLzehUz7zz_1beQnAk7cWg_3Xd9sRvn` |
| DB Password | `GGLHwfDpSBrcMXHC` |
| Service Role Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcHJueGt6em1sd2RvYWhjbHdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4Mjg0MSwiZXhwIjoyMDk0MzU4ODQxfQ.yNBO99-M-FD7cqpCqojotNhmcA96vgCDjpcIQofe2Wg` |

### Vercel Env Vars
```
NEXT_PUBLIC_SUPABASE_URL=https://roprnxkzzmlwdoahclwq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_pub…sRvn
SUPABASE_SERVICE_ROLE_KEY=eyJhb…e2Wg
```

### Login
```
URL: https://contplus-web.vercel.app/login
Email: admin@contplus.com
Password: admin123
```

---

## Source Material

Original ContPlus 6 files (backups on Ventoy USB):
- `/run/media/Felipe/Ventoy/Contplus6/` — app + SQL schema
- `/run/media/Felipe/Ventoy/BackUpConta/` — production backup data (21 companies originally)
- `/home/Felipe/Documents/Contplus6/` — older local copy (single company)

Key files from the backup (pipe-delimited, separator = `\x0F` ASCII 15, encoding = Latin-1):
- `Cia.txt` — Companies
- `Catalogo.txt` — Chart of accounts (16K+ rows)
- `Concepto.txt` — Journal entry headers (4.4K rows)
- `Diario.txt` — Journal entry lines (34K rows)
- `FechaS.txt` — Fiscal periods
- `SaldoAnt.txt` — Prior year balances
- `EstadoR.txt` — Income statement snapshots
- `PlantillaH.txt` / `PlantillaD.txt` — Journal templates

The app is Visual FoxPro 9.0 with an Office 2007-style ribbon UI. All stored procedures are encrypted (`WITH ENCRYPTION`).

---

## Database (32 tables, ~100 stored procedures → PL/pgSQL functions)

### Core Accounting Tables
`cia` — Companies (7 after dedup)  
`catalogo` — Chart of accounts (hierarchical, 5 levels, `cuentd` = parent)  
`fecha_s` — Fiscal periods (one per month per company, tracks partida/voucher counters)  
`concepto` — Journal entry headers (id_pda links to diario.id_partida)  
`diario` — Journal entry lines (each row = one account movement with debit/credit)  
`bancos` — Bank account registry  
`cheque_h` / `cheque_d` — Check headers/details  
`saldos` / `saldo_dia` / `saldo_ant` — Balances (current, daily, prior year)  
`estado_r` — Income statement results  
`plantilla_h` / `plantilla_d` — Reusable journal templates  
`impress` — Report formatting config  
`trabajo` — Temporary work table  

### IVA/Tax Module
`i_cia`, `i_fechas`, `i_sucursal`, `i_caja`, `i_tipos_doc`, `i_clientes`, `i_compras`, `i_ventas_cf`, `i_ventas_fa`

### System
`usuario` — App users (legacy, distinct from Supabase auth)  
`company_members` — Links `auth.users` to `cia` (multi-tenant workspace)  
`pad_menu`, `section_menu`, `app_menu`, `option_menu` — Menu/permissions  
`reporte` — Stored reports (VARBINARY)  
`actualizar` — Version tracking  

### Key Functions (rewritten from encrypted SQL Server SPs)
`mayorizar_cta` — Post journal entries to ledger  
`calc_resultado` — Calculate income statement result  
`save_estado_r` — Snapshot income statement  
`get_cuentd` — Walk account hierarchy to find parent  
`inicializa_saldos` — Reset balances for a period  
`user_company_ids` — Helper for RLS policies  

### Data Relationships
```
auth.users → company_members → cia
                                    │
              ┌─────────────────────┤
              ▼                     ▼
          catalogo              concepto
          (accounts)            (entry headers)
              │                     │
              ▼                     ▼
          saldos                 diario
          (balances)             (entry lines)
              │
              ▼
          estado_r
```
**One `concepto` row = many `diario` rows** linked by `id_partida`.

---

## Current Data (7 companies)

| ID | Company | Accounts | Entries | Periods |
|----|---------|----------|---------|---------|
| 3 | CERRITOS CERRITOS Y CIA. | 676 | 534 | 56 |
| 4 | SAMBORO, S.A. DE C.V. | 1,605 | 13,287 | 120 |
| 6 | ESTUDIOS DOBLE V, S.A. DE C.V. | 576 | 1,134 | merged |
| 8 | MONARCA, S.A. DE C.V. | 3,563 | 6,783 | 130 |
| 10 | JUDA S.A. DE C.V. | 0 | 0 | empty |
| 11 | ENERNOVA, S.A. DE C.V. | 154 | 0 | 1 |
| 14 | IGLESIA BETHESDA | 1,108 | 112 | 109 |

Dedup: ESTUDIOS DOBLE V [6]+[12] merged, IGLESIA BETHESDA [13]+[14]+[15] merged, JUDA [9]+[10] merged. Empty shells deleted.

---

## UI Built

### Architecture
- **React Context** (`src/lib/company-context.tsx`): Global company selection state
- **Header dropdown**: Simple `<select>` in layout, persists to localStorage
- **All pages auto-scope** to selected company via context
- **No middleware** — auth handled client-side per page

### Pages
| Route | What |
|-------|------|
| `/login` | Login form (email + password, no signup) |
| `/` | Dashboard with module grid |
| `/catalogo` | Chart of accounts — tree view + search + detail panel |
| `/auth/callback` | Supabase OAuth callback |
| `/auth/signout` | Sign out → redirect |

### Key UI patterns
- Dark theme (zinc-950 bg, zinc-100 text)
- Account tree: expandable hierarchy, color-coded by type (Activo=blue, Pasivo=amber, etc.)
- Supabase client: `createBrowserClient` from `@supabase/ssr`, lazy-initialized via `useMemo()`
- Login redirect: `window.location.href` (not Next.js router) to ensure cookie propagation

---

## Supabase Migrations (in `contplus-db` repo)

1. `20260514000001_initial_schema.sql` — All 32 tables, RLS, auth trigger, accounting functions
2. `20260514000002_run_mayorizacion.sql` — Compute balances from imported entries (hierarchy-aware)
3. `20260514000003_add_fks_and_workspace.sql` — Foreign keys + company_members + RLS overhaul
4. `20260514000005_merge_duplicates.sql` — Company dedup (21→7)

---

## Original App Reverse-Engineering Notes

### Contabilidad Tab (4 modules, 18 buttons)
- **Catálogo de Cuentas**: Mantenimiento (CRUD), Crear rangos (batch), Impresión, Registrar Ctas.Bancarias
- **Partidas de Diario y Cheques**: Ingreso, Eliminación, Renumeración, Mayorizar, Cheque voucher, Impresión (3 formats)
- **Balances**: General, Comprobación, Auxiliar
- **Libros**: Diario general, Diario mayor, Auxiliar
- **Estados de Resultado**: Comparativo, Por sub cuentas, Por cuenta de mayor
- **Otros**: Movimiento de cuentas, Listado de cheques

Other tabs (not yet reverse-engineered): Configuraciones, Herramientas, IVA.

### Report Files (27 `.rpt` in `Images/Tmp/`)
BalGralRpte, BalCompSub, EstadoRAnio, LibDiaGral, LibMay, Voucher, etc.

---

## What's Next (Priority Order)

1. **Libro Diario** — Journal entry form (the core data entry screen). Header: date, description, period. Lines: account selector, debit, credit. Validates debits = credits. Auto-numbers per period.
2. **Mayorización** — "Post to ledger" button. Runs `mayorizar_cta` for the selected company/period.
3. **Balances** — Balance sheet, trial balance views
4. **Libros** — Daily book, general ledger
5. **Estados de Resultado** — Income statement
6. **Configuraciones** tab
7. **IVA** tab

---

## Technical Notes for Continuation

- **Company ID in all queries**: Always filter by `cia = companyContext.selectedId`
- **Account codes are CHAR(21)**: Must pad with spaces when querying (e.g., `"110101              "`)
- **Fiscal year dedup**: Catalogo has duplicate accounts per year — filter by most recent `fecha_ini`
- **Date format**: Timestamps stored as `2024-04-01T06:00:00` (UTC, CST offset)
- **Separator in backup files**: `\x0F` (ASCII 15, Shift In)
- **Encoding**: Latin-1 (CP-1252)
- **No middleware**: Auth is client-side only. No `middleware.ts` or `proxy.ts` in the repo.
- **`next.config.mjs`** (not `.ts`): Some Vercel versions don't parse `.ts` configs.
- **`vercel.json`**: Explicit `"framework": "nextjs"` — required for Vercel to serve the output correctly.
- **Data import script**: `/home/Felipe/Documents/contplus-web/scripts/import-full.cjs` (the last working version)
