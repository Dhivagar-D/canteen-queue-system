import { printQueueService } from '../services/printQueueService.js';

export function getPendingPrintJobs(req, res) {
  try {
    const jobs = printQueueService.getPendingJobs();
    return res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    console.error('[getPendingPrintJobs] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch pending print jobs' });
  }
}

export function acknowledgeJob(req, res) {
  try {
    const { id } = req.params;
    const { printerId } = req.body;

    const result = printQueueService.acknowledgePrinted(parseInt(id, 10), printerId);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: `Job #${id} successfully acknowledged as printed on ${result.job.assigned_printer}`,
      job: result.job
    });
  } catch (err) {
    console.error('[acknowledgeJob] Error:', err);
    return res.status(500).json({ error: 'Failed to acknowledge job' });
  }
}

export function failoverJob(req, res) {
  try {
    const { id } = req.params;
    const { reason = 'Printer Hardware Error' } = req.body;

    const result = printQueueService.failoverJob(parseInt(id, 10), reason);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: `Job #${id} rerouted to ${result.job.assigned_printer}`,
      job: result.job
    });
  } catch (err) {
    console.error('[failoverJob] Error:', err);
    return res.status(500).json({ error: 'Failed to failover job' });
  }
}

export function getQueueStatus(req, res) {
  try {
    const stats = printQueueService.getStats();
    return res.json({ success: true, ...stats });
  } catch (err) {
    console.error('[getQueueStatus] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch queue status' });
  }
}
