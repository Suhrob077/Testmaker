import { useState } from 'react';
import { readText } from '../lib/readFile.js';
import { SETTINGS, autoScan, parse } from '../lib/parser.js';
import { creatorLogin, creatorLogout, saveModule } from '../lib/firebase.js';
import ProEditor from './ProEditor.jsx';

export default function Creator({ authed, setAuthed, onSaved }) {
  const [pw, setPw] = useState('');
  const [stage, setStage] = useState('upload'); // upload | scan | settings | pro
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const [on, setOn] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [vip, setVip] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      if (await creatorLogin(pw)) setAuthed(true); else setMsg("Parol noto'g'ri");
    } catch (err) { setMsg(err.code === 'auth/invalid-credential' ? "Parol noto'g'ri" : err.message); }
    setBusy(false);
  };

  if (!authed)
    return (
      <form className="card login" onSubmit={login}>
        <h2>Creator bo'limi</h2>
        <input type="password" autoFocus placeholder="Parol" value={pw} onChange={(e) => setPw(e.target.value)} />
        {msg && <p className="err">{msg}</p>}
        <button className="btn primary" disabled={busy}>Kirish</button>
      </form>
    );

  const scan = async () => {
    if (!subject.trim() || !title.trim() || !file) return setMsg('Fan nomi, test nomi va faylni kiriting');
    setBusy(true); setMsg('');
    try {
      const t = await readText(file);
      setText(t);
      const r = autoScan(t);
      setRes(r); setOn(r.on); setStage('scan');
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const applySettings = () => { setRes({ ...parse(text, on), on }); setStage('scan'); };

  const save = async (questions) => {
    setBusy(true); setMsg('');
    try {
      await saveModule({ subject, title, questions, file, vip });
      setStage('upload'); setFile(null); setRes(null); setTitle('');
      setMsg(`Saqlandi: ${questions.length} ta test`);
      onSaved();
    } catch (e) { setMsg('Saqlashda xato: ' + e.message); }
    setBusy(false);
  };

  if (stage === 'pro')
    return <ProEditor file={file} initial={res?.questions || []} saving={busy}
      onCancel={() => setStage('scan')} onSave={save} />;

  if (stage === 'settings') {
    const groups = [...new Set(SETTINGS.map((s) => s.group))];
    return (
      <div className="card wide">
        <h2>Qo'lda sozlash</h2>
        <p className="muted">Faylingizga mos qoidalarni + bilan yoqing. Qolganlari o'chiq qoladi.</p>
        {groups.map((g) => (
          <div key={g}>
            <h4>{g}</h4>
            {SETTINGS.filter((s) => s.group === g).map((s) => {
              const active = on.includes(s.id);
              return (
                <button key={s.id} className={`setting ${active ? 'active' : ''}`}
                  onClick={() => setOn(active ? on.filter((x) => x !== s.id) : [...on, s.id])}>
                  <span className="plus">{active ? '✓' : '+'}</span>{s.label}
                </button>
              );
            })}
          </div>
        ))}
        <div className="actions">
          <button className="btn ghost" onClick={() => setStage('scan')}>Orqaga</button>
          <button className="btn primary" onClick={applySettings}>Sozlamalarni qo'llash</button>
        </div>
      </div>
    );
  }

  if (stage === 'scan' && res) {
    const valid = res.questions.filter((x) => x.correct >= 0 && x.q && x.options.filter(Boolean).length >= 2);
    return (
      <div className="card wide">
        <h2>{subject} · {title}</h2>
        <div className="stats">
          <div><b className={res.percent >= 80 ? 'good' : res.percent >= 40 ? 'mid' : 'bad'}>{res.percent}%</b><span>avto-tuzish imkoniyati</span></div>
          <div><b>{res.ok}</b><span>tayyor test (jami topilgan: {res.total})</span></div>
        </div>
        {res.questions.slice(0, 3).map((x, i) => (
          <div className="sample" key={i}>
            <p>{i + 1}. {x.q}</p>
            {x.options.map((o, j) => o && <p key={j} className={j === x.correct ? 'right' : ''}>{'ABCD'[j]}) {o}</p>)}
          </div>
        ))}
        <button className="link" onClick={() => setShowRaw(!showRaw)}>{showRaw ? 'Matnni yashirish' : "Fayldan o'qilgan matnni ko'rish"}</button>
        {showRaw && <pre className="raw">{text.slice(0, 4000)}</pre>}
        {msg && <p className="err">{msg}</p>}
        <div className="actions">
          <button className="btn ghost" onClick={() => setStage('upload')}>Orqaga</button>
          <button className="btn" onClick={() => setStage('settings')}>Qo'lda sozlash</button>
          <button className="btn" onClick={() => setStage('pro')}>Pro-tahrirlash</button>
          <button className="btn primary" disabled={!valid.length || busy} onClick={() => save(valid)}>
            {busy ? 'Saqlanmoqda…' : `Tadbiq etish (${valid.length})`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card wide">
      <h2>Yangi test yuklash</h2>
      <label>Fan nomi</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Masalan: Matematika" />
      <label>Test nomi</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Oraliq-1" />
      <label>Turi</label>
      <div className="chips">
        <button className={`chip ${!vip ? 'on' : ''}`} onClick={() => setVip(false)}>FREE (hamma uchun)</button>
        <button className={`chip ${vip ? 'on' : ''}`} onClick={() => setVip(true)}>VIP (faqat VIP egalari)</button>
      </div>
      <label>Fayl (.pdf yoki .docx)</label>
      <label className="drop">
        <input type="file" accept=".pdf,.docx" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
        {file ? file.name : 'Faylni tanlang yoki shu yerga tashlang'}
      </label>
      {msg && <p className={msg.startsWith('Saqlandi') ? 'good' : 'err'}>{msg}</p>}
      <div className="actions">
        <button className="btn ghost" onClick={() => { creatorLogout(); setAuthed(false); setPw(''); }}>Chiqish</button>
        <button className="btn primary" disabled={busy} onClick={scan}>{busy ? "O'qilmoqda…" : 'Skanerlash'}</button>
      </div>
    </div>
  );
}
