const API_BASE = '/api';

export async function loginCampus(credentials) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Authentication failed');
  }
  return res.json();
}


export async function getMenu(session = '') {
  const url = session ? `${API_BASE}/menu?session=${session}` : `${API_BASE}/menu`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch menu');
  return res.json();
}

export async function toggleMenuItem(id) {
  const res = await fetch(`${API_BASE}/menu/${id}/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle menu item');
  return res.json();
}

export async function createMenuItem(itemData) {
  const res = await fetch(`${API_BASE}/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create menu item');
  }
  return res.json();
}

export async function updateMenuItem(id, itemData) {
  const res = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update menu item');
  }
  return res.json();
}

export async function updateItemStock(id, stockData) {
  const res = await fetch(`${API_BASE}/menu/${id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stockData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update item stock');
  }
  return res.json();
}

export async function deleteMenuItem(id) {
  const res = await fetch(`${API_BASE}/menu/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete menu item');
  return res.json();
}

export async function getSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function setSessionOverride(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
}

export async function createOrder(orderPayload) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to place order');
  }
  return res.json();
}

export async function getOrders(status = '', limit = 50) {
  const url = status ? `${API_BASE}/orders?status=${status}&limit=${limit}` : `${API_BASE}/orders?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function updateOrderStatus(orderId, newStatus) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });
  if (!res.ok) throw new Error('Failed to update order status');
  return res.json();
}

export async function reprintOrder(orderId, reason) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/reprint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error('Failed to reprint slip');
  return res.json();
}

// Local Print Agent & Queue
export async function getPrintQueuePending() {
  const res = await fetch(`${API_BASE}/print-queue/pending`);
  if (!res.ok) throw new Error('Failed to fetch pending print jobs');
  return res.json();
}

export async function ackPrintJob(jobId, printerId) {
  const res = await fetch(`${API_BASE}/print-queue/${jobId}/ack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerId })
  });
  if (!res.ok) throw new Error('Failed to acknowledge print job');
  return res.json();
}

export async function failoverPrintJob(jobId, reason) {
  const res = await fetch(`${API_BASE}/print-queue/${jobId}/fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error('Failed to failover print job');
  return res.json();
}

export async function getPrinterStatus() {
  const res = await fetch(`${API_BASE}/printers`);
  if (!res.ok) throw new Error('Failed to fetch printer status');
  return res.json();
}

export async function setPrinterStatus(printerId, status) {
  const res = await fetch(`${API_BASE}/printers/${printerId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to set printer status');
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function getDailyReport() {
  const res = await fetch(`${API_BASE}/reports/daily-summary`);
  if (!res.ok) throw new Error('Failed to fetch daily report');
  return res.json();
}

export async function triggerTestPrint(printerId = 'PRINTER_1') {
  const res = await fetch(`${API_BASE}/printers/test-print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerId })
  });
  if (!res.ok) throw new Error('Failed to trigger test print');
  return res.json();
}


/**
 * Connect to SSE stream with automatic reconnection
 */
export function subscribeToEvents(onEvent, onConnectionChange) {
  let eventSource = null;
  let isCancelled = false;

  function connect() {
    if (isCancelled) return;

    eventSource = new EventSource(`${API_BASE}/events`);

    eventSource.onopen = () => {
      if (onConnectionChange) onConnectionChange(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (onEvent) onEvent(data);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      if (onConnectionChange) onConnectionChange(false);
      eventSource.close();
      if (!isCancelled) {
        setTimeout(connect, 3000);
      }
    };
  }

  connect();

  return () => {
    isCancelled = true;
    if (eventSource) {
      eventSource.close();
    }
  };
}
