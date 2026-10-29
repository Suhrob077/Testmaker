# TestMaker — PDF/DOCX dan testlar

React (Vite) + Firebase (Firestore, ixtiyoriy Storage/Auth). Kunduzgi/tungi rejim, Creator paneli, avtomatik skaner,
22 ta qo'lda sozlama, Pro-tahrirlash (ikki oynali) va oddiy foydalanuvchilar uchun darhol natija ko'rsatuvchi Quiz.

## Ishga tushirish
1. `npm install`
2. Firebase Console → yangi loyiha → **Build → Firestore Database** (Create database).
3. Project settings → **Your apps → Web (</>)** → `firebaseConfig` qiymatlarini oling.
4. `.env.example` ni `.env` ga nusxalab, qiymatlarni kiriting.
5. `npm run dev` → http://localhost:5173

## Xavfsizlik (muhim!)
Brauzerdagi parol (`creator123`) faqat interfeysni yashiradi — Firestore qoidalari ochiq bo'lsa, kim xohlasa yoza oladi.
Haqiqiy himoya uchun:
1. Firebase Console → **Authentication → Email/Password** ni yoqing, foydalanuvchi qo'shing (masalan `me@mail.com`, parol `creator123`).
2. `.env` da `VITE_CREATOR_EMAIL=me@mail.com` ni yozing — endi parol Firebase Auth orqali tekshiriladi.
3. `firestore.rules` (va ishlatsangiz `storage.rules`) ni Console → Rules ga qo'ying (`request.auth != null` yozishni cheklaydi).

Tez sinov uchun: Auth sozlamasdan, `firestore.rules` ichida `allow write: if true;` qoldiring (production uchun tavsiya etilmaydi).

## Fayl resurslarini saqlash
`.env` da `VITE_USE_STORAGE=true` qiling (Firebase Storage yoqilgan bo'lishi kerak; yangi loyihalarda Blaze tarifi talab qilinishi mumkin).
Testlar baribir Firestore'da (`modules` kolleksiyasi) saqlanadi.

## Deploy
`npm i -g firebase-tools && firebase login && firebase init` (Hosting: `dist`, SPA: yes) → `npm run build && firebase deploy`

## Ma'lumot tuzilmasi
`modules/{id}`: `subject`, `title`, `questions: [{q, options[4], correct(0-3)}]`, `testCount`, `fileName`, `fileUrl`, `createdAt`.

## Fayl formatlari (avto-skaner taniydi)
- `1. Savol` + `A) variant`, to'g'ri javob `*B)`, `+B)`, `B) matn *`, `B) matn (+)`, `=matn`
- savol ostida `Javob: B`, yoki fayl oxirida `Javoblar` + `1-B 2-C ...`
- bo'sh qator bilan ajratilgan, to'g'ri javob doim A
- `Savol:` / `#` prefikslari
Boshqa format bo'lsa: **Qo'lda sozlash** yoki **Pro-tahrirlash**.

## Cheklovlar
- Skanerlangan (rasmli) PDF o'qilmaydi — OCR yo'q. Pro-tahrirlashda qo'lda kiritasiz.
- DOCX da to'g'ri javob faqat rang/qalin shrift bilan belgilangan bo'lsa, u aniqlanmaydi (faqat matn belgilari).
- Har bir test 4 tagacha variant bilan saqlanadi.

## GAME-T (jamoaviy o'yin) — Realtime Database
1. Console → **Build → Realtime Database → Create database** (Start in test mode).
2. Tepadagi URL ni (`https://...firebaseio.com` yoki `...firebasedatabase.app`) `.env` ga `VITE_FIREBASE_DATABASE_URL=` qilib yozing, `npm run dev` ni qayta ishga tushiring.
3. **Rules** ga `database.rules.json` mazmunini qo'ying va Publish qiling.
Eslatma: o'yinchilar akkauntsiz kiradi, shuning uchun `rooms` ochiq yoziladi. Xona tugagach yoki host chiqib ketsa, ma'lumotlar o'chiriladi.

## VIP tizimi
1. Console → **Authentication → Sign-in method**: **Anonymous** va **Email/Password** ni yoqing.
2. Email/Password'da o'zingiz uchun admin foydalanuvchi yarating; `.env` da `VITE_CREATOR_EMAIL=` shu email, `VITE_ADMIN_TELEGRAM=` Telegram username (@ siz).
3. `firestore.rules` ichidagi `ADMIN_EMAIL@example.com` ni o'z emailingizga almashtirib, Firestore → Rules ga qo'ying (Publish).
4. Foydalanuvchi VIP tugmasini bosganda 12 xonali ID oladi (qurilmaga bog'langan, anonim Auth) → Telegramda sizga yozadi → siz Creator → Foydalanuvchilar'da ID bo'yicha topib VIP: ON qilasiz.
VIP savollar alohida `vipQuestions` kolleksiyasida, qoidalar orqali faqat VIP/admin o'qiy oladi.
