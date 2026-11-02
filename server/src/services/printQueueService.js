import EventEmitter from 'node:events';
import { db } from '../config/database.js';

class PrintQueueService extends EventEmitter {
  constructor() {
    super();
    this.lastAssignedIndex = -1;
    this.printers = ['PRINTER_1', 'PRINTER_2'];
  }

  /**
   * Determine next printer in alternating 1:1 round-robin
   */
  getNextPrinter() {
    this.lastAssignedIndex = (this.lastAssignedIndex + 1) % this.printers.length;
    return this.printers[this.lastAssignedIndex];
  }

  /**
   * Add a print job to the persistent cloud queue
   */
  enqueueJob({ orderId, orderNumber, tokenNumber, claimCode = '', orderSource, customerName, totalAmount, receiptText, assignedPrinter }) {
    const targetPrinter = assignedPrinter || this.getNextPrinter();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO print_queue (
        order_id, order_number, token_number, claim_code, order_source,
        customer_name, total_amount, assigned_printer, receipt_text,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);

    const result = insertStmt.run(
      orderId,
      orderNumber,
      tokenNumber,
      claimCode,
      orderSource,
      customerName || 'Student',
      totalAmount || 0,
      targetPrinter,
      receiptText,
      now
    );

    const job = {
      id: Number(result.lastInsertRowid),
      orderId,
      orderNumber,
      tokenNumber,
      claimCode,
      orderSource,
      customerName,
      totalAmount,
      assignedPrinter: targetPrinter,
      receiptText,
      status: 'PENDING',
      createdAt: now
    };

    console.log(`[PrintQueue] Enqueued Job #${job.id} (Claim: ${claimCode}) for Order ${orderNumber} -> ${targetPrinter}`);

    // Notify listeners (SSE to Local Print Agent)
    this.emit('job_queued', job);

    return job;
  }

  /**
   * Fetch all pending jobs for the Local Print Agent
   */
  getPendingJobs() {
    return db.prepare("SELECT * FROM print_queue WHERE status = 'PENDING' ORDER BY id ASC").all();
  }

  /**
   * Acknowledge that a job was successfully printed by the local printer
   */
  acknowledgePrinted(jobId, localPrinterId) {
    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE print_queue 
      SET status = 'PRINTED', printed_at = ?, assigned_printer = COALESCE(?, assigned_printer)
      WHERE id = ?
    `);

    const result = updateStmt.run(now, localPrinterId || null, jobId);
    if (result.changes > 0) {
      const job = db.prepare('SELECT * FROM print_queue WHERE id = ?').get(jobId);
      console.log(`[PrintQueue] Acknowledged Job #${jobId} printed on ${job.assigned_printer}`);
      this.emit('job_printed', job);
      return { success: true, job };
    }
    return { success: false, error: 'Job not found' };
  }

  /**
   * Failover: reroute a job to the opposite printer if local hardware reports paper out
   */
  failoverJob(jobId, failReason) {
    const job = db.prepare('SELECT * FROM print_queue WHERE id = ?').get(jobId);
    if (!job) return { success: false, error: 'Job not found' };

    const alternatePrinter = job.assigned_printer === 'PRINTER_1' ? 'PRINTER_2' : 'PRINTER_1';
    db.prepare(`
      UPDATE print_queue
      SET assigned_printer = ?, status = 'PENDING'
      WHERE id = ?
    `).run(alternatePrinter, jobId);

    console.warn(`[PrintQueue] Job #${jobId} failed over from ${job.assigned_printer} to ${alternatePrinter}. Reason: ${failReason}`);
    const updated = db.prepare('SELECT * FROM print_queue WHERE id = ?').get(jobId);
    this.emit('job_failover', { jobId, previousPrinter: job.assigned_printer, newPrinter: alternatePrinter, reason: failReason });
    return { success: true, job: updated };
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const pending = db.prepare("SELECT COUNT(*) as c FROM print_queue WHERE status = 'PENDING'").get().c;
    const printed = db.prepare("SELECT COUNT(*) as c FROM print_queue WHERE status = 'PRINTED'").get().c;
    const p1Count = db.prepare("SELECT COUNT(*) as c FROM print_queue WHERE assigned_printer = 'PRINTER_1' AND status = 'PRINTED'").get().c;
    const p2Count = db.prepare("SELECT COUNT(*) as c FROM print_queue WHERE assigned_printer = 'PRINTER_2' AND status = 'PRINTED'").get().c;

    return {
      pendingJobs: pending,
      printedJobs: printed,
      printer1Dispatched: p1Count,
      printer2Dispatched: p2Count
    };
  }
}

export const printQueueService = new PrintQueueService();
