#!/usr/bin/env node

/**
 * Data Import Script: BackUpConta → Supabase PostgreSQL
 *
 * Separator: \x0F (ASCII 15, Shift In)
 * Encoding: Latin-1 (CP-1252)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BACKUP_DIR = "/home/Felipe/Documents/Contplus6/BackUpConta";
const SUPABASE_URL = "https://roprnxkzzmlwdoahclwq.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcHJueGt6em1sd2RvYWhjbHdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4Mjg0MSwiZXhwIjoyMDk0MzU4ODQxfQ.yNBO99-M-FD7cqpCqojotNhmcA96vgCDjpcIQofe2Wg";
const COMPANY_ID = 20;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Helpers ---
function parsePipeFile(filepath) {
  const content = readFileSync(filepath, "latin1");
  const SEP = String.fromCharCode(0x0f);
  return content
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.split(SEP).map((f) => f.trim()));
}

function parseDate(val) {
  if (!val) return null;
  // Format: DD/MM/YYYY or DD/MM/YYYY HH:MM:SS AM/PM
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?/i);
  if (!m) return null;
  const day = parseInt(m[1]);
  const month = parseInt(m[2]) - 1;
  const year = parseInt(m[3]);
  let hour = parseInt(m[4] || "0");
  const min = parseInt(m[5] || "0");
  const sec = parseInt(m[6] || "0");
  const ampm = (m[7] || "").toUpperCase();

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const d = new Date(year, month, day, hour, min, sec);
  if (isNaN(d.getTime())) return null;
  // Return YYYY-MM-DD HH:MM:SS without TZ
  return d.toISOString().replace("T", " ").replace("Z", "");
}

function toBool(val) {
  const v = val?.toLowerCase();
  return v === "t" || v === "true" || v === "1";
}

function toDec(val) {
  if (!val) return 0;
  return parseFloat(val) || 0;
}

function toInt(val) {
  return parseInt(val) || 0;
}

// --- Importers ---
async function importCia() {
  console.log("\n📦 Cia...");
  const fp = join(BACKUP_DIR, "Cia.txt");
  if (!existsSync(fp)) return console.log("  No file");
  const rows = parsePipeFile(fp);
  for (const r of rows) {
    const obj = {
      nombre: (r[0] || "").substring(0, 150),
      cuentas: (r[1] || "").substring(0, 9) || null,
      mayor: toInt(r[2]),
      firma1col1: r[3] || "",
      firma1col2: r[4] || "",
      firma1col3: r[5] || "",
      firma2col1: r[6] || "",
      firma2col2: r[7] || "",
      firma2col3: r[8] || "",
      psw_mes: r[9] || "",
      psw_year: r[10] || "",
      last_one: toBool(r[11]),
      capital: r[13] || "CAPITAL",
      perdida: r[14] || "DEFICIT DEL EJERCICIO",
      ganancia: r[15] || "SUPERAVIT DEL EJERCICIO",
      resultado: r[16] || "RESULTADO DEL EJERCICIO",
      print_cero: toBool(r[17]),
      egresos_bs: r[18] || "ACTIVOS, COSTOS Y GASTOS",
      ingresos_bs: r[19] || "PASIVO, CAPITAL Y PRODUCTOS",
      egresos_bc: r[20] || "ACTIVOS, COSTOS Y GASTOS",
      ingresos_bc: r[21] || "PASIVO, CAPITAL E INGRESOS",
      id_cia: (r[22] || "").substring(0, 15) || null,
      transito: r[23] || "",
      plantilla: toInt(r[24]) || 0,
    };
    const { error } = await supabase.from("cia").insert(obj);
    if (error) console.error(`  ❌ ${error.message}`);
    else console.log(`  ✅ ${obj.nombre}`);
  }
}

async function importFechaS() {
  console.log("\n📦 FechaS...");
  const fp = join(BACKUP_DIR, "FechaS.txt");
  if (!existsSync(fp)) return console.log("  No file");
  const rows = parsePipeFile(fp);
  const batch = [];
  for (const r of rows) {
    batch.push({
      fecha: parseDate(r[0]),
      cia: toInt(r[1]) || COMPANY_ID,
      partida: toInt(r[2]),
      voucher: toInt(r[3]),
    });
  }
  if (batch.length > 0) {
    const { error } = await supabase.from("fecha_s").insert(batch);
    if (error) console.error(`  ❌ ${error.message}`);
    else console.log(`  ✅ ${batch.length} periods`);
  }
}

async function importCatalogo() {
  console.log("\n📦 Catalogo...");
  const fp = join(BACKUP_DIR, "Catalogo.txt");
  if (!existsSync(fp)) return console.log("  No file");
  const rows = parsePipeFile(fp);
  let imported = 0;
  const batch = [];

  for (const r of rows) {
    batch.push({
      cuenta: (r[0] || "").substring(0, 21),
      nombre: r[1] || "",
      tipo: r[2] || "",
      cuentd: (r[3] || "0").substring(0, 21),
      nivel: toInt(r[4]),
      fecha_ini: parseDate(r[5]),
      cia: toInt(r[6]) || COMPANY_ID,
    });

    if (batch.length >= 100) {
      const { error } = await supabase.from("catalogo").insert(batch);
      if (error) console.error(`  ❌ ${error.message}`);
      else imported += batch.length;
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    const { error } = await supabase.from("catalogo").insert(batch);
    if (error) console.error(`  ❌ ${error.message}`);
    else imported += batch.length;
  }
  console.log(`  ✅ ${imported} accounts`);
}

async function importConceptos() {
  console.log("\n📦 Conceptos...");
  const fp = join(BACKUP_DIR, "Concepto.txt");
  if (!existsSync(fp)) return console.log("  No file");
  const rows = parsePipeFile(fp);
  let imported = 0;
  const batch = [];

  for (const r of rows) {
    batch.push({
      numero: toInt(r[0]),
      ext: r[1] || "",
      linea: r[2] || "",
      fecha_pda: parseDate(r[3]),
      cargo: toDec(r[4]),
      abono: toDec(r[5]),
      mes: parseDate(r[6]),
      fecha_sys: parseDate(r[7]),
      cia: toInt(r[8]) || COMPANY_ID,
      id_pda: toInt(r[9]),
      tipo_pda: toInt(r[10]) || 0,
    });

    if (batch.length >= 100) {
      const { error } = await supabase.from("concepto").insert(batch);
      if (error) console.error(`  ❌ ${error.message}`);
      else imported += batch.length;
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    const { error } = await supabase.from("concepto").insert(batch);
    if (error) console.error(`  ❌ ${error.message}`);
    else imported += batch.length;
  }
  console.log(`  ✅ ${imported} concepts`);
}

async function importDiario() {
  console.log("\n📦 Diario...");
  const fp = join(BACKUP_DIR, "Diario.txt");
  if (!existsSync(fp)) return console.log("  No file");
  const rows = parsePipeFile(fp);
  let imported = 0;
  const batch = [];

  for (const r of rows) {
    batch.push({
      numero: toInt(r[0]),
      ext: r[1] || "",
      fecha_mov: parseDate(r[2]),
      cuenta: r[3] || "",
      concepto: r[4] || "",
      cargo: toDec(r[5]),
      abono: toDec(r[6]),
      mes: parseDate(r[7]),
      item: toInt(r[8]),
      cia: toInt(r[9]) || COMPANY_ID,
      id_partida: toInt(r[10]),
      formula: r[11] || null,
    });

    if (batch.length >= 100) {
      const { error } = await supabase.from("diario").insert(batch);
      if (error) console.error(`  ❌ ${error.message}`);
      else imported += batch.length;
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    const { error } = await supabase.from("diario").insert(batch);
    if (error) console.error(`  ❌ ${error.message}`);
    else imported += batch.length;
  }
  console.log(`  ✅ ${imported} entries`);
}

// --- Main ---
async function main() {
  console.log("🚀 ContPlus 6 → Supabase Import");
  console.log(`   Source: ${BACKUP_DIR}`);
  console.log(`   Company ID: ${COMPANY_ID}`);

  await importCia();
  await importFechaS();
  await importCatalogo();
  await importConceptos();
  await importDiario();

  console.log("\n✅ Done!");
}

main().catch(console.error);
