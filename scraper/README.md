# Scraper emailuri deputati Camera Deputatilor

Scriptul extrage emailurile publice ale deputatilor activi din legislatura curenta (`2024-prezent`) de pe site-ul oficial `cdep.ro`.

## Ce face varianta finala

- Citeste pagina oficiala a legislaturii `2024-prezent`
- Parseaza doar tabelul cu deputatii activi
- Ignora sectiunea separata pentru deputatii care si-au incetat mandatul
- Intra pe pagina fiecarui deputat activ
- Extrage emailul din continutul vizibil al profilului
- Ignora adrese generice din template, cum ar fi `webmaster@cdep.ro`
- Salveaza rezultatele in JSON

## Fisiere importante

- `scrape_deputati_emails_v2.py` - implementarea finala
- `scrape_deputati_emails.py` - wrapper de compatibilitate
- `test_scraper.py` - teste unitare pentru parser si extractia emailului
- `deputati_emails.json` - toti deputatii activi gasiti
- `deputati_cu_email.json` - doar deputatii cu email public gasit
- `deputati_emails_progress.json` - progres intermediar pentru rulari mai lungi

## Instalare

```bash
pip install -r requirements.txt
```

## Rulare

Din folderul `scraper/`:

```bash
python scrape_deputati_emails_v2.py
```

Cateva optiuni utile:

```bash
python scrape_deputati_emails_v2.py --limit 10
python scrape_deputati_emails_v2.py --delay 0.3
python scrape_deputati_emails_v2.py --no-progress
```

## Formatul datelor

Fiecare deputat este salvat astfel:

```json
{
  "idm": "123",
  "name": "Nume Prenume",
  "electoral_district": "35 / SUCEAVA",
  "party": "PSD",
  "member_since_note": "",
  "email": "nume.prenume@cdep.ro",
  "profile_url": "https://www.cdep.ro/pls/parlam/structura2015.mp?idm=123&cam=2&leg=2024"
}
```

## Verificare

Ruleaza testele locale:

```bash
python -m unittest test_scraper.py
```

## Note tehnice

- Site-ul `cdep.ro` foloseste un setup TLS vechi, iar scriptul foloseste un adapter compatibil pentru `requests`
- Raspunsurile sunt decodate cu `iso-8859-2`
- Outputul `party` vine din tabelul oficial al deputatilor activi si reprezinta grupul parlamentar curent afisat acolo
- Unele profile nu publica niciun email, caz in care campul `email` ramane `null`
