import { useEffect, useMemo, useState } from 'react';
import Creator from './components/Creator.jsx';
import Admin from './components/Admin.jsx';
import VipModal from './components/VipModal.jsx';
import Quiz from './components/Quiz.jsx';
import Game from './components/Game.jsx';
import { configured, listModules, removeModule, getModule, watchUser, setModuleVip } from './lib/firebase.js';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [view, setView] = useState('home'); // home | creator
  const [subject, setSubject] = useState(null);
  const [mod, setMod] = useState(null);
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [authed, setAuthed] = useState(false);
  const [me, setMe] = useState(null);
  const [vipOpen, setVipOpen] = useState(false);

  useEffect(() => watchUser(setMe), []);
  const canVip = !!(me?.vip || me?.admin);
  const open = async (m) => {
    if (m.vip && !canVip) return setVipOpen(true);
    try { setMod(m.vip ? await getModule(m.id) : m); } catch (e) { setErr(e.message); }
  };

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); }, [theme]);

  const load = async () => {
    setLoading(true); setErr('');
    try { setMods(await listModules()); } catch (e) { setErr(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const subjects = useMemo(() => {
    const m = new Map();
    mods.forEach((x) => m.set(x.subject, [...(m.get(x.subject) || []), x]));
    return [...m.entries()];
  }, [mods]);

  const go = (v) => { setView(v); setSubject(null); setMod(null); };

  return (
    <>
      <header className="nav">
        <button className="brand" onClick={() => go('home')}>TestMaker</button>
        <nav>
          <button className="btn ghost" onClick={() => go('game')}>GAME-T</button>
          <button className="vipbtn" onClick={() => setVipOpen(true)}>{canVip ? '★ VIP' : 'VIP'}</button>
          <button className="btn ghost" onClick={() => go('creator')}>Creator</button>
          <button className="btn ghost" aria-label="Rejimni almashtirish" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </nav>
      </header>

      <main className={view === 'creator' && authed ? 'full' : ''}>
        {!configured && <div className="banner">Firebase sozlanmagan: <code>.env</code> faylini to'ldiring (README).</div>}

        {view === 'creator' ? (
          authed ? <Admin authed={authed} setAuthed={setAuthed} onSaved={load} /> : <Creator authed={authed} setAuthed={setAuthed} onSaved={load} />
        ) : view === 'game' ? (
          <Game mods={mods.filter((m) => !m.vip || canVip)} />
        ) : mod ? (
          <Quiz mod={mod} onBack={() => setMod(null)} />
        ) : subject ? (
          <div className="card wide">
            <button className="link" onClick={() => setSubject(null)}>← Fanlar</button>
            <h2>{subject[0]}</h2>
            {subject[1].map((m) => (
              <div className="row" key={m.id}>
                <button className="rowmain" onClick={() => open(m)}>
                  <b>{m.title}</b><span>{m.vip ? <i className="vip-badge">VIP</i> : <i className="free-badge">FREE</i>} {m.testCount} ta test</span>
                </button>
                {me?.admin && (
                  <>
                    <button className={`typebtn ${m.vip ? 'vip' : ''}`} title="FREE / VIP ni almashtirish"
                      onClick={async () => { try { await setModuleVip(m.id, !m.vip); await load(); setSubject(null); } catch (e) { alert(e.message); } }}>
                      {m.vip ? 'VIP' : 'FREE'}
                    </button>
                    <button className="link danger" onClick={async () => { if (confirm("O'chirilsinmi?")) { await removeModule(m.id); await load(); setSubject(null); } }}>O'chirish</button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card wide">
            <h1>Fanlar</h1>
            {loading && <p className="muted">Yuklanmoqda…</p>}
            {err && <p className="err">{err}</p>}
            {!loading && !err && !subjects.length && <p className="muted">Hozircha testlar yo'q. Creator bo'limidan fayl yuklang.</p>}
            {subjects.map(([name, list]) => (
              <button className="row rowmain" key={name} onClick={() => setSubject([name, list])}>
                <b>{name}</b><span>{list.length} ta nom · {list.reduce((s, x) => s + x.testCount, 0)} ta test</span>
              </button>
            ))}
          </div>
        )}
      </main>
      {vipOpen && <VipModal me={me} onClose={() => setVipOpen(false)} />}
    </>
  );
}
