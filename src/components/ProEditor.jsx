import { useState } from 'react';
import FileViewer from './FileViewer.jsx';
import { isValid } from '../lib/parser.js';

const blank = () => ({ q: '', options: ['', '', '', ''], correct: -1 });
const LET = ['A', 'B', 'C', 'D'];
const isEmpty = (x) => !x.q.trim() && x.options.every((o) => !o.trim());

export default function ProEditor({ file, initial, onSave, onCancel, saving }) {
  const [items, setItems] = useState(initial.length ? initial.map((x) => ({ ...x, options: [...x.options] })) : [blank()]);
  const [idx, setIdx] = useState(0);
  const [modal, setModal] = useState(false);
  const cur = items[idx];

  const upd = (patch) => setItems((it) => it.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const setOpt = (i, v) => upd({ options: cur.options.map((o, j) => (j === i ? v : o)) });

  const next = () => {
    if (idx === items.length - 1) setItems([...items, blank()]);
    setIdx(idx + 1);
  };
  const remove = () => {
    const rest = items.filter((_, i) => i !== idx);
    setItems(rest.length ? rest : [blank()]);
    setIdx(Math.max(0, idx - 1));
  };

  const good = items.filter(isValid);
  const incomplete = items.filter((x) => !isEmpty(x) && !isValid(x)).length;

  return (
    <div className="pro">
      <div className="pro-bar">
        <strong>Pro-tahrirlash</strong>
        <div className="tabs">
          {items.map((x, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`tab ${i === idx ? 'cur' : ''} ${isValid(x) ? 'ok' : isEmpty(x) ? '' : 'warn'}`}>
              {i + 1}
            </button>
          ))}
        </div>
        <button className="btn ghost" onClick={onCancel}>Chiqish</button>
      </div>

      <div className="pro-body">
        <section className="pane left"><FileViewer file={file} /></section>

        <section className="pane right">
          <h3>Test {idx + 1}</h3>
          <label>Savol</label>
          <textarea rows={4} value={cur.q} onChange={(e) => upd({ q: e.target.value })} placeholder="Savol matni..." />
          {LET.map((l, i) => (
            <div className="optrow" key={l}>
              <span className="badge">{l}</span>
              <input value={cur.options[i]} onChange={(e) => setOpt(i, e.target.value)} placeholder={`${l} variant`} />
            </div>
          ))}
          <label>To'g'ri javob</label>
          <select value={cur.correct} onChange={(e) => upd({ correct: +e.target.value })}>
            <option value={-1}>— tanlang —</option>
            {LET.map((l, i) => <option key={l} value={i}>{l}</option>)}
          </select>

          <div className="actions">
            <button className="btn ghost" onClick={remove}>O'chirish</button>
            <button className="btn" onClick={next}>Keyingi (Next)</button>
            <button className="btn primary" onClick={() => setModal(true)}>Saqlash (Save)</button>
          </div>
        </section>
      </div>

      {modal && (
        <div className="modal-bg" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="big">Siz jami {good.length} ta test tuzdingiz. Saqlashni xohlaysizmi?</p>
            {incomplete > 0 && <p className="muted">{incomplete} ta to'liq bo'lmagan test (savol, kamida 2 variant va to'g'ri javob kerak) saqlanmaydi.</p>}
            <div className="actions">
              <button className="btn ghost" onClick={() => setModal(false)}>Bekor qilish</button>
              <button className="btn primary" disabled={!good.length || saving} onClick={() => onSave(good)}>
                {saving ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
