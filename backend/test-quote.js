/**
 * Quote Upload Endpoint Test Suite
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Quote Upload API Tests against:', BASE_URL);
  let passedCount = 0;
  let totalCount = 0;

  async function assertTest(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(` ✅ PASS: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(` ❌ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  // 1. Health check test
  await assertTest('GET /api/v1/quotes/test - API Health Check', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/quotes/test`);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('API status not ok');
  });

  // 2. Valid quote upload test (Simulated / Sandbox mode)
  await assertTest('POST /api/v1/quotes/upload - Valid Quote (Simulated Mode)', async () => {
    const payload = {
      quote: 'Innovation distinguishes between a leader and a follower.',
      author: 'Steve Jobs',
      hashtags: ['Innovation', 'Leadership', 'Tech'],
      simulate: true,
    };

    const res = await fetch(`${BASE_URL}/api/v1/quotes/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(`Upload failed: ${data.error}`);
    if (!data.data.formattedContent.includes('Steve Jobs')) {
      throw new Error('Formatted content missing author attribution.');
    }
    console.log('    Formatted Post Output Preview:\n' + data.data.formattedContent.split('\n').map(l => '      ' + l).join('\n'));
  });

  // 3. Aliased endpoint /upload-quote test
  await assertTest('POST /upload-quote - Aliased Route Test', async () => {
    const payload = {
      quote: 'The secret of getting ahead is getting started.',
      author: 'Mark Twain',
      simulate: true,
    };

    const res = await fetch(`${BASE_URL}/upload-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Aliased route failed');
  });

  // 4. Input Validation Test (Empty Quote)
  await assertTest('POST /api/v1/quotes/upload - Input Validation (Empty Quote)', async () => {
    const payload = { quote: '  ' };
    const res = await fetch(`${BASE_URL}/api/v1/quotes/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400 Bad Request, got HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.success !== false) throw new Error('Expected success to be false');
  });

  console.log(`\n=================================================`);
  console.log(`🏁 Test Summary: ${passedCount}/${totalCount} tests passed.`);
  console.log(`=================================================\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
