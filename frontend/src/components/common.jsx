import React from 'react';

export const money = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

export const daysText = (days) =>
  days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Expires today' : `${days}d left`;

const STATUS = {
  OK:            { label: 'OK',            cls: 'green' },
  LOW:           { label: 'Low stock',     cls: 'amber' },
  OUT_OF_STOCK:  { label: 'Out of stock',  cls: 'red' },
  EXPIRING_SOON: { label: 'Expiring soon', cls: 'amber' },
  EXPIRED:       { label: 'Expired',       cls: 'red' },
  PURCHASE:      { label: 'Purchase',      cls: 'green' },
  ISSUE:         { label: 'Issue',         cls: 'blue' },
  RETURN:        { label: 'Return',        cls: 'teal' },
  WRITE_OFF:     { label: 'Write-off',     cls: 'red' },
};

export function Badge({ status }) {
  const s = STATUS[status] || { label: status, cls: 'gray' };
  return <span className={'badge ' + s.cls}>{s.label}</span>;
}

export function StatCard({ label, value, hint, tone = 'teal' }) {
  return (
    <div className={'stat ' + tone}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}