import EventEmitter from 'node:events';

class PrinterSpooler extends EventEmitter {
  constructor() {
    super();
    this.printers = {
      PRINTER_1: {
        id: 'PRINTER_1',
        name: 'Kitchen Station A (Printer 1)',
        status: 'ONLINE', // ONLINE | OFFLINE | PAPER_OUT
        printCount: 0,
        lastJobTime: null,
        recentJobs: []
      },
      PRINTER_2: {
        id: 'PRINTER_2',
        name: 'Kitchen Station B (Printer 2)',
        status: 'ONLINE', // ONLINE | OFFLINE | PAPER_OUT
        printCount: 0,
        lastJobTime: null,
        recentJobs: []
      }
    };

    // 0 = PRINTER_1 was last, 1 = PRINTER_2 was last. Start with -1 so first order gets PRINTER_1.
    this.lastAssignedIndex = -1;
    this.printerKeys = ['PRINTER_1', 'PRINTER_2'];
    this.printedOrderIds = new Set();
  }

  /**
   * Determine which printer receives the next order according to strict alternating Round-Robin
   * with automatic failover if one printer is offline.
   */
  assignPrinter() {
    const p1Status = this.printers.PRINTER_1.status;
    const p2Status = this.printers.PRINTER_2.status;

    // Failover if one is offline
    if (p1Status !== 'ONLINE' && p2Status === 'ONLINE') {
      return 'PRINTER_2';
    }
    if (p2Status !== 'ONLINE' && p1Status === 'ONLINE') {
      return 'PRINTER_1';
    }
    if (p1Status !== 'ONLINE' && p2Status !== 'ONLINE') {
      // Both down: fallback to default queue
      return 'PRINTER_1';
    }

    // Both online: strictly alternate
    const nextIndex = (this.lastAssignedIndex + 1) % this.printerKeys.length;
    this.lastAssignedIndex = nextIndex;
    return this.printerKeys[nextIndex];
  }

  /**
   * Dispatch an order slip to its designated printer.
   * Strictly enforces single-print idempotency.
   */
  dispatchJob(order, receiptText, isReprint = false, reprintReason = '') {
    // Idempotency check: if not a designated reprint, prevent duplicate dispatch
    if (!isReprint && this.printedOrderIds.has(order.id)) {
      console.warn(`[PrinterSpooler] Prevented duplicate print for Order #${order.order_number} (ID: ${order.id})`);
      return {
        success: false,
        message: 'Order already printed. Duplicate printing rejected to prevent double food preparation.',
        printerId: order.assigned_printer
      };
    }

    const targetPrinterId = order.assigned_printer || 'PRINTER_1';
    const printer = this.printers[targetPrinterId] || this.printers.PRINTER_1;

    const job = {
      jobId: `JOB-${Date.now()}-${order.id}`,
      orderId: order.id,
      orderNumber: order.order_number,
      tokenNumber: order.token_number,
      orderSource: order.order_source,
      printerId: targetPrinterId,
      printerName: printer.name,
      receiptText,
      totalAmount: order.total_amount,
      itemCount: order.items ? order.items.length : 0,
      timestamp: new Date().toISOString(),
      isReprint,
      reprintReason
    };

    // Update printer stats
    printer.printCount += 1;
    printer.lastJobTime = job.timestamp;
    printer.recentJobs.unshift(job);
    if (printer.recentJobs.length > 50) {
      printer.recentJobs.pop();
    }

    this.printedOrderIds.add(order.id);

    console.log(`[PrinterSpooler] >>> PRINTED to ${targetPrinterId}: Token #${order.token_number} (${order.order_number}) [${order.order_source}]`);

    // Emit event for real-time SSE stream
    this.emit('job_printed', job);

    return {
      success: true,
      job,
      printer
    };
  }

  /**
   * Toggle printer online/paper-out status for demonstration & testing
   */
  setPrinterStatus(printerId, status) {
    if (this.printers[printerId]) {
      this.printers[printerId].status = status;
      this.emit('printer_status_changed', { printerId, status });
      return true;
    }
    return false;
  }

  getStatus() {
    return {
      printers: this.printers,
      lastAssignedIndex: this.lastAssignedIndex,
      totalPrintedJobs: this.printedOrderIds.size
    };
  }
}

export const printerSpooler = new PrinterSpooler();
