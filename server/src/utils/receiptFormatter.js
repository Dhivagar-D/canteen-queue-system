/**
 * Receipt Formatter for Thermal Printers (58mm / 80mm layout)
 * Generates clear, high-contrast text representations suitable for ESC/POS printers
 * and visual simulator monitors.
 */
export function formatReceipt({
  orderNumber,
  tokenNumber,
  claimCode = '',
  orderSource,
  customerName,
  paymentMethod,
  paymentStatus,
  items,
  totalAmount,
  assignedPrinter,
  printedAt,
  isReprint = false,
  reprintReason = ''
}) {
  const width = 36;
  const hr = '-'.repeat(width);
  const doubleHr = '='.repeat(width);

  const center = (text, padChar = ' ') => {
    const len = text.length;
    if (len >= width) return text.substring(0, width);
    const leftPad = Math.floor((width - len) / 2);
    const rightPad = width - len - leftPad;
    return padChar.repeat(leftPad) + text + padChar.repeat(rightPad);
  };

  const row = (left, right) => {
    const spaceNeeded = width - (left.length + right.length);
    if (spaceNeeded <= 0) return (left + ' ' + right).substring(0, width);
    return left + ' '.repeat(spaceNeeded) + right;
  };

  const lines = [];

  // Header
  lines.push(doubleHr);
  lines.push(center('CANTEEN EXPRESS'));
  lines.push(center('DINING SERVICES'));
  lines.push(doubleHr);

  // Reprint Warning
  if (isReprint) {
    lines.push(center('*** DUPLICATE / REPRINT ***'));
    if (reprintReason) {
      lines.push(center(`Reason: ${reprintReason}`));
    }
    lines.push(doubleHr);
  }

  // Giant Token Callout for Food Servers
  lines.push('');
  lines.push(center(`*** TOKEN #${tokenNumber} ***`));
  if (claimCode) {
    lines.push(center(`VERIFY CLAIM CODE: [ ${claimCode} ]`));
  }
  lines.push(center(`[ ${orderSource === 'DIGITAL_WEB' ? 'ONLINE PRE-ORDER' : 'COUNTER MANUAL BILL'} ]`));
  lines.push('');
  lines.push(doubleHr);

  // Metadata
  const dateStr = new Date(printedAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = new Date(printedAt || Date.now()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  lines.push(row(`Date: ${dateStr}`, `Time: ${timeStr}`));
  lines.push(row(`Order: ${orderNumber}`, `Paid: ${paymentMethod}`));
  lines.push(row(`Customer: ${customerName || 'Student'}`, `Status: ${paymentStatus}`));
  lines.push(hr);

  // Printer Dispatch Info
  const printerLabel = assignedPrinter === 'PRINTER_1' ? 'PRINTER 1 [Station A]' : 'PRINTER 2 [Station B]';
  lines.push(row('Dispatched To:', printerLabel));
  lines.push(row('Load Balance:', 'Alternating (1:1)'));
  lines.push(hr);

  // Order Items
  lines.push(row('QTY  ITEM DESCRIPTION', 'AMOUNT'));
  lines.push(hr);

  for (const item of items) {
    const qtyPrefix = `${item.quantity}x `.padEnd(4);
    const itemTitle = item.item_name || item.name;
    const priceStr = `Rs.${Number(item.subtotal || item.unit_price * item.quantity).toFixed(0)}`;
    lines.push(row(`${qtyPrefix}${itemTitle}`, priceStr));
  }

  lines.push(hr);
  const totalItemCount = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
  lines.push(row(`Total Items: ${totalItemCount}`, `TOTAL: Rs.${Number(totalAmount).toFixed(2)}`));
  lines.push(doubleHr);

  // Server Guidance & Idempotency Stamp
  lines.push(center('>> SERVER INSTRUCTIONS <<'));
  lines.push(center('Prepare items & call Token #' + tokenNumber));
  if (claimCode) {
    lines.push(center(`Match Customer Code [ ${claimCode} ] to Handover`));
  }
  lines.push(center('No duplicate billing. Single print.'));
  lines.push(doubleHr);
  lines.push('');

  return lines.join('\n');
}
