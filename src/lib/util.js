export const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
/** Savollarni aralashtiradi, har birining variantlarini ham aralashtiradi (i = asl indeks) */
export const prep = (qs, n) =>
  shuffle(qs).slice(0, n).map((q) => ({
    q: q.q, correct: q.correct,
    opts: shuffle(q.options.map((t, i) => ({ t, i })).filter((o) => o.t)),
  }));
