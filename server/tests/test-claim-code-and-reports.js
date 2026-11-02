/**
 * Automated Verification: Claim Code, Daily Z-Report & Receipt Preview
 */
import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('===============================================================');
  console.log(' STARTING CLAIM CODE, DAILY Z-REPORT & TEST PRINT VERIFICATION ');
  console.log('===============================================================\n');

  // 1. Place a Digital Web Order with Claim Verification Code
  console.log('[Test 1] Placing digital order & verifying 2-digit Claim Code...');
  const orderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_source: 'DIGITAL_WEB',
      customer_name: 'Roll: 21CS045',
      payment_method: 'UPI',
      payment_status: 'PAID',
      items: [
        { name: 'Masala Dosa', price: 45, quantity: 2 },
        { name: 'Filter Coffee', price: 20, quantity: 1 }
      ]
    })
  });

  const orderData = await orderRes.json();
  assert.strictEqual(orderRes.status, 201, 'Order placement should return 201');
  assert.strictEqual(orderData.success, true);
  const order = orderData.order;

  assert.ok(order.claim_code, 'Order must contain a claim_code');
  const codeNum = parseInt(order.claim_code, 10);
  assert.ok(codeNum >= 10 && codeNum <= 99, `Claim code must be 2 digits (10-99), got: ${order.claim_code}`);
  assert.ok(order.receipt_text.includes(`VERIFY CLAIM CODE: [ ${order.claim_code} ]`), 'Receipt text must include claim code banner');
  assert.ok(order.receipt_text.includes(`Match Customer Code [ ${order.claim_code} ]`), 'Receipt text must guide food server');
  console.log(`  ✅ [PASS] Order #${order.order_number} created with Token #${order.token_number} & Claim Code: [ ${order.claim_code} ]`);

  // 2. Verify End-of-Day Daily Z-Report & Sales Reconciliation
  console.log('\n[Test 2] Fetching End-of-Day Daily Z-Report (/api/reports/daily-summary)...');
  const reportRes = await fetch(`${BASE_URL}/reports/daily-summary`);
  assert.strictEqual(reportRes.status, 200, 'Daily report endpoint should return 200');
  const reportData = await reportRes.json();
  assert.strictEqual(reportData.success, true);
  const report = reportData.report;

  assert.ok(report.totalRevenue >= 110, `Total revenue should include order amount (at least 110), got: ${report.totalRevenue}`);
  assert.ok(report.totalOrders >= 1, 'Total orders should be >= 1');
  assert.ok(report.digitalWebOrders >= 1, 'Digital web orders should be >= 1');
  assert.ok(report.queueHoursSaved !== undefined, 'Queue hours saved must be computed');
  assert.ok(report.zReportText.includes('CANTEEN Z-REPORT & AUDIT'), 'Z-Report must have thermal header');
  assert.ok(report.zReportText.includes('REGISTER BALANCED & AUDITED'), 'Z-Report must have audit footer');
  console.log(`  ✅ [PASS] Daily Z-Report: Total Revenue = ₹${report.totalRevenue}, Total Orders = ${report.totalOrders}`);
  console.log(`  ✅ [PASS] Queue Time Deflected: ${report.queueHoursSaved} Hours of student billing line eliminated!`);

  // 3. Test Hardware Test Print Trigger
  console.log('\n[Test 3] Triggering Hardware Test Print to Station A (PRINTER_1)...');
  const testPrintRes = await fetch(`${BASE_URL}/printers/test-print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerId: 'PRINTER_1' })
  });

  assert.strictEqual(testPrintRes.status, 200, 'Test print should return 200');
  const testPrintData = await testPrintRes.json();
  assert.strictEqual(testPrintData.success, true);
  assert.ok(testPrintData.receiptText.includes('TEST-999'), 'Test receipt must have test token');
  console.log(`  ✅ [PASS] Test print slip enqueued to PRINTER_1 (Job #${testPrintData.queueJobId})`);

  console.log('\n===============================================================');
  console.log(' 🎉 ALL CLAIM CODE, Z-REPORT & TEST PRINT TESTS PASSED (100%)! ');
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
