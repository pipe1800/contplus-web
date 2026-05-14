#!/usr/bin/env node

/**
 * Data Import Script: BackUpConta → Supabase PostgreSQL
 *
 * Reads pipe-delimited backup files from the original Contplus 6
 * and inserts data into the new Supabase PostgreSQL database.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/import-backup.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// --- Config ---
const BACKUP_DIR = "/home/Felipe/Documents/Contplus6/BackUpConta";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY_ID = 20; // Original company ID from backup data

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  // Fallback to env.local style
  console.error("Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Helpers ---
function parsePipeFile(filepath) {
  const content = readFileSync(filepath, "latin1");
  return content
    .trim()
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      // Split by field separator (ASCII 31 = unit separator in some files, or simple pipe)
      // The backup uses ASCII character 31 (0x1F) as field separator
      return line.split("\x1F").map((f) => f.trim());
    });
}

function parseDate(val) {
  if (!val || val === "0") return null;
  // Format: DD/MM/YYYY or DD/MM/YYYY HH:MM:SS AM/PM
  const parts = val.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const rest = parts[2].split(" ");
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(rest[0]);
  if (rest.length > 1) {
    const timeParts = rest.slice(1).join(" ").split(":");
    const hour = parseInt(timeParts[0]);
    const min = parseInt(timeParts[1]);
    const sec = parseInt(timeParts[2]?.split(" ")[0] || "0");
    const isPM = rest.join(" ").toUpperCase().includes("PM");
    const adjustedHour = isPM && hour < 12 ? hour + 12 : !isPM && hour === 12 ? 0 : hour;
    return new Date(year, month, day, adjustedHour, min, sec).toISOString();
  }
  return new Date(year, month, day).toISOString();
}

function parseBool(val) {
  const v = val?.toLowerCase();
  return v === "t" || v === "true" || v === "1";
}

function parseDecimal(val) {
  if (!val) return 0;
  return parseFloat(val) || 0;
}

function parseSmallInt(val) {
  return parseInt(val) || 0;
}

// --- Importers ---
async function importCia() {
  console.log("\n📦 Importing Cia (Company)...");
  const filepath = join(BACKUP_DIR, "Cia.txt");
  if (!existsSync(filepath)) {
    console.log("  No Cia.txt found, skipping.");
    return;
  }
  const rows = parsePipeFile(filepath);
  for (const row of rows) {
    // Format: Nombre|Cuentas|Mayor|Firma1Col1|...|IdCia|Transito|Plantilla
    const company = {
      nombre: row[0] || "",
      cuentas: row[1] || null,
      mayor: parseSmallInt(row[2]),
      firma1col1: row[3] || "",
      firma1col2: row[4] || "",
      firma1col3: row[5] || "",
      firma2col1: row[6] || "",
      firma2col2: row[7] || "",
      firma2col3: row[8] || "",
      psw_mes: row[9] || "",
      psw_year: row[10] || "",
      last_one: parseBool(row[11]),
      capital: row[13] || "CAPITAL",
      perdida: row[14] || "DEFICIT DEL EJERCICIO",
      ganancia: row[15] || "SUPERAVIT DEL EJERCICIO",
      resultado: row[16] || "RESULTADO DEL EJERCICIO",
      print_cero: parseBool(row[17]),
      egresos_bs: row[18] || "ACTIVOS, COSTOS Y GASTOS",
      ingresos_bs: row[19] || "PASIVO, CAPITAL Y PRODUCTOS",
      egresos_bc: row[20] || "ACTIVOS, COSTOS Y GASTOS",
      ingresos_bc: row[21] || "PASIVO, CAPITAL E INGRESOS",
      id_cia: row[22] || null,
      transito: row[23] || "",
      plantilla: parseSmallInt(row[24]) || 0,
    };

    const { error } = await supabase.from("cia").insert(company);
    if (error) {
      console.error(`  ❌ Error inserting company: ${error.message}`);
    } else {
      console.log(`  ✅ Company: ${company.nombre}`);
    }
  }
}

async function importCatalogo() {
  console.log("\n📦 Importing Catalogo (Chart of Accounts)...");
  const filepath = join(BACKUP_DIR, "Catalogo.txt");
  if (!existsSync(filepath)) {
    console.log("  No Catalogo.txt found, skipping.");
    return;
  }
  const rows = parsePipeFile(filepath);
  let imported = 0;
  const batch = [];

  for (const row of rows) {
    // Format: Cuenta|Nombre|Tipo|CuentD|Nivel|FechaIni|Cia
    batch.push({
      cuenta: row[0] || "",
      nombre: row[1] || "",
      tipo: row[2] || "",
      cuentd: row[3] || "0",
      nivel: parseSmallInt(row[4]),
      fecha_ini: parseDate(row[5]),
      cia: parseSmallInt(row[6]) || COMPANY_ID,
    });

    if (batch.length >= 100) {
      const { error } = await supabase.from("catalogo").insert(batch);
      if (error) console.error(`  ❌ Batch error: ${error.message}`);
      else imported += batch.length;
      batch.length = 0;
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    const { error } = await supabase.from("catalogo").insert(batch);
    if (error) console.error(`  ❌ Batch error: ${error.message}`);
    else imported += batch.length;
  }

  console.log(`  ✅ Imported ${imported} accounts`);
}

async function importConceptos() {
  console.log("\n📦 Importing Conceptos (Transaction Headers)...");
  const filepath = join(BACKUP_DIR, "Concepto.txt");
  if (!existsSync(filepath)) {
    console.log("  No Concepto.txt found, skipping.");
    return;
  }
  const rows = parsePipeFile(filepath);
  let imported = 0;
  const batch = [];

  for (const row of rows) {
    // Format: Numero|Ext|Linea|FechaPda|Cargo|Abono|Mes|FechaSys|Cia|IdPda|TipoPda
    batch.push({
      numero: parseInt(row[0]) || 0,
      ext: row[1] || "",
      linea: row[2] || "",
      fecha_pda: parseDate(row[3]),
      cargo: parseDecimal(row[4]),
      abono: parseDecimal(row[5]),
      mes: parseDate(row[6]),
      fecha_sys: parseDate(row[7]),
      cia: parseSmallInt(row[8]) || COMPANY_ID,
      id_pda: parseInt(row[9]) || 0,
      tipo_pda: parseSmallInt(row[10]) || 0,
    });

    if (batch.length >= 100) {
      const { error } = await supabase.from("concepto").insert(batch);
      if (error) console.error(`  ❌ Batch error: ${error.message}`);
      else imported += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    const { error } = await supabase.from("concepto").insert(batch);
    if (error) console.error(`  ❌ Batch error: ${error.message}`);
    else imported += batch.length;
  }

  console.log(`  ✅ Imported ${imported} concepts`);
}

async function importDiario() {
  console.log("\n📦 Importing Diario (Journal Entries)...");
  const filepath = join(BACKUP_DIR, "Diario.txt");
  if (!existsSync(filepath)) {
    console.log("  No Diario.txt found, skipping.");
    return;
  }
  const rows = parsePipeFile(filepath);
  let imported = 0;
  const batch = [];

  for (const row of rows) {
    // Format varies. Let me check the data:
    // Numero|Ext|FechaMov|Cuenta|Concepto|Cargo|Abono|Mes|Item|Cia|IdPartida|...
    batch.push({
      numero: parseInt(row[0]) || 0,
      ext: row[1] || "",
      fecha_mov: parseDate(row[2]),
      cuenta: row[3] || "",
      concepto: row[4] || "",
      cargo: parseDecimal(row[5]),
      abono: parseDecimal(row[6]),
      mes: parseDate(row[7]),
      item: parseSmallInt(row[8]),
      cia: parseSmallInt(row[9]) || COMPANY_ID,
      id_partida: parseInt(row[10]) || 0,
      formula: row[11] || null,
    });

    if (batch.length >= 100) {
      const { error } = await supabase.from("diario").insert(batch);
      if (error) console.error(`  ❌ Batch error: ${error.message}`);
      else imported += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    const { error } = await supabase.from("diario").insert(batch);
    if (error) console.error(`  ❌ Batch error: ${error.message}`);
    else imported += batch.length;
  }

  console.log(`  ✅ Imported ${imported} journal entries`);
}

async function importFechaS() {
  console.log("\n📦 Importing FechaS (Fiscal Periods)...");
  const filepath = join(BACKUP_DIR, "FechaS.txt");
  if (!existsSync(filepath)) {
    console.log("  No FechaS.txt found, skipping.");
    return;
  }
  const rows = parsePipeFile(filepath);
  const batch = [];

  for (const row of rows) {
    // Format: Fecha|Cia|Partida|Voucher
    batch.push({
      fecha: parseDate(row[0]),
      cia: parseSmallInt(row[1]) || COMPANY_ID,
      partida: parseInt(row[2]) || 0,
      voucher: parseInt(row[3]) || 0,
    });
  }

  if (batch.length > 0) {
    const { error } = await supabase.from("fecha_s").insert(batch);
    if (error) console.error(`  ❌ Error: ${error.message}`);
    else console.log(`  ✅ Imported ${batch.length} fiscal periods`);
  }
}

// --- Main ---
async function main() {
  console.log("🚀 ContPlus 6 — Backup Data Import");
  console.log(`   Source: ${BACKUP_DIR}`);
  console.log(`   Target: ${SUPABASE_URL}`);
  console.log(`   Company ID: ${COMPANY_ID}`);

  await importCia();
  await importFechaS();
  await importCatalogo();
  await importConceptos();
  await importDiario();

  console.log("\n✅ Import complete!");
}

main().catch(console.error);
