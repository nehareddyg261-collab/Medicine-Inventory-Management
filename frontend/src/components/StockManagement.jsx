import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { Badge, Empty, fmtDateTime, fmtDate } from './common.jsx';

const MODES = [
  { id: 'PURCHASE',  label: 'Purchase',  help: 'Receive a new batch from a supplier.' },
  { id: 'ISSUE',     label: 'Issue',     help: 'Give out stock. The batch that expires first is used automatically.' },
  { id: 'RETURN',    label: 'Return',    help: 'Put unused units back into a batch.' },
  { id: 'WRITE_OFF', label: 'Write-off', help: 'Remove damaged or expired units from a batch.' },
];

const blank = { medicineId: '', supplierId: '', batchNumber: '', manufactureDate: '', expiryDate: '', batchId: '', quantity: '', note: '' };

export default function StockManagement({ notify }) {
  const [mode, setMode] = useState('PURCHASE');
  const [form, setForm] = useState(blank);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(() => {
    Promise.all([api.medicines(), api.suppliers(), api.transactions()])
      .then(([m, s, t]) => { setMedicines(m); setSuppliers(s); setHistory(t); })
      .catch((e) => notify(e.message, 'error'));
  }, [notify]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Return / Write-off need a batch: load the batches of the chosen medicine.
  useEffect(() => {
    if ((mode === 'RETURN' || mode === 'WRITE_OFF') && form.medicineId) {
      api.batches(form.medicineId)
        .then((list) => setBatches(list.filter((b) => mode === 'WRITE_OFF' ? b.quantity > 0 : b.status !== 'EXPIRED')))
        .catch((e) => notify(e.message, 'error'));
    } else {
      setBatches([]);
    }
  }, [mode, form.medicineId, notify]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const changeMode = (m) => { setMode(m); setForm({ ...blank, medicineId: form.medicineId }); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const quantity = Number(form.quantity);
    const note = form.note || null;
    try {
      if (mode === 'PURCHASE') {
        await api.receive({
          medicineId: Number(form.medicineId),
          supplierId: form.supplierId ? Number(form.supplierId) : null,
          batchNumber: form.batchNumber,
          manufactureDate: form.manufactureDate || null,
          expiryDate: form.expiryDate,
          quantity, note,
        });
      } else if (mode === 'ISSUE') {
        await api.issue({ medicineId: Number(form.medicineId), quantity, note });
      } else {
        await api.adjust({ batchId: Number(form.batchId), type: mode, quantity, note });
      }
      notify('Transaction saved');
      setForm({ ...blank, medicineId: form.medicineId });
      loadAll();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const current = MODES.find((m) => m.id === mode);
  const chosen = medicines.find((m) => String(m.id) === String(form.medicineId));

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Stock</h1>
        <p>Record every movement of stock. Each one is saved in the history below.</p>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="segmented">
          {MODES.map((m) => (
            <button key={m.id} type="button" className={mode === m.id ? 'seg active' : 'seg'} onClick={() => changeMode(m.id)}>{m.label}</button>
          ))}
        </div>
        <p className="note top">{current.help}</p>

        <div className="form-grid">
          <label>Medicine
            <select required value={form.medicineId} onChange={(e) => setForm({ ...form, medicineId: e.target.value, batchId: '' })}>
              <option value="">Select medicine...</option>
              {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {chosen && <span className="hint">Usable stock: {chosen.totalStock} {chosen.unit}</span>}
          </label>

          {mode === 'PURCHASE' && (
            <>
              <label>Supplier
                <select value={form.supplierId} onChange={set('supplierId')}>
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label>Batch number<input required value={form.batchNumber} onChange={set('batchNumber')} placeholder="e.g. PCM-2501" /></label>
              <label>Manufacture date<input type="date" value={form.manufactureDate} onChange={set('manufactureDate')} /></label>
              <label>Expiry date<input type="date" required value={form.expiryDate} onChange={set('expiryDate')} /></label>
            </>
          )}

          {(mode === 'RETURN' || mode === 'WRITE_OFF') && (
            <label>Batch
              <select required value={form.batchId} onChange={set('batchId')} disabled={!form.medicineId}>
                <option value="">{form.medicineId ? 'Select batch...' : 'Choose a medicine first'}</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.batchNumber} | qty {b.quantity} | exp {fmtDate(b.expiryDate)}</option>
                ))}
              </select>
            </label>
          )}

          <label>Quantity<input type="number" min="1" required value={form.quantity} onChange={set('quantity')} /></label>
          <label>Note (optional)<input value={form.note} onChange={set('note')} placeholder="e.g. Ward 3 request" /></label>

          <div className="actions span-all">
            <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save ' + current.label.toLowerCase()}</button>
          </div>
        </div>
      </form>

      <section className="card">
        <div className="card-head"><h2>Transaction history</h2><span className="muted">latest 100</span></div>
        {history.length === 0 ? <Empty>No transactions yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Medicine</th><th>Batch</th><th>Type</th><th className="num">Qty</th><th>Note</th></tr></thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDateTime(t.createdAt)}</td>
                    <td>{t.batch.medicine.name}</td>
                    <td>{t.batch.batchNumber}</td>
                    <td><Badge status={t.type} /></td>
                    <td className="num"><strong>{t.type === 'ISSUE' || t.type === 'WRITE_OFF' ? '-' : '+'}{t.quantity}</strong></td>
                    <td className="sub">{t.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}