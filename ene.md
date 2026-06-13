# Jurnal branch `ene`

Data pornire: 2026-06-12

## Branch si setup

- Creat branch local `ene` din `main`.
- Publicat branch-ul pe GitHub ca `origin/ene`.
- Pornit proiectul local cu cele trei servicii:
  - Django backend pe `http://127.0.0.1:8000`
  - FastAPI AI service pe `http://127.0.0.1:8001`
  - Vite frontend pe `http://127.0.0.1:5173`
- Creat `.venv` local si instalat dependintele Python pentru backend si AI service.
- Instalat dependintele frontend cu `npm install --legacy-peer-deps`, deoarece instalarea simpla avea conflict de peer dependencies intre `vite` si `@rolldown/plugin-babel`.

## Configurare locala

- Adaugat fisiere `.env` locale pentru:
  - `backend/.env`
  - `legislative-intelligence/.env`
  - `frontend/.env`
- Aceste fisiere sunt ignorate de git si nu trebuie comise.
- Nu notam valori de secrete in acest jurnal.
- Adaugat `run-logs/` in `.gitignore`, pentru ca logurile locale generate la rulare sa nu intre accidental in git.

## Reparare lista parlamentari

- Adaugat utilitarul `backend/apps/parliamentarians/text_utils.py`.
- Reparat mojibake pentru nume, judete, partide si narative de impact score.
- Normalizat diacriticele romanesti vechi (`ş`, `ţ`) catre variantele moderne (`ș`, `ț`).
- Deduplicat parlamentarii in endpointurile backend pe baza numelui reparat plus partid.
- Daca exista duplicate, se pastreaza inregistrarea mai completa:
  - are `impact_score`
  - are mai multe voturi
  - are judet
  - are email
  - are camera
- Extins serializer-ele de parlamentari ca raspunsurile API sa intoarca text curatat.
- Versionat cache-ul endpointurilor de parlamentari la `parliamentarians_v3`, ca sa nu mai fie servite raspunsuri vechi din cache.
- Dezactivat cache-ul extern Upstash in timpul testelor Django, ca testele sa foloseasca datele din test database, nu raspunsuri cache-uite.

## Reparare scoruri lipsa in lista parlamentari

- Adaugat `backend/apps/parliamentarians/score_utils.py`.
- Adaugat fallback de `impact_score` pentru parlamentarii care au voturi, dar nu au rand in tabela `impact_scores`.
- Endpointul `/api/mps/` foloseste acum annotari SQL pentru numaratoarele de voturi si poate construi scorul direct din `MPVote`.
- Endpointul de profil complet foloseste acelasi fallback din voturile prefetched.
- Semnalul `MPVote` completeaza acum si campul `score`, nu doar count-urile.
- Daca exista deja un rand `impact_scores` cu `score = null`, serializer-ul completeaza scorul din count-urile existente.
- Versionat cache-ul endpointurilor de parlamentari la `parliamentarians_v4`.
- Actualizat tipul frontend `ImpactScore.calculated_at` ca poate fi `null` pentru scorurile calculate din fallback.

## Cazuri verificate

- `Bende SĂĄndor` este deduplicat cu `Bende Sándor`.
- `BirĂł RozĂĄlia-Ibolya` este deduplicat cu `Biró Rozália-Ibolya`.
- `Albu DumitriĹŁa` este deduplicat cu `Albu Dumitrița`.
- `Barbu Florin-IonuĹŁ` este deduplicat cu `Barbu Florin-Ionuț`.
- Dupa ultima reparatie, endpointul `/api/mps` a scazut la `335` parlamentari deduplicati.
- `Amet Varol` primeste acum scor fallback in lista si profil: `99.5`, `76` voturi.

## Reparare lista voturi pe pagina de lege

- Curatat `mp_name`, `party` si `vote` in serializer-ul voturilor de pe pagina unei legi.
- Deduplicat randurile din buckets de vot (`pentru`, `contra`, `abtinere`, `absent`) dupa nume, partid si vot normalizate.
- Versionat cache-ul endpointului `/api/bills/{id}/votes/` la `bills_v2`, ca raspunsurile vechi sa nu mai ramana agatate in cache.
- Adaugat si in frontend curatarea prin `cleanText` pentru numele si partidul parlamentarilor din lista mica de voturi.
- Verificat live pe `/api/bills/23131/votes/`: `Neacșu Andreea-Firuța`, `Teslariu Andrei-Ionuț`, `Corcheș Codruța-Maria` si `Albu Dumitrița` apar corect.

## Reparare creare cont

