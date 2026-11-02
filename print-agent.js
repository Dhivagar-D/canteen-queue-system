/**
 * Standalone Local Print Agent Daemon
 * 
 * Flow:
 * CLOUD BACKEND -> (Print Queue) -> LOCAL PRINT AGENT -> PRINTER 1 & PRINTER 2 -> PAPER BILL
 * 
 * This agent runs locally in the canteen on the cashier's computer or a mini-PC.
 * It continuously pulls pending print jobs from the cloud backend, dispatches them
 * to the physical printers (or writes formatted receipt files to local disk),
 * and acknowledges completion.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const SPOOL_DIR = path.resolve(__dirname, 'local-printer-spool');

// Ensure local spool directory exists
if (!fs.existsSync(SPOOL_DIR)) {
  fs.mkdirSync(SPOOL_DIR, { recursive: true });
}

console.log('====================================================');
console.log('  CAMPUS CANTEEN - LOCAL PRINT AGENT DAEMON ACTIVE  ');
console.log(`  Connecting to Cloud API: ${API_BASE}`);
console.log(`  Local Spool Directory: ${SPOOL_DIR}`);
console.log('  Monitoring PRINTER 1 (Station A) & PRINTER 2 (Station B)');
console.log('====================================================');

let isPolling = false;

async function pollQueue() {
  if (isPolling) return;
  isPolling = true;

  try {
    const res = await fetch(`${API_BASE}/print-queue/pending`);
    if (!res.ok) {
      console.warn(`[LocalAgent] Queue poll returned HTTP ${res.status}`);
      isPolling = false;
      return;
    }

    const data = await res.json();
    if (data.success && data.jobs && data.jobs.length > 0) {
      console.log(`[LocalAgent] Found ${data.jobs.length} pending print job(s) in cloud queue.`);

      for (const job of data.jobs) {
        await processJob(job);
      }
    }
  } catch (err) {
    console.error(`[LocalAgent] Error connecting to cloud queue: ${err.message}`);
  } finally {
    isPolling = false;
  }
}

async function processJob(job) {
  const printerName = job.assigned_printer === 'PRINTER_1' ? 'PRINTER 1 [Station A]' : 'PRINTER 2 [Station B]';
  console.log(`\n----------------------------------------------------`);
  console.log(`[LocalAgent] >>> DISPATCHING TO ${printerName}`);
  console.log(`[LocalAgent] Job #${job.id} | Order: ${job.order_number} | Token: #${job.token_number} | Claim: ${job.claim_code || 'N/A'} [${job.order_source}]`);

  // Write physical receipt file to local spool directory
  const filename = `${job.assigned_printer}_Token${job.token_number}_${job.order_number}.txt`;
  const filepath = path.join(SPOOL_DIR, filename);
  fs.writeFileSync(filepath, job.receipt_text, 'utf-8');
  console.log(`[LocalAgent] Physical Paper Bill written to: ${filepath}`);

  // Acknowledge completion back to cloud backend
  try {
    const ackRes = await fetch(`${API_BASE}/print-queue/${job.id}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerId: job.assigned_printer })
    });

    if (ackRes.ok) {
      console.log(`[LocalAgent] Successfully ACKed Job #${job.id} with Cloud Backend.`);
    }
  } catch (e) {
    console.error(`[LocalAgent] Failed to ACK job with cloud backend: ${e.message}`);
  }
}

// Poll every 2 seconds
setInterval(pollQueue, 2000);
pollQueue();
