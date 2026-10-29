import { useEffect, useState } from 'react';
import { findUsers, setVip } from '../lib/firebase.js';

export default function Users() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const run = async (code = '') => {
    setMsg('');
    try { const r = await findUsers(code); setRows(r); if (!r.length) setMsg('Topilmadi'); }
    catch (e) { setMsg(e.message.includes('permission') ? "Ruxsat yo'q: Creator'ga email orqali kiring (VITE_CREATOR_EMAIL) va firestore.rules ni joylang." : e.message); }
  };
  useEffect(() => { run(); }, []);
  const toggle = async (u) => {
    try { await setVip(u.id, !u.vip); setRows(rows.map((x) => (x.id === u.id ? { ...x, vip: !u.vip } : x))); }
    catch (e) { setMsg(e.message); }
  };
  return (
    <div className="card wide" style={{ margin: '1rem auto', maxWidth: 760 }}>
      <h2>Foydalanuvchilar</h2>
      <div className="optrow">
        <input inputMode="numeric" maxLength={12} placeholder="12 xonali ID bo'yicha qidirish" value={q}
          onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && run(q)} />
        <button className="btn primary" onClick={() => run(q)}>Qidirish</button>
        {q && <button className="btn ghost" onClick={() => { setQ(''); run(); }}>✕</button>}
      </div>
      {msg && <p className="err">{msg}</p>}
      {rows.map((u) => (
        <div className="row urow" key={u.id}>
          <div><b className="mono">{u.code}</b><div className="muted small">{u.nick || 'ismsiz'}</div></div>
          <button className={`switch ${u.vip ? 'on' : ''}`} onClick={() => toggle(u)}>VIP: {u.vip ? 'ON' : 'OFF'}</button>
        </div>
      ))}
    </div>
  );
}
