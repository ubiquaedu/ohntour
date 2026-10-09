# AGENTS.md — guida per agenti AI sul progetto «My OHN Tour»

Cartella: `D:\coding\ohn` (Windows, git `main`, repository
https://github.com/ubiquaedu/ohntour, deploy automatico su Cloudflare Pages →
https://myohntour.pages.dev).

## Che cos'è

Mini app web **100% statica** (niente build, niente dipendenze npm, niente
server): mappa Leaflet/OpenStreetMap dei luoghi del tour «Open House Napoli»,
con lista ordinabile per giornata e strumento per costruire il piano di
visite. Lingua dell'interfaccia: **italiano**.

## File (tutto nella radice della cartella)

- `index.html` — struttura: header (titolo + ricerca), barra admin, filtr
  i giornate, `<main class="layout">` (mappa sinistra + lista destra), footer.
- `style.css` — tema dark, responsive: su desktop griglia a 2 colonne,
  su mobile le sezioni si impilano in verticale.
- `app.js` — tutta la logica (~1.350 righe, ES module).
- `data.js` — **vuoto di proposito** (`export const luoghi = []`): la fonte
  dei dati è solo l'**import**; il file esiste come ripiego per un avvio
  senza import e come segnaposto del formato.
- `assets/` — miniature locali `ohn-<codice>.jpg` (codice = numero `l=` della
  scheda OHN), agganciate automaticamente dall'import.
- `_strumenti/` — script Python di supporto storici (geocode, import
  manuale, confronto export): **non usati dall'app**, modificare con cautela.
- `README.md` — documentazione per l'utente (funzioni, deploy, nuova edizione).
- `MEMORIA_PROGETTO.md` — memoria dettagliata delle decisioni e della storia
  (leggere prima di refactoring grossi; le sezioni marcate «superato»
  descrivono funzioni rimosse).

## Modello dei dati

Ogni luogo (`data.js` o import) ha: `id` (stabile per storage, derivato
dalla scheda OHN), `titolo`, `indirizzo`, `lat`/`lon` (possono mancare!),
`orari` (testo libero per più giorni), `url` (scheda OHN), `urlFoto`, `nota`.

Stato persistente in `localStorage` (prefisso `mytour-`):

| chiave | contenuto |
| --- | --- |
| `mytour-dati-importati-v1` | luoghi dell'ultimo import (fonte primaria) |
| `mytour-mappa-correzioni-v1` | correzioni coordinate/testi (per `id`) |
| `mytour-scelte-per-giorno-v1` | segnalibri (tour personale) PER GIORNATA |
| `mytour-esclusioni-v1` | esclusioni (✕) PER GIORNATA — mai cancellazioni nei dati |

Import/Export stato: JSON v2 con dati+correzioni+scelte+esclusioni.

## Come funziona il giorno

Le giornate sono **etichette testuali** in `index.html` (pulsanti
«Tutti/Ven/Sab/Dom», es. «Ven 2»); l'app NON contiene proprietà
all'edizione. Il testo orario (`when`) viene interpretato con
`parseOrari()` ricerca-fuzzy (cerca le etichette dei pulsanti dentro il
testo). Per una nuova edizione si cambia SOLO il testo dei pulsanti.
`MARGINE_CONFLITTO_MIN` (testa di `app.js`) regola l'avviso conflitti orari.

## Comportamenti fondamentali (non rompere)

- **Layout**: `<main class="layout">` deve racchiudere mappa e lista:
  senza quel tag la griglia sparisce e tutto si impila (bug già successo,
  è bello ricontrollare dopo ogni modifica all'HTML).
- **✕ (escludi)**: in vista di giornata esclude la località **SOLO da quel
  giorno** e non tocca mai i segnalibri né i dati. Le escluse compaiono in
  fondo alla lista (bordo rosso) con **↺ Ripristina** (per quel giorno, o
  tutti in vista «Tutti»).
- **Nessun dato va cancellato**: tutto è reversibile; «🗑 Svuota dati»
  (barra admin) è l'unica azione di azzero, con conferma.
- **Posizionamento senza coordinate**: l'import prova PRIMA Nominatim
  (indirizzo, poi titolo), e crea la correzione; il click su mappa «🎯
  Posiziona» è solo il ripiego. Le località senza coordinate restano in
  fondo alla lista per l'admin, sono nascoste per i non-admin.
- **Non-admin (senza password)**: vede solo la mappa/lista/piani, non la
  barra admin e non le esclusioni.
- **Console pulita**: nessun errore oltre al riepilogo di conflitti
  (voce voluta).
- **Cache**: dopo modifiche a `app.js`/`data.js` servono Ctrl+F5 o
  query-string nuova per vedere le novità in locale; il deploy Pages le
  fresca da solo.

## Verifica dopo ogni modifica

1. `node --check app.js` (e `node --check data.js` se toccato).
2. Server locale: `python -m http.server 8123` → http://localhost:8123/
3. Test nel browser (Playwright/chrome devtools MCP): password «26» nel
   campo 🔒 per la modalità admin; scenari minimi = dati vuoti (import),
   segnalibro per giornata, ✕+↺ in vista di giornata e in «Tutti»,
   posizionamento Nominatim su luogo senza coordinate, console senza errori.
4. Se toccato HTML/layout: verificare griglia a 2 colonne su desktop e
   impilamento su mobile (viewport stretto).

## Convenzioni del repo

- Messaggi di commit in italiano, sintetici, che descrivono il «perché»
  (vedi `git log`).
- Nessuna modifica auto-pubblicante il deploy: basta `git push origin main`
  (deploy automaticoPages ~1 minuto); verificare poi che
  https://myohntour.pages.dev/ serva app.js/data.js aggiornati
  (grep di un token nuovo nel file remoto).
- Non cancellare d'autorità `data.js` né `_strumenti/`: svuotare i dati
  significa scrivere `export const luoghi = []` nel file, non eliminarlo.
