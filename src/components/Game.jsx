import { useEffect, useRef, useState } from 'react';
import { ref, set, get, update, remove, onValue, onDisconnect, runTransaction } from 'firebase/database';
import { rtdb, getModule } from '../lib/firebase.js';
import { shuffle } from '../lib/util.js';

const SEC = 20000, MAXP = 10, PTS = 100, SPIN = 4500, COLORS = ['#0d9488', '#6366f1', '#d97706', '#db2777', '#2563eb', '#65a30d', '#7c3aed', '#dc2626', '#0891b2', '#ea580c'];
const newP = (n) => ({ name: n.trim().slice(0, 16), ready: false, vote: '', score: 0, lives: 3, alive: true, hint: false, t: Date.now() });
const uid = () => Math.random().toString(36).slice(2, 10);

function Wheel({ names, idx }) {
  const n = names.length, seg = 360 / n;
  const [rot, setRot] = useState(0);
  useEffect(() => { const t = setTimeout(() => setRot(360 * 5 - (idx + 0.5) * seg), 60); return () => clearTimeout(t); }, []);
  const grad = names.map((_, i) => `${COLORS[i % 10]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
  return (
    <div className="wheelbox">
      <div className="pointer">▼</div>
      <div className="wheel" style={{ background: `conic-gradient(${grad})`, transform: `rotate(${rot}deg)` }}>
        {names.map((nm, i) => <span key={i} style={{ transform: `rotate(${(i + 0.5) * seg - 90}deg) translate(48px,-50%)` }}>{nm}</span>)}
      </div>
    </div>
  );
}

export default function Game({ mods }) {
  const me = useRef(uid()).current;
  const [nick, setNick] = useState('');
  const [tab, setTab] = useState('join');
  const [modId, setModId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [code, setCode] = useState(null);
  const [room, setRoom] = useState(null);
  const [final, setFinal] = useState(null);
  const [qs, setQs] = useState(null);
  const [err, setErr] = useState('');
  const [hintRound, setHintRound] = useState(0);
  const [, tick] = useState(0);
  const roomRef = useRef(null), off = useRef(0), joined = useRef(false);
  const now = () => Date.now() + off.current;

  if (!rtdb) return <div className="card"><h2>GAME-T</h2><p className="err">Realtime Database sozlanmagan: .env ga VITE_FIREBASE_DATABASE_URL ni kiriting (README).</p></div>;

  const R = (p = '') => ref(rtdb, `rooms/${code}${p}`);
  const reset = () => { setCode(null); setRoom(null); roomRef.current = null; joined.current = false; setQs(null); };

  useEffect(() => { const u = onValue(ref(rtdb, '.info/serverTimeOffset'), (s) => { off.current = s.val() || 0; }); const t = setInterval(() => tick((x) => x + 1), 250); return () => { u(); clearInterval(t); }; }, []);

  useEffect(() => {
    if (!code) return;
    return onValue(R(), (s) => {
      const v = s.val();
      if (v) { roomRef.current = v; setRoom(v); return; }
      const last = roomRef.current;
      if (last?.status === 'finished') setFinal(last); else if (last) setErr('Xona yopildi');
      reset();
    });
  }, [code]);

  const players = Object.entries(room?.players || {}).map(([id, p]) => ({ id, ...p })).sort((a, b) => a.t - b.t);
  const isHost = room?.host === me;
  const g = room?.game;
  const meP = players.find((p) => p.id === me);

  useEffect(() => {
    if (!room) return;
    if (meP) joined.current = true;
    else if (joined.current) { setErr('Siz xonadan chiqarildingiz'); reset(); }
  }, [room]);

  useEffect(() => { if (room?.moduleId && !qs) getModule(room.moduleId).then((m) => setQs(m?.questions || [])).catch((e) => setErr(e.message)); }, [room?.moduleId]);

  // ---------- Host: o'yin mantiqi ----------
  const mkRound = (mode, round, order, alive) => {
    const base = { round, qi: order[round - 1], perm: shuffle([0, 1, 2, 3]) };
    if (mode === 'roulette') return { ...base, phase: 'spin', target: alive[Math.floor(Math.random() * alive.length)].id, spinEnd: now() + SPIN };
    return { ...base, phase: 'ask', endsAt: now() + SEC };
  };
  const startGame = () => {
    const votes = { roulette: 0, fast: 0 };
    players.forEach((p) => { if (votes[p.vote] !== undefined) votes[p.vote]++; });
    const mode = votes.roulette === votes.fast ? (Math.random() < 0.5 ? 'roulette' : 'fast') : votes.roulette > votes.fast ? 'roulette' : 'fast';
    const order = shuffle(qs.map((_, i) => i));
    const total = Math.min(mode === 'fast' ? 20 : 40, qs.length);
    const upd = { status: 'playing', game: { mode, total, order, ...mkRound(mode, 1, order, players) } };
    players.forEach((p) => { upd[`players/${p.id}/ready`] = false; upd[`players/${p.id}/score`] = 0; upd[`players/${p.id}/lives`] = 3; upd[`players/${p.id}/alive`] = true; });
    update(R(), upd);
  };
  const resolve = () => {
    const rm = roomRef.current, gm = rm.game, q = qs[gm.qi], upd = {};
    Object.entries(rm.players || {}).forEach(([id, p]) => {
      if (gm.mode !== 'fast' && id !== gm.target) return;
      if (p.ans?.r === gm.round && p.ans.c === q.correct) upd[`players/${id}/score`] = (p.score || 0) + PTS;
      else if (gm.mode === 'roulette') { const l = (p.lives ?? 3) - 1; upd[`players/${id}/lives`] = l; if (l <= 0) upd[`players/${id}/alive`] = false; }
    });
    upd['game/phase'] = 'reveal'; upd['game/revealEnd'] = now() + 3500;
    update(R(), upd);
  };
  const nextRound = () => {
    const rm = roomRef.current, gm = rm.game;
    const ps = Object.entries(rm.players || {}).map(([id, p]) => ({ id, ...p }));
    const alive = ps.filter((p) => p.alive !== false);
    if (gm.round >= gm.total || ps.length < 2 || (gm.mode === 'roulette' && alive.length <= 1)) return update(R(), { status: 'finished', 'game/phase': 'done' });
    const nr = mkRound(gm.mode, gm.round + 1, gm.order, alive);
    const upd = { 'game/phase': nr.phase, 'game/round': nr.round, 'game/qi': nr.qi, 'game/perm': nr.perm, 'game/target': nr.target ?? null, 'game/spinEnd': nr.spinEnd ?? null, 'game/endsAt': nr.endsAt ?? null };
    update(R(), upd);
  };

  const answered = g ? players.filter((p) => p.ans?.r === g.round).length : 0;
  useEffect(() => {
    if (!isHost || !room) return;
    if (room.status === 'ready' && qs && players.length >= 2 && players.every((p) => p.ready)) return startGame();
    if (room.status === 'finished') { const h = setTimeout(() => remove(R()), 30000); return () => clearTimeout(h); }
    if (room.status !== 'playing' || !g || !qs) return;
    let ms = 0, fn;
    if (g.phase === 'spin') { ms = g.spinEnd - now(); fn = () => update(R(), { 'game/phase': 'ask', 'game/endsAt': now() + SEC }); }
    else if (g.phase === 'ask') {
      const exp = g.mode === 'fast' ? players : players.filter((p) => p.id === g.target);
      ms = exp.every((p) => p.ans?.r === g.round) ? 0 : g.endsAt - now(); fn = resolve;
    } else if (g.phase === 'reveal') { ms = g.revealEnd - now(); fn = nextRound; }
    if (!fn) return;
    const h = setTimeout(fn, Math.max(0, ms));
    return () => clearTimeout(h);
  }, [isHost, room?.status, g?.phase, g?.round, answered, players.length, players.filter((p) => p.ready).length, !!qs]);

  // ---------- Amallar ----------
  const create = async () => {
    setErr('');
    const mod = mods.find((m) => m.id === modId);
    if (!nick.trim() || !mod) return setErr('Nik-nom va fan/mavzuni tanlang');
    let c;
    for (let k = 0; k < 6; k++) { c = String(Math.floor(1000 + Math.random() * 9000)); if (!(await get(ref(rtdb, `rooms/${c}`))).exists()) break; }
    await set(ref(rtdb, `rooms/${c}`), { host: me, moduleId: mod.id, subject: mod.subject, title: mod.title, status: 'lobby', players: { [me]: newP(nick) } });
    onDisconnect(ref(rtdb, `rooms/${c}`)).remove();
    setFinal(null); setCode(c);
  };
  const join = async () => {
    setErr('');
    const c = joinCode.trim();
    if (!nick.trim() || !c) return setErr('Nik-nom va xona kodini kiriting');
    const s = await get(ref(rtdb, `rooms/${c}`));
    if (!s.exists()) return setErr('Bunday xona yo\'q');
    if (s.val().status !== 'lobby') return setErr('O\'yin allaqachon boshlangan');
    const r = await runTransaction(ref(rtdb, `rooms/${c}/players`), (cur) => {
      cur = cur || {};
      if (Object.keys(cur).length >= MAXP) return;
      cur[me] = newP(nick);
      return cur;
    });
    if (!r.committed) return setErr(`Xona to'la (maks. ${MAXP} ta o'yinchi)`);
    onDisconnect(ref(rtdb, `rooms/${c}/players/${me}`)).remove();
    setFinal(null); setCode(c);
  };
  const leave = () => { if (isHost) remove(R()); else remove(R(`/players/${me}`)); reset(); };
  const setMine = (patch) => update(R(`/players/${me}`), patch);

  // ---------- Ko'rinish ----------
  if (!code) {
    if (final) return <Final room={final} onExit={() => setFinal(null)} />;
    const subjects = [...new Set(mods.map((m) => m.subject))];
    return (
      <div className="gameui"><div className="card wide">
        <h2 className="gtitle">GAME-T</h2>
        <p className="muted" style={{ marginTop: '-.4rem' }}>Jamoaviy o'yin · 10 tagacha o'yinchi</p>
        <label>Nik-nom</label>
        <input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} placeholder="Masalan: Sardor" />
        <div className="chips" style={{ marginTop: '1rem' }}>
          <button className={`chip ${tab === 'join' ? 'on' : ''}`} onClick={() => setTab('join')}>Xonaga kirish</button>
          <button className={`chip ${tab === 'new' ? 'on' : ''}`} onClick={() => setTab('new')}>Xona ochish</button>
        </div>
        {tab === 'join' ? (
          <>
            <label>Xona kodi</label>
            <input inputMode="numeric" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="1234" />
            <div className="actions"><button className="btn primary" onClick={join}>Kirish</button></div>
          </>
        ) : (
          <>
            <label>Fan va mavzu (test)</label>
            <select value={modId} onChange={(e) => setModId(e.target.value)}>
              <option value="">— tanlang —</option>
              {subjects.map((s) => (
                <optgroup key={s} label={s}>
                  {mods.filter((m) => m.subject === s).map((m) => <option key={m.id} value={m.id}>{m.title} ({m.testCount} ta)</option>)}
                </optgroup>
              ))}
            </select>
            <div className="actions"><button className="btn primary" onClick={create}>Xona ochish</button></div>
          </>
        )}
        {err && <p className="err">{err}</p>}
      </div></div>
    );
  }
  if (!room) return <div className="card"><p className="muted">Yuklanmoqda…</p></div>;

  const q = g && qs ? qs[g.qi] : null;
  const left = g?.endsAt ? Math.max(0, Math.ceil((g.endsAt - now()) / 1000)) : 0;
  const target = g?.mode === 'roulette' ? players.find((p) => p.id === g.target) : null;
  const canAnswer = g?.phase === 'ask' && (g.mode === 'fast' || g.target === me) && meP?.alive !== false && meP?.ans?.r !== g.round;
  const myAns = g && meP?.ans && meP.ans.r === g.round ? meP.ans.c : undefined;
  const hintOn = hintRound === g?.round;
  const canHint = g?.mode === 'roulette' && g.phase === 'ask' && g.target === me && (meP?.score || 0) >= 300 && !meP?.hint;
  const green = (p) => (room.status === 'ready' && p.ready) || (g?.phase === 'ask' && p.ans?.r === g.round);
  const aliveNames = players.filter((p) => p.alive !== false);

  return (
    <div className="gameui"><div className="game">
      <aside className="players">
        <div className="roomtag"><span>ROOM</span><b>#{code}</b><em>{players.length}/{MAXP}</em></div>
        {players.map((p) => (
          <div key={p.id} className={`pl ${green(p) ? 'green' : ''} ${p.alive === false ? 'out' : ''}`}>
            <span className="av" style={{ background: COLORS[players.indexOf(p) % 10] }}>{p.name[0]?.toUpperCase()}</span>
            <div className="plname"><b>{p.name}</b>{p.id === room.host && ' 👑'}{p.id === me && ' (siz)'}
              <div className="small">{g ? `${p.score || 0} ball${g.mode === 'roulette' ? ' · ' + '♥'.repeat(Math.max(0, p.lives)) : ''}` : p.ready ? 'tayyor' : ''}</div></div>
            {isHost && p.id !== me && <button className="kick" title="Chiqarib yuborish" onClick={() => remove(R(`/players/${p.id}`))}>✕</button>}
          </div>
        ))}
      </aside>

      <section className="card arena">
        <div className="muted small">{room.subject} · {room.title}</div>

        {room.status === 'lobby' && (
          <>
            <div className="lobbycode">XONA KODI<span className="code">{code}</span></div>
            <p className="muted">Do'stlaringiz shu kod bilan kirsin. Kamida 2 kishi bo'lganda Start yonadi.</p>
            <div className="actions" style={{ justifyContent: 'flex-start' }}>
              {isHost && <button className="btn primary" disabled={players.length < 2} onClick={() => update(R(), { status: 'ready' })}>Start</button>}
              <button className="btn ghost" onClick={leave}>{isHost ? 'Xonani o\'chirish' : 'Chiqish'}</button>
            </div>
          </>
        )}

        {room.status === 'ready' && (
          <>
            <h3>O'yin turini tanlang (ovoz bering)</h3>
            <div className="chips">
              {[['roulette', '🎡 Ruletka'], ['fast', '⚡ Kim ko\'p topar']].map(([k, l]) => (
                <button key={k} className={`chip ${meP?.vote === k ? 'on' : ''}`} onClick={() => setMine({ vote: k })}>
                  {l} ({players.filter((p) => p.vote === k).length})
                </button>
              ))}
            </div>
            <button className={`btn ${meP?.ready ? '' : 'primary'} big`} onClick={() => setMine({ ready: !meP?.ready })}>{meP?.ready ? 'Tayyor ✓ (bekor qilish)' : 'READY'}</button>
            <p className="muted">Hamma READY bosganda o'yin avtomatik boshlanadi.</p>
            <button className="btn ghost" onClick={leave}>{isHost ? 'Xonani o\'chirish' : 'Chiqish'}</button>
          </>
        )}

        {room.status === 'playing' && g && q && (
          <>
            <div className="qhead"><b>{g.mode === 'roulette' ? '🎡 Ruletka' : '⚡ Kim ko\'p topar'}</b><span>{g.round} / {g.total}</span></div>
            {g.phase === 'spin' && (
              <>
                <h3 style={{ textAlign: 'center' }}>Ruletka aylanmoqda…</h3>
                <Wheel key={g.round} names={aliveNames.map((p) => p.name)} idx={Math.max(0, aliveNames.findIndex((p) => p.id === g.target))} />
              </>
            )}
            {g.phase !== 'spin' && (
              <>
                {target && <p className="muted">Savol: <b>{target.name}</b> uchun{g.target === me ? ' (siz!)' : ''}</p>}
                {g.phase === 'ask' && <div className="progress"><i style={{ width: `${(left / 20) * 100}%`, transition: 'width .25s linear' }} /></div>}
                {g.phase === 'ask' && <div className="muted small">{left} soniya</div>}
                <p className="question">{q.q}</p>
                {g.perm.filter((i) => q.options[i]).map((i, k) => {
                  const rev = g.phase === 'reveal';
                  const c = rev ? (i === q.correct ? 'right' : i === myAns ? 'wrong' : 'dim') : i === myAns ? 'sel' : '';
                  const hinted = hintOn && g.phase === 'ask' && i === q.correct ? 'right' : '';
                  return (
                    <button key={i} disabled={!canAnswer} className={`option ${c} ${hinted}`} onClick={() => setMine({ ans: { r: g.round, c: i } })}>
                      <span className="badge">{'ABCD'[k]}</span>{q.options[i]}
                    </button>
                  );
                })}
                {canHint && !hintOn && <button className="btn" onClick={() => { setHintRound(g.round); setMine({ hint: true }); }}>💡 To'g'ri javobni ko'rsatish (1 marta)</button>}
                {g.phase === 'ask' && myAns !== undefined && <p className="muted">Javobingiz qabul qilindi…</p>}
              </>
            )}
          </>
        )}

        {room.status === 'finished' && <Final room={room} onExit={leave} host={isHost} />}
      </section>
    </div></div>
  );
}

function Final({ room, onExit, host }) {
  const ps = Object.entries(room.players || {}).map(([id, p]) => ({ id, ...p })).sort((a, b) => (b.score || 0) - (a.score || 0) || b.lives - a.lives);
  return (
    <div className={host === undefined ? 'card wide' : ''}>
      <h2>🏆 G'olib: {ps[0]?.name}</h2>
      {ps.map((p, i) => <div className="row" key={p.id}><span>{i + 1}. {p.name}</span><b>{p.score || 0} ball</b></div>)}
      <p className="muted small">Xona ma'lumotlari serverdan o'chiriladi.</p>
      <div className="actions"><button className="btn primary" onClick={onExit}>{host ? 'Xonani yopish' : 'Chiqish'}</button></div>
    </div>
  );
}
