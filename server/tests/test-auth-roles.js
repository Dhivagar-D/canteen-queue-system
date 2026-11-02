/**
 * Automated Verification: Campus Role-Based Authentication
 */
import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api/auth/login';

async function runTests() {
  console.log('🧪 Starting Campus Role-Based Authentication Verification...\n');

  // 1. Student Login (Valid Roll Number)
  {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'STUDENT', identifier: '21CS045' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, 'Student login should return 200');
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'STUDENT');
    assert.strictEqual(data.user.identifier, '21CS045');
    console.log('  ✅ [PASS] Student Login (Valid Roll No: 21CS045)');
  }

  // 2. Student Login (Missing Roll Number)
  {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'STUDENT', identifier: '' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, 'Missing roll number should return 400');
    assert.strictEqual(data.success, undefined);
    console.log('  ✅ [PASS] Student Login Rejected on Missing Roll Number');
  }

  // 3. Cashier Login (Valid PIN 1234)
  {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'CASHIER', pin: '1234' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.role, 'CASHIER');
    console.log('  ✅ [PASS] Cashier Login with PIN 1234');
  }

  // 4. Cashier Login (Invalid PIN)
  {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'CASHIER', pin: '0000' })
    });
    assert.strictEqual(res.status, 401);
    console.log('  ✅ [PASS] Cashier Login Rejected on Invalid PIN');
  }

  // 5. Kitchen Login (Valid PIN 5555)
  {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'KITCHEN', pin: '5555' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.role, 'KITCHEN');
    console.log('  ✅ [PASS] Kitchen Login with PIN 5555');
  }

  // 6. Admin Login (Valid PIN 9999)
  {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN', pin: '9999' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.role, 'ADMIN');
    console.log('  ✅ [PASS] Admin Login with PIN 9999');
  }

  // 7. Admin Login (Invalid PIN)
  {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN', pin: 'wrong' })
    });
    assert.strictEqual(res.status, 401);
    console.log('  ✅ [PASS] Admin Login Rejected on Invalid PIN');
  }

  console.log('\n🎉 ALL CAMPUS AUTHENTICATION & ROLE TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
