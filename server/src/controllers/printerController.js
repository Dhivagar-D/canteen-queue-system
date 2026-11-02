import { printerSpooler } from '../services/printerSpooler.js';

export function getPrinterStatus(req, res) {
  try {
    const status = printerSpooler.getStatus();
    return res.json({ success: true, ...status });
  } catch (err) {
    console.error('[getPrinterStatus] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch printer status' });
  }
}

export function setPrinterStatus(req, res) {
  try {
    const { printerId } = req.params;
    const { status } = req.body;

    const validStatuses = ['ONLINE', 'PAPER_OUT', 'OFFLINE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = printerSpooler.setPrinterStatus(printerId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Printer not found' });
    }

    return res.json({
      success: true,
      message: `${printerId} status changed to ${status}`,
      printer: printerSpooler.printers[printerId]
    });
  } catch (err) {
    console.error('[setPrinterStatus] Error:', err);
    return res.status(500).json({ error: 'Failed to set printer status' });
  }
}
