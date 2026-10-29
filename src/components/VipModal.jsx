import { useState } from 'react';
import { createUser } from '../lib/firebase.js';

const env = import.meta.env;
const TG = (env.VITE_ADMIN_TELEGRAM || '').replace('@', '');
const CARD = env.VITE_CARD_NUMBER || '';
const PRICE = env.VITE_VIP_PRICE || '20 000';

export default function VipModal({ me, onClose }) {
  const [nick, setN] = useState(me?.nick || '');
  const [copied, setCopied] = useState('');
  const code = me?.code;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!nick.trim()) return setErr('Ismingizni kiriting');
    setBusy(true); setErr('');
    try { await createUser(me.uid, nick); }
    catch (e) { setErr(e.message.includes('permission') ? "Saqlab bo'lmadi: Firestore qoidalari (firestore.rules) joylanmaganmi yoki Anonymous Auth yoqilmaganmi?" : e.message); }
    setBusy(false);
  };
  const copy = (v, k) => { navigator.clipboard?.writeText(v); setCopied(k); setTimeout(() => setCopied(''), 1500); };
  const text = `Salom! VIP olmoqchiman. ID: ${code}${nick ? ` (${nick})` : ''}. Chek rasmi ilova qilindi.`;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal vipmodal" onClick={(e) => e.stopPropagation()}>
        <h2 className="vip-title">VIP</h2>
        {me?.error && <p className="err">{me.error}</p>}
        {me?.admin ? <p>Siz adminsiz: barcha VIP testlar ochiq.</p>
        : me?.vip ? <p className="good"><b>★ VIP faol.</b> VIP testlar sizga ochiq.</p>
        : (
          <>
            <p className="price">Narxi: <b>{PRICE} UZS</b></p>
            <ol className="steps">
              <li>
                <b>ID raqamingizni oling</b>
                {code ? (
                  <>
                    <div className="optrow"><span className="muted small">Sizning ID</span><input readOnly className="mono" value={code} />
                      <button className="btn" onClick={() => copy(code, 'id')}>{copied === 'id' ? '✓' : 'Nusxa'}</button></div>
                    <p className="muted small">Ism: {me.nick || '—'}</p>
                  </>
                ) : (
                  <>
                    <input value={nick} maxLength={20} onChange={(e) => setN(e.target.value)} placeholder="Ismingizni kiriting" />
                    <button className="btn primary" disabled={busy || !me?.uid} onClick={save}>{busy ? 'Saqlanmoqda…' : 'Saqlash va ID olish'}</button>
                    {err && <p className="err small">{err}</p>}
                  </>
                )}
              </li>
              <li>
                <b>{PRICE} UZS ni quyidagi karta raqamiga o'tkazing</b>
                {CARD ? <div className="optrow"><input readOnly className="mono" value={CARD} /><button className="btn" onClick={() => copy(CARD.replace(/\s/g, ''), 'card')}>{copied === 'card' ? '✓' : 'Nusxa'}</button></div>
                  : <p className="err small">.env da VITE_CARD_NUMBER kiritilmagan.</p>}
              </li>
              <li>
                <b>ID va chek rasmini Telegramdagi adminga yuboring</b>
                {!code ? <p className="muted small">Avval 1-qadamni bajaring.</p> : TG ? <a className="btn primary tg" href={`https://t.me/${TG}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" >@{TG} ga yozish</a>
                  : <p className="err small">.env da VITE_ADMIN_TELEGRAM kiritilmagan.</p>}
              </li>
            </ol>
            <p className="muted small">So'rovingiz 1 soat ichida ko'rib chiqiladi va VIP beriladi.</p>
            <p className="warn small">⚠ Muhim: bitta qurilma = bitta ID. ID shu qurilma va brauzerga bog'langan, boshqa qurilmadan kirsangiz yangi ID olasiz.</p>
          </>
        )}
        <div className="actions"><button className="btn ghost" onClick={onClose}>Yopish</button></div>
      </div>
    </div>
  );
}
