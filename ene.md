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

## Reparare salvare interese din profil

- Profilul salva manual interesele in campul `interests`, dar backend-ul il trateaza ca derivat/read-only si il ignora la PATCH.
- Mutat salvarea manuala si onboarding-ul pe campul corect `personal_interest_areas`.
- UI-ul pastreaza etichetele citibile pentru utilizator, dar trimite catre backend valorile stabile din chestionar (`health`, `education`, `taxes` etc.).
- Normalizat metadata de chestionar in frontend cu `impact_category_options`, ca toate componentele sa aiba acces la perechi `{ value, label }`.
- Normalizat si rezultatele AI: AI-ul poate intoarce etichete, dar frontend-ul le transforma in valorile salvabile inainte de persistenta.
- Ecranul final de onboarding traduce valorile salvate inapoi in etichete, ca utilizatorul sa nu vada coduri interne precum `health`.
- Actualizat testele frontend si mock-urile MSW ca sa verifice explicit ca selectia manuala `Sanatate` trimite `personal_interest_areas: ["health"]` si produce interes derivat pentru feed.
- Eliminat textul `(doar citire)` din label-ul campului email din pagina de profil.

```powershell
npm test -- --run src/tests/api.test.ts src/tests/profile.test.tsx
```

Rezultat dupa reparatia salvarii intereselor din profil: `11 tests`, `OK`.

```powershell
npm run build
```

Rezultat: esuat in continuare pe aceleasi erori TypeScript existente in TanStack Router, unde navigarile catre `/` trebuie sa trimita parametrul `search`.

## Prioritizare feed dupa interese

- Actualizat endpointul `/api/bills/personalized/` ca feed-ul sa fie ordonat dupa potrivirile cu profilul utilizatorului.
- Legile cu mai multe categorii de impact potrivite cu `profile.interests` apar inaintea celor cu mai putine potriviri, apoi se aplica ordonarea dupa recenta.
- Matching-ul foloseste atat `name`, cat si `slug`, cu normalizare pentru diacritice/capitalizare, ca `sanatate`, `Sanatate` si `Sănătate` sa ajunga la aceeasi intentie.
- Cheia de cache pentru feed-ul personalizat include acum starea profilului (`interests`, `persona_tags`, `personal_interest_areas`, judet, partid), astfel incat feed-ul sa se refaca dupa salvarea preferintelor.
- Cheia React Query din dashboard include acum interesele si persona tags ale utilizatorului, ca frontend-ul sa refaca request-ul dupa update de profil.
- Badge-urile de categorii din cardurile de feed evidentiaza interesele potrivite folosind normalizare similara, nu comparatie exacta fragila.
- Adaugat test backend care verifica faptul ca o lege mai veche cu doua interese potrivite apare inaintea unei legi mai recente cu o singura potrivire si inaintea legilor fara potrivire.

```powershell
$env:TEST_DATABASE_URL='sqlite:///C:/Users/user/Desktop/CivicMinds/sw_civicmind/backend/test.sqlite3'; .\.venv\Scripts\python.exe backend\manage.py test apps.bills
```

Rezultat dupa prioritizarea feed-ului: `7 tests`, `OK`.

```powershell
npm test -- --run src/tests/api.test.ts src/tests/profile.test.tsx src/tests/bill-card.test.tsx
```

Rezultat dupa prioritizarea feed-ului: `13 tests`, `OK`.

```powershell
npm run build
```

Rezultat: esuat in continuare pe erori TypeScript existente in TanStack Router, unde alte componente navigheaza catre `/` fara parametrul `search`. `dashboard-page.tsx` nu mai apare in lista erorilor.

## Reparare debifare interese si refresh feed

- Reparat derivarea backend pentru `profile.interests` si `profile.persona_tags`: valorile sunt acum recalculate curat din campurile actuale de chestionar, nu pornesc de la valorile vechi existente.
- Inainte, daca utilizatorul debifa `Sanatate`, interesul derivat `sanatate` ramanea in profil fiindca backend-ul adauga peste lista veche.
- Adaugat teste care verifica explicit ca un PATCH cu o lista noua de `personal_interest_areas` elimina interesele derivate care nu mai corespund selectiei.
- Actualizat testele feed-ului ca sa seteze preferintele prin campurile de chestionar, nu prin `interests`, care este derivat/read-only.
- Recalculat profilele locale care aveau preferinte salvate; profilul `test2` a fost curatat local si are acum doar interesele derivate din selectia curenta.
- Repornit backend-ul local dupa fix.