- Reparat whitelist-ul local CSRF/CORS pentru frontend-ul pornit pe `http://127.0.0.1:5173`.
- Corectat typo-ul `127.0.1` -> `127.0.0.1` in `backend/config/settings.py` si in `backend/.env` local.
- Aliniat frontend-ul cu serializer-ul `dj-rest-auth`: register-ul trimite acum `password1` si `password2`, nu campul simplu `password`.
- Repornit backend-ul dupa modificarea `.env`.
- Verificat live ca request-ul de register cu `Origin: http://127.0.0.1:5173` nu mai pica pe `CSRF Failed: Origin checking failed`.

## Reparare onboarding dupa creare cont

- Redesigned ecranul initial de onboarding: panou lat, intro clar in stanga, alegeri AI/manual in dreapta si buton de skip discret.
- Eliminat aspectul de mini-card plutitor cu progress bar lipit de logo.
- Dupa feedback vizual, inlocuit split-screen-ul negru cu un card central mai calm, luminos si compact.
- Simplificat ecranul initial: brand sus, progress discret, titlu central si doua optiuni clare, fara elemente mari care se taie pe ecran.
- Refactor UI onboarding in clase CSS semantice (`onboarding-modal`, `onboarding-choice-card`, `onboarding-progress-*`) si variabile locale pentru culori.
- Adaugat fundal light premium cu pattern subtil de puncte si radial gradient foarte soft in spatele modalului.
- Header-ul modalului are acum fundal tintuit, border discret, logo in badge circular si buton `Sari peste` fara clipping.
- Optiunile AI/manual au icon containers 60px, hover cu translateY(-1px), border mai vizibil si shadow subtil.
- Reparat selectarea manuala: onboarding-ul folosea gresit `/api/bills/metadata/`, care intoarcea `404`; acum foloseste `/api/profiles/questionnaire/`.
- Reparat crash-ul `Cannot read properties of undefined (reading 'map')` din manual mode: `getQuestionnaireMetadata()` normalizeaza acum raspunsul backend si garanteaza `impact_categories` + `counties`.
- Daca backend-ul trimite `personal_interest_areas`, frontend-ul le transforma in `impact_categories`; daca lipsesc `counties`, foloseste fallback local cu judetele Romaniei.
- Mutat aceeasi sursa corecta de metadata si pentru AI onboarding, hook-ul de analiza interese si pagina de profil.
- Manual mode afiseaza acum eroare cu retry daca metadata nu se poate incarca, in loc sa ramana blocat in skeleton infinit.
- Navigarea din onboarding catre feed trimite explicit `search: { page: undefined, category: undefined }`, ca sa nu adauge erori noi de tipuri TanStack Router.

## Teste rulate

```powershell
$env:TEST_DATABASE_URL='sqlite:///C:/Users/user/Desktop/CivicMinds/sw_civicmind/backend/test.sqlite3'; .\.venv\Scripts\python.exe backend\manage.py test apps.parliamentarians
```

Rezultat dupa reparatia scorurilor lipsa: `20 tests`, `OK`.

```powershell
$env:TEST_DATABASE_URL='sqlite:///C:/Users/user/Desktop/CivicMinds/sw_civicmind/backend/test.sqlite3'; .\.venv\Scripts\python.exe backend\manage.py test apps.bills
```

Rezultat dupa reparatia listei de voturi pe pagina legii: `6 tests`, `OK`.

```powershell
.\.venv\Scripts\python.exe backend\manage.py check
```

Rezultat: `System check identified no issues`.

```powershell
$env:TEST_DATABASE_URL='sqlite:///C:/Users/user/Desktop/CivicMinds/sw_civicmind/backend/test.sqlite3'; .\.venv\Scripts\python.exe backend\manage.py test apps.authentication
```

Rezultat dupa reparatia formularului de creare cont: `5 tests`, `OK`.

```powershell
npm test -- --run src/tests/api.test.ts
```

Rezultat dupa reparatia payload-ului de register: `5 tests`, `OK`.

```powershell
$env:TEST_DATABASE_URL='sqlite:///C:/Users/user/Desktop/CivicMinds/sw_civicmind/backend/test.sqlite3'; .\.venv\Scripts\python.exe backend\manage.py test apps.profiles
```

Rezultat dupa reparatia metadata pentru onboarding/profil: `6 tests`, `OK`.

```powershell
npm test -- --run src/tests/profile.test.tsx src/tests/api.test.ts
```

Rezultat dupa reparatia metadata frontend: `10 tests`, `OK`.

```powershell
npm run build
```

Rezultat: esuat pe erori TypeScript existente in TanStack Router, unde mai multe navigari catre `/` nu trimit parametrul `search` cerut de tipurile generate. Dupa reparatia onboarding, erorile ramase nu mai includ `frontend/src/components/onboarding/onboarding-page.tsx`.

## Observatii

- `frontend/src/routeTree.gen.ts` apare uneori modificat din cauza generatorului TanStack/Vite si a line endings. Nu este o schimbare functionala facuta manual.
- In output brut PowerShell unele diacritice pot parea stricate din cauza encoding-ului consolei, dar API-ul returneaza Unicode corect.
