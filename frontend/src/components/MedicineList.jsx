import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { Badge, Empty, money, fmtDate } from './common.jsx';
import BatchManagement from './BatchManagement.jsx';

const EMPTY = { name: '', category: '', unit: 'Tablet', reorderLevel: 50, unitPrice: '' };

export default function MedicineList({ notify }) {
  const [medicines, setMedicines] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);          // null = hidden, object = add / edit form
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.medicines(query)
      .then((list) => { setMedicines(list); setError(''); })
      .catch((e) => setError(e.message));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, reorderLevel: Number(form.reorderLevel), unitPrice: Number(form.unitPrice) };
    try {
      if (form.id) await api.updateMedicine(form.id, body);
      else await api.createMedicine(body);
      notify(form.id ? 'Medicine updated' : 'Medicine added');
      setForm(null);
      load();
    } catch (err) { notify(err.message, 'error'); }
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete ${m.name}?`)) return;
    try {
      await api.deleteMedicine(m.id);
      notify('Medicine deleted');
      if (selected && selected.id === m.id) setSelected(null);
      load();
    } catch (err) { notify(err.message, 'error'); }
  };

  const edit = (m) => setForm({ id: m.id, name: m.name, category: m.category || '', unit: m.unit || '',
                                reorderLevel: m.reorderLevel, unitPrice: m.unitPrice });

  return (
    <div className="stack">
      <div className="page-head with-action">
        <div>
          <h1>Medicines</h1>
          <p>Select a medicine to see its batches and expiry dates.</p>
        </div>
        <button className="btn" onClick={() => setForm({ ...EMPTY })}>+ Add medicine</button>
      </div>

      {form && (
        <form className="card form-grid" onSubmit={save}>
          <h2 className="span-all">{form.id ? 'Edit medicine' : 'New medicine'}</h2>
          <label>Name<input required value={form.name} onChange={set('name')} placeholder="e.g. Paracetamol 500mg" /></label>
          <label>Category<input value={form.category} onChange={set('category')} placeholder="e.g. Analgesic" /></label>
          <label>Unit<input value={form.unit} onChange={set('unit')} placeholder="Tablet, Vial, Bottle..." /></label>
          <label>Reorder level<input type="number" min="0" required value={form.reorderLevel} onChange={set('reorderLevel')} /></label>
          <label>Unit price (₹)<input type="number" min="0" step="0.01" required value={form.unitPrice} onChange={set('unitPrice')} /></label>
          <div className="actions span-all">
            <button type="submit" className="btn">Save</button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className={selected ? 'split' : ''}>
        <section className="card">
          <div className="card-head">
            <input className="search" placeholder="Search by name or category..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {error && <Empty>{error}</Empty>}
          {!error && medicines.length === 0 && <Empty>No medicines found.</Empty>}
          {!error && medicines.length > 0 && (
            <div className="table-wrap">
              <table className="clickable">
                <thead>
                  <tr><th>Medicine</th><th className="num">In stock</th><th className="num">Reorder at</th><th>Next expiry</th><th>Status</th><th className="num">Price</th><th /></tr>
                </thead>
                <tbody>
                  {medicines.map((m) => (
                    <tr key={m.id} className={selected && selected.id === m.id ? 'selected' : ''} onClick={() => setSelected(m)}>
                      <td>{m.name}<div className="sub">{m.category || '-'}</div></td>
                      <td className="num"><strong>{m.totalStock}</strong> <span className="sub inline">{m.unit}</span>
                        {m.expiredStock > 0 && <div className="sub red-text">{m.expiredStock} expired</div>}</td>
                      <td className="num">{m.reorderLevel}</td>
                      <td>{fmtDate(m.nearestExpiry)}</td>
                      <td><Badge status={m.stockStatus} /></td>
                      <td className="num">{money(m.unitPrice)}</td>
                      <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="link" onClick={() => edit(m)}>Edit</button>
                        <button className="link danger" onClick={() => remove(m)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selected && <BatchManagement medicine={selected} refreshKey={medicines.length} />}
      </div>
    </div>
  );
}