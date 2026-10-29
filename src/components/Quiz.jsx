import { useMemo, useState } from 'react';
import { prep } from '../lib/util.js';

function Options({ item, sel, onPick, reveal }) {
  return item.opts.map((o, k) => {
    let c = '';
    if (reveal) c = o.i === item.correct ? 'right' : o.i === sel ? 'wrong' : 'dim';
    else if (o.i === sel) c = 'sel';
    return (
      <button key={o.i} disabled={reveal} className={`option ${c}`} onClick={() => onPick(o.i)}>
        <span className="badge">{'ABCD'[k]}</span>{o.t}
      </button>
    );
  });
}

function Result({ items, ans, onAgain, onSetup, onBack }) {
  const right = items.filter((it, i) => ans[i] === it.correct).length;
  const none = items.filter((_, i) => ans[i] === undefined).length;
  const wrong = items.length - right - none;
  const bad = items.map((it, i) => ({ it, i })).filter(({ it, i }) => ans[i] !== it.correct);
  const txt = (it, v) => it.opts.find((o) => o.i === v)?.t;
  return (
    <div className="card wide">
      <h2>Natija</h2>
      <div className="stats">
        <div><b className="good">{right}</b><span>to'g'ri</span></div>
        <div><b className="bad">{wrong}</b><span>xato</span></div>
        {none > 0 && <div><b>{none}</b><span>javobsiz</span></div>}
        <div><b>{Math.round((right / items.length) * 100)}%</b><span>{items.length} tadan</span></div>
      </div>
      {bad.length > 0 && <h4>Xato topilgan savollar</h4>}
      {bad.map(({ it, i }) => (
        <div className="sample" key={i}>
          <p><b>{i + 1}. {it.q}</b></p>
          <p className="err">Sizning javobingiz: {ans[i] === undefined ? 'javob berilmagan' : txt(it, ans[i])}</p>
          <p className="right">To'g'ri javob: {txt(it, it.correct)}</p>
        </div>
      ))}
      <div className="actions">
        <button className="btn ghost" onClick={onBack}>Ortga</button>
        <button className="btn" onClick={onSetup}>Sozlamalar</button>
        <button className="btn primary" onClick={onAgain}>Qaytadan</button>
      </div>
    </div>
  );
}

function Play({ mod, count, exam, onSetup, onBack }) {
  const [run, setRun] = useState(0);
  const items = useMemo(() => prep(mod.questions, count), [mod, count, run]);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [done, setDone] = useState(false);
  const again = () => { setRun(run + 1); setI(0); setAns({}); setDone(false); };
  if (done) return <Result items={items} ans={ans} onAgain={again} onSetup={onSetup} onBack={onBack} />;

  if (exam)
    return (
      <div className="card wide">
        <div className="qhead"><b>Imtihon · {items.length} ta savol</b><span>{Object.keys(ans).length} / {items.length}</span></div>
        {items.map((it, k) => (
          <div className="examq" key={k}>
            <p className="question">{k + 1}. {it.q}</p>
            <Options item={it} sel={ans[k]} onPick={(v) => setAns({ ...ans, [k]: v })} />
          </div>
        ))}
        <div className="actions"><button className="btn primary" onClick={() => setDone(true)}>Natijani ko'rish</button></div>
      </div>
    );

  const it = items[i];
  const sel = ans[i];
  return (
    <div className="card wide">
      <div className="qhead"><button className="link" onClick={onBack}>← {mod.title}</button><span>{i + 1} / {items.length}</span></div>
      <div className="progress"><i style={{ width: `${((i + 1) / items.length) * 100}%` }} /></div>
      <p className="question">{it.q}</p>
      <Options item={it} sel={sel} reveal={sel !== undefined} onPick={(v) => setAns({ ...ans, [i]: v })} />
      <div className="actions">
        <button className="btn primary" disabled={sel === undefined}
          onClick={() => (i === items.length - 1 ? setDone(true) : setI(i + 1))}>
          {i === items.length - 1 ? 'Natijani ko\'rish' : 'Keyingi'}
        </button>
      </div>
    </div>
  );
}

export default function Quiz({ mod, onBack }) {
  const total = mod.questions.length;
  const [n, setN] = useState('max');
  const [exam, setExam] = useState(false);
  const [cfg, setCfg] = useState(null);
  if (cfg) return <Play mod={mod} count={cfg.count} exam={cfg.exam} onSetup={() => setCfg(null)} onBack={onBack} />;
  const choices = [20, 50].filter((c) => c < total);
  const count = exam ? Math.min(20, total) : n === 'max' ? total : n;
  return (
    <div className="card wide">
      <button className="link" onClick={onBack}>← Ortga</button>
      <h2>{mod.title}</h2>
      <p className="muted">Bu mavzuda {total} ta test bor.</p>
      <h4>Nechta test?</h4>
      <div className="chips">
        {[...choices, 'max'].map((c) => (
          <button key={c} disabled={exam} className={`chip ${!exam && n === c ? 'on' : ''}`} onClick={() => setN(c)}>
            {c === 'max' ? `Max (${total})` : `${c}x`}
          </button>
        ))}
      </div>
      <button className={`setting ${exam ? 'active' : ''}`} onClick={() => setExam(!exam)}>
        <span className="plus">{exam ? '✓' : '+'}</span>
        Imtihon rejimi {exam ? '(yoniq)' : '(o\'chiq)'} — {Math.min(20, total)} ta tasodifiy test, javob ko'rsatilmaydi, hammasi bir ustunda, natija oxirida
      </button>
      <div className="actions">
        <button className="btn primary" onClick={() => setCfg({ count, exam })}>Boshlash ({count} ta)</button>
      </div>
    </div>
  );
}
