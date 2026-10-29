// Fayl matnini savol/javoblarga ajratuvchi algoritm.
// Har bir sozlama (SETTINGS) — yoqilganda parserga yangi qoida qo'shadi.

export const SETTINGS = [
  { id: 'q_num', group: 'Savol', label: 'Savollar raqam bilan boshlanadi (1. yoki 1))' },
  { id: 'q_prefix', group: 'Savol', label: "Savol oldida 'Savol:' / 'Q:' / 'Question' bor" },
  { id: 'q_hash', group: 'Savol', label: 'Savollar # belgisi bilan boshlanadi' },
  { id: 'q_blank', group: 'Savol', label: "Savollar bo'sh qator bilan ajratilgan" },
  { id: 'q_multiline', group: 'Savol', label: "Savol matni bir necha qatorga cho'zilgan" },
  { id: 'o_letter', group: 'Variant', label: 'Variantlar A) B) C) D) yoki a. b. c. d. shaklida' },
  { id: 'o_digit', group: 'Variant', label: 'Variantlar 1) 2) 3) 4) shaklida' },
  { id: 'o_sym', group: 'Variant', label: 'Variant oldida ~ belgisi bor' },
  { id: 'o_dash', group: 'Variant', label: 'Variant oldida - (chiziqcha) bor' },
  { id: 'o_inline', group: 'Variant', label: 'Variantlar bitta qatorda (A) .. B) .. C) ..)' },
  { id: 'o_multiline', group: 'Variant', label: "Variant matni keyingi qatorga o'tadi" },
  { id: 'c_star', group: "To'g'ri javob", label: "To'g'ri variant oldida * bor" },
  { id: 'c_plus', group: "To'g'ri javob", label: "To'g'ri variant oldida + bor" },
  { id: 'c_eq', group: "To'g'ri javob", label: "To'g'ri variant = bilan boshlanadi" },
  { id: 'c_star_end', group: "To'g'ri javob", label: "To'g'ri variant oxirida * bor" },
  { id: 'c_bracket', group: "To'g'ri javob", label: "To'g'ri variant oxirida (+) / [+] / (to'g'ri)" },
  { id: 'c_line', group: "To'g'ri javob", label: "Savol ostida 'Javob: B' qatori bor" },
  { id: 'c_key', group: "To'g'ri javob", label: "Javoblar kaliti fayl oxirida ('Javoblar' sarlavhasi, 1-A 2-B ...)" },
  { id: 'c_first', group: "To'g'ri javob", label: "To'g'ri javob doim 1-variant (A)" },
  { id: 'c_last', group: "To'g'ri javob", label: "To'g'ri javob doim oxirgi variant" },
  { id: 'x_headers', group: 'Qo\'shimcha', label: "Sahifa raqami qatorlarini o'tkazib yubor" },
  { id: 'x_clean', group: 'Qo\'shimcha', label: "Ortiqcha ; , belgilar va bo'shliqlarni tozala" },
];

export const PRESETS = [
  ['q_num', 'o_letter', 'c_star'],
  ['q_num', 'o_letter', 'c_plus'],
  ['q_num', 'o_letter', 'c_line'],
  ['q_num', 'o_letter', 'c_key'],
  ['q_num', 'o_letter', 'c_bracket'],
  ['q_num', 'o_letter', 'c_star_end'],
  ['q_num', 'o_letter', 'c_eq'],
  ['q_num', 'o_digit', 'c_star'],
  ['q_blank', 'o_letter', 'c_first'],
  ['q_blank', 'o_letter', 'c_star'],
  ['q_prefix', 'o_letter', 'c_star'],
  ['q_prefix', 'o_letter', 'c_line'],
  ['q_hash', 'c_eq', 'o_sym'],
  ['q_hash', 'o_sym', 'c_first'],
].map((p) => [...p, 'q_multiline', 'o_multiline', 'x_headers', 'x_clean']);

const BRACKET = /\s*[(\[]\s*(\+|to'g'ri|togri|to‘g‘ri|correct|right)\s*[)\]]\s*$/i;