```powershell
$env:TEST_DATABASE_URL='sqlite:///C:/Users/user/Desktop/CivicMinds/sw_civicmind/backend/test.sqlite3'; .\.venv\Scripts\python.exe backend\manage.py test apps.profiles apps.bills
```

Rezultat dupa repararea debifarii intereselor: `15 tests`, `OK`.

```powershell
npm test -- --run src/tests/api.test.ts src/tests/profile.test.tsx src/tests/bill-card.test.tsx
```

Rezultat dupa repararea debifarii intereselor: `13 tests`, `OK`.

## Refactor UI/UX onboarding

- Transformat onboarding-ul dintr-un card cu header duplicat intr-o pagina de setup care respecta flow-ul aplicatiei: header-ul global ramane contextul principal, iar cardul intern are stepper si workspace dedicat.
- Adaugat panou contextual in stanga cu explicatii scurte despre ce face personalizarea feed-ului si cum pot fi schimbate preferintele ulterior.
- Ecranul initial are acum doua alegeri clare, cu copy scurt si CTA-uri consecvente: AI rapid sau selectie manuala.
- Modurile AI si manual folosesc acelasi limbaj vizual: back button, intro clar, carduri de camp, chip-uri de interese, actiune primara si note de ajutor.
- Salvarea preferintelor nu mai avanseaza optimist catre ecranul final inainte de raspunsul API; daca salvarea esueaza, utilizatorul vede eroare si ramane in pasul curent.
- Butoanele de continuare sunt dezactivate in timp ce se salveaza si, in manual mode, pana exista cel putin un judet sau un interes selectat.
- Ecranul final de onboarding a fost simplificat cu confirmare clara si rezumat al preferintelor salvate.

```powershell
npm test -- --run src/tests/api.test.ts src/tests/profile.test.tsx src/tests/bill-card.test.tsx
```

Rezultat dupa refactorul onboarding: `13 tests`, `OK`.

```powershell
npm run build
```

Rezultat: esuat in continuare pe aceleasi erori TypeScript existente in TanStack Router, unde alte componente navigheaza catre `/` fara parametrul `search`. Refactorul onboarding nu introduce erori noi de tipuri.

## Aliniere onboarding cu stilul Feed

- Eliminat panoul lateral inchis din onboarding ca pagina sa nu mai arate ca un landing page separat.
- Redus layout-ul la un container central de tip preferences/settings, cu max-width similar feed-ului si card alb cu border subtil.
- Pasul curent este afisat ca label compact (`Pasul 1 din 2`), iar progress bar-ul ramane foarte subtire si discret.
- Titlul si subtitlurile au fost reduse la scara vizuala a aplicatiei: mai apropiate de Feed, fara hero typography supradimensionat.
- Optiunile AI/manual si interesele au fost restilizate ca elemente neutre de aplicatie: fundal alb, borduri fine, hover calm, radius 12-16px.
- Starea selectata pentru interese foloseste accent verde subtil: border verde, fundal verde foarte deschis si text verde inchis, nu blocuri puternic colorate.
- Butonul principal foloseste accentul verde CivicMind, iar actiunile secundare raman ghost/border, compacte.
- Fundalul onboarding foloseste acelasi limbaj luminos cu pattern discret de puncte, fara radial/marketing treatment dominant.
- Nu a fost schimbata logica sau ordinea flow-ului; modificarile sunt strict de layout, styling, spacing si ierarhie vizuala.

```powershell
npm test -- --run src/tests/api.test.ts src/tests/profile.test.tsx src/tests/bill-card.test.tsx
```

Rezultat dupa alinierea onboarding cu Feed: `13 tests`, `OK`.

```powershell
npm run build
```

Rezultat: esuat in continuare pe aceleasi erori TypeScript existente in TanStack Router, unde alte componente navigheaza catre `/` fara parametrul `search`. Onboarding-ul nu apare in erori.

## Observatii

- `frontend/src/routeTree.gen.ts` apare uneori modificat din cauza generatorului TanStack/Vite si a line endings. Nu este o schimbare functionala facuta manual.
- In output brut PowerShell unele diacritice pot parea stricate din cauza encoding-ului consolei, dar API-ul returneaza Unicode corect.
