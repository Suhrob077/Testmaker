import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const env = import.meta.env;
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const configured = Boolean(cfg.apiKey && !String(cfg.apiKey).startsWith('YOUR'));
const app = configured ? initializeApp(cfg) : null;
const db = app ? getFirestore(app) : null;

function need() {
  if (!db) throw new Error(".env faylida Firebase sozlamalari kiritilmagan (README ga qarang).");
}

/** Creator kirishi: email berilsa Firebase Auth, aks holda oddiy parol solishtiriladi */
export async function creatorLogin(password) {
  if (env.VITE_CREATOR_EMAIL) {
    need();
    await signInWithEmailAndPassword(getAuth(app), env.VITE_CREATOR_EMAIL, password);
    return true;
  }
  return password === (env.VITE_CREATOR_PASSWORD || 'creator123');
}

export async function listModules() {
  need();
  const snap = await getDocs(query(collection(db, 'modules'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveModule({ subject, title, questions, file, vip }) {
  need();
  let fileUrl = null;
  if (file && env.VITE_USE_STORAGE === 'true') {
    try {
      const r = ref(getStorage(app), `files/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      fileUrl = await getDownloadURL(r);
    } catch (e) {
      console.warn('Storage yuklash xatosi (test baribir saqlanadi):', e);
    }
  }
  const id = doc(collection(db, 'modules')).id;
  const base = {
    subject: subject.trim(), title: title.trim(), testCount: questions.length, vip: !!vip,
    fileName: file?.name || null, fileUrl, createdAt: serverTimestamp(),
  };
  if (vip) {
    // VIP savollar alohida hujjatda: faqat VIP foydalanuvchi va admin o'qiy oladi
    await setDoc(doc(db, 'vipQuestions', id), { questions });
    await setDoc(doc(db, 'modules', id), { ...base, questions: [] });
  } else {
    await setDoc(doc(db, 'modules', id), { ...base, questions });
  }
  return id;
}

export async function removeModule(id) {
  need();
  await deleteDoc(doc(db, 'modules', id));
  await deleteDoc(doc(db, 'vipQuestions', id)).catch(() => {});
}

// ---- Yangi: bitta modulni olish va Realtime Database (jamoaviy o'yin) ----
import { getDoc } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
export const rtdb = app && env.VITE_FIREBASE_DATABASE_URL ? getDatabase(app, env.VITE_FIREBASE_DATABASE_URL) : null;
export async function getModule(id) {
  need();
  const s = await getDoc(doc(db, 'modules', id));
  if (!s.exists()) return null;
  const m = { id: s.id, ...s.data() };
  if (m.vip) m.questions = (await getDoc(doc(db, 'vipQuestions', id))).data().questions;
  return m;
}

// ---- VIP: qurilma orqali (anonim) Auth + users/{uid} ----
import { setDoc, updateDoc, where, limit, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
const code12 = () => Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');

/** Foydalanuvchi holatini kuzatadi: {uid, code, vip, nick, admin} */
export function watchUser(cb) {
  if (!app) return () => {};
  const auth = getAuth(app);
  let unsubDoc = () => {};
  const unsub = onAuthStateChanged(auth, async (u) => {
    unsubDoc();
    if (!u) { try { await signInAnonymously(auth); } catch (e) { cb({ error: e.message }); } return; }
    if (u.email) return cb({ uid: u.uid, admin: true, vip: true });
    // Hujjat avtomatik yaratilmaydi: ID faqat VIP anketada "Saqlash" bosilganda beriladi
    unsubDoc = onSnapshot(doc(db, 'users', u.uid),
      (d) => cb({ uid: u.uid, admin: false, ...(d.exists() ? d.data() : {}) }),
      (e) => cb({ uid: u.uid, admin: false, error: e.message }));
  });
  return () => { unsub(); unsubDoc(); };
}
export const creatorLogout = () => app && signOut(getAuth(app));
export const setNick = (uid, nick) => updateDoc(doc(db, 'users', uid), { nick: nick.trim().slice(0, 20) });
export const setVip = (id, vip) => updateDoc(doc(db, 'users', id), { vip });
export async function findUsers(code) {
  need();
  const q = code
    ? query(collection(db, 'users'), where('code', '==', code))
    : query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(30));
  return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Admin: mavzuni FREE <-> VIP ga o'tkazadi (savollar mos kolleksiyaga ko'chadi) */
export async function setModuleVip(id, vip) {
  need();
  const m = await getModule(id);
  if (!m || !!m.vip === vip) return;
  if (vip) {
    await setDoc(doc(db, 'vipQuestions', id), { questions: m.questions });
    await updateDoc(doc(db, 'modules', id), { vip: true, questions: [] });
  } else {
    await updateDoc(doc(db, 'modules', id), { vip: false, questions: m.questions });
    await deleteDoc(doc(db, 'vipQuestions', id));
  }
}

/** VIP anketada "Saqlash": ism bilan 12 xonali ID yaratadi va Firestore'ga yozadi */
export async function createUser(uid, nick) {
  need();
  const r = doc(db, 'users', uid);
  if ((await getDoc(r)).exists()) return;
  await setDoc(r, { code: code12(), vip: false, nick: nick.trim().slice(0, 20), createdAt: serverTimestamp() });
}