export function parse(text, on) {
  const has = (id) => on.includes(id);
  let lines = text.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim());

  if (has('x_headers')) lines = lines.filter((l) => !/^(page|bet|sahifa)?\s*\d+(\s*\/\s*\d+)?$/i.test(l));

  const key = {};
  if (has('c_key')) {
    const idx = lines.findIndex((l) => /^(javoblar|javoblar kaliti|kalit|answers?|answer key|key)\s*:?$/i.test(l));
    if (idx >= 0) {
      const tail = lines.slice(idx + 1).join(' ');
      for (const m of tail.matchAll(/(\d+)\s*[-–:.)]?\s*([A-Da-d])\b/g)) key[+m[1]] = m[2].toUpperCase().charCodeAt(0) - 65;
      lines = lines.slice(0, idx);
    }
  }

  const mark = (s) => {
    let c = false;
    if (has('c_star') && /^\*\s*/.test(s)) { c = true; s = s.replace(/^\*\s*/, ''); }
    if (has('c_plus') && /^\+\s*/.test(s)) { c = true; s = s.replace(/^\+\s*/, ''); }
    return [s, c];
  };
  const suffix = (s) => {
    let c = false;
    if (has('c_bracket') && BRACKET.test(s)) { c = true; s = s.replace(BRACKET, ''); }
    if (has('c_star_end') && /\s*\*$/.test(s)) { c = true; s = s.replace(/\s*\*$/, ''); }
    return [s, c];
  };
  const one = (raw, cur) => {
    let [l, c1] = mark(raw);
    let t = null;
    let m;
    if (has('c_eq') && (m = l.match(/^=\s*(.+)/))) { t = m[1]; c1 = true; }
    else if (has('o_sym') && (m = l.match(/^~\s*(.+)/))) t = m[1];
    else if (has('o_dash') && (m = l.match(/^[-–—]\s+(.+)/))) t = m[1];
    else if (has('o_letter') && (m = l.match(/^([A-Da-d])\s*[).:]\s*(.+)/))) t = m[2];
    else if (has('o_digit') && (m = l.match(/^([1-6])\s*[).]\s*(.+)/)) && +m[1] === cur.opts.length + 1) t = m[2];
    else if (c1 && l) t = l;
    if (t === null) return null;
    const [t2, c2] = mark(t);
    const [t3, c3] = suffix(t2);
    return { t: t3.trim(), c: c1 || c2 || c3 };
  };
  const optMatch = (l, cur) => {
    if (has('o_inline') && /(^|\s)[Aa]\s*[).]\s.+\s[Bb]\s*[).]\s/.test(l)) {
      const parts = l.split(/\s(?=[A-Da-d][).]\s)/).map((p) => one(p, cur)).filter(Boolean);
      if (parts.length >= 2) return parts;
    }
    const o = one(l, cur);
    return o ? [o] : null;
  };
  const qStart = (l) => {
    let m;
    if (has('q_num') && (m = l.match(/^(\d+)\s*[.)]\s*(.+)/))) return m[2];
    if (has('q_prefix') && (m = l.match(/^(?:savol|q|question|вопрос)\s*\d*\s*[:.)]\s*(.+)/i))) return m[1];
    if (has('q_hash') && (m = l.match(/^#\s*(.+)/))) return m[1];
    return null;
  };

  const blocks = [];
  let cur = null;
  const fin = () => { if (cur && cur.q) blocks.push(cur); cur = null; };

  for (const l of lines) {
    if (!l) { if (has('q_blank') && cur && cur.opts.length >= 2) fin(); continue; }
    if (cur && has('c_line')) {
      const a = l.match(/^(?:javob|to'g'ri javob|togri javob|answer|ans)\s*[:=-]\s*([A-Da-d1-4])/i);
      if (a) { const ch = a[1].toUpperCase(); cur.c = /\d/.test(ch) ? +ch - 1 : ch.charCodeAt(0) - 65; continue; }
    }
    const os = cur ? optMatch(l, cur) : null;
    if (os && cur.opts.length < 4) {
      for (const o of os) if (cur.opts.length < 4) { if (o.c) cur.c = cur.opts.length; cur.opts.push(o.t); }
      continue;
    }
    const qs = qStart(l);
    if (cur && cur.opts.length > 0 && !qs && has('o_multiline')) { cur.opts[cur.opts.length - 1] += ' ' + l; continue; }
    if (cur && cur.opts.length === 0 && !qs && has('q_multiline')) { cur.q += ' ' + l; continue; }
    fin();
    cur = { q: qs ?? l, opts: [], c: -1 };
  }
  fin();

  const cand = blocks.filter((b) => b.opts.length > 0);
  const clean = (s) => (has('x_clean') ? s.replace(/[;,]+$/, '').replace(/\s+/g, ' ').trim() : s.trim());
  const questions = cand.map((b, i) => {
    let c = b.c;
    if (c < 0 && has('c_key') && key[i + 1] !== undefined) c = key[i + 1];
    if (c < 0 && has('c_first')) c = 0;
    if (c < 0 && has('c_last')) c = b.opts.length - 1;
    const options = [...b.opts.map(clean), '', '', '', ''].slice(0, 4);
    return { q: clean(b.q), options, correct: c >= 0 && c < 4 && options[c] ? c : -1 };
  });
  return summarize(questions);
}

export const isValid = (x) =>
  x.q.trim() && x.options.filter((o) => o.trim()).length >= 2 && x.correct >= 0 && x.options[x.correct]?.trim();

export function summarize(questions) {
  const total = questions.length;
  const ok = questions.filter(isValid).length;
  return { questions, total, ok, percent: total ? Math.round((ok / total) * 100) : 0 };
}

/** Avtomatik skaner: tayyor sozlamalarni sinab, eng yaxshisini tanlaydi.
 *  Belgi bilan aniqlangan javoblar ("*", "Javob: B" ...) "doim A" kabi taxminlardan ustun turadi. */
export function autoScan(text) {
  let strong = null;
  let weak = null;
  for (const on of PRESETS) {
    const r = { ...parse(text, on), on };
    const isWeak = on.includes('c_first') || on.includes('c_last');
    if (isWeak) { if (!weak || r.ok > weak.ok) weak = r; }
    else if (!strong || r.ok > strong.ok) strong = r;
  }
  return strong && strong.ok >= (weak?.ok ?? 0) * 0.5 ? strong : weak;
}
