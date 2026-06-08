# Rustic Shop - React + Supabase

## Ce face
- magazin public cu produse
- admin cu parolă simplă
- adăugare produse cu poză
- produs disponibil / indisponibil
- comandă prin formular
- când clientul comandă, produsul devine automat indisponibil
- comenzi salvate în Supabase

## Pași rapizi
1. Intră pe https://supabase.com și creează proiect nou.
2. În Supabase, mergi la SQL Editor și rulează fișierul `supabase.sql`.
3. În Supabase, mergi la Project Settings > API și copiază:
   - Project URL
   - anon public key
4. Creează fișier `.env` după modelul `.env.example`.
5. Rulează:
   npm install
   npm run dev
6. Pentru publicare:
   npm run build
   apoi urci proiectul pe Netlify sau Vercel.

## Date importante
Parola admin este în `src/main.jsx`:
ADMIN_PASSWORD = "admin123"
Schimb-o înainte să pui site-ul public.

Telefonul și emailul sunt tot în `src/main.jsx`.
