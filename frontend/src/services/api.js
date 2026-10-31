// All calls to the Spring Boot backend live here.
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = 'Something went wrong. Is the backend running?';
    try {
      const data = await res.json();
      if (data.message) message = data.message;
    } catch (e) { /* response had no JSON body */ }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const send = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  // dashboard
  dashboard: () => request('/dashboard'),

  // medicines
  medicines: (q = '') => request('/medicines?q=' + encodeURIComponent(q)),
  createMedicine: (m) => request('/medicines', send('POST', m)),
  updateMedicine: (id, m) => request('/medicines/' + id, send('PUT', m)),
  deleteMedicine: (id) => request('/medicines/' + id, { method: 'DELETE' }),

  // batches
  batches: (medicineId) => request('/batches?medicineId=' + medicineId),
  expiringBatches: (days = 90) => request('/batches/expiring?days=' + days),

  // suppliers
  suppliers: () => request('/suppliers'),
  createSupplier: (s) => request('/suppliers', send('POST', s)),
  updateSupplier: (id, s) => request('/suppliers/' + id, send('PUT', s)),
  deleteSupplier: (id) => request('/suppliers/' + id, { method: 'DELETE' }),

  // stock
  receive: (r) => request('/stock/receive', send('POST', r)),
  issue: (r) => request('/stock/issue', send('POST', r)),
  adjust: (r) => request('/stock/adjust', send('POST', r)),
  transactions: () => request('/stock/transactions'),
};