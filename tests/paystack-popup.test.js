import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/services/paystack.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '')
  .replaceAll('export const ', 'const ');

function harness({ onPopup, verifyStatus = 'success', confirmed = false }) {
  const calls = [];
  const context = {
    api: {
      get: async url => { calls.push(url); return url.includes('/verify/') ? { status: verifyStatus } : { paymentStatus: confirmed ? 'Confirmed' : 'Pending' }; },
      post: async () => ({ access_code: 'server-access-code', reference: 'server-reference' }),
    },
    unwrapApiRecord: value => value,
    window: {
      PaystackPop: class { resumeTransaction(code, callbacks) { assert.equal(code, 'server-access-code'); onPopup(callbacks); } },
      setTimeout: callback => setTimeout(callback, 0),
    },
  };
  vm.runInNewContext(`${source}\nglobalThis.pay = payInPopup;`, context);
  return { pay: context.pay, calls };
}

test('popup success verifies server reference before completing checkout', async () => {
  const { pay, calls } = harness({ onPopup: callbacks => callbacks.onSuccess({ reference: 'untrusted-browser-reference' }) });
  const result = await pay({ orderId: 'order-1' });
  assert.equal(result.status, 'success');
  assert.ok(calls.includes('/api/payments/verify/server-reference'));
});

test('closing popup does not accept payment', async () => {
  const { pay, calls } = harness({ onPopup: callbacks => callbacks.onCancel() });
  await assert.rejects(pay({ orderId: 'order-1' }), /cancelled/);
  assert.equal(calls.filter(url => url.includes('/verify/')).length, 0);
});

test('browser success cannot confirm a failed server verification', async () => {
  const { pay } = harness({ onPopup: callbacks => callbacks.onSuccess({}), verifyStatus: 'failed' });
  await assert.rejects(pay({ orderId: 'order-1' }), /still being verified/);
});

test('a paid order never opens another checkout', async () => {
  const { pay } = harness({ confirmed: true, onPopup: () => assert.fail('Must not open another payment') });
  assert.equal((await pay({ orderId: 'order-1' })).status, 'success');
});
