# Memoria progetto — App web «My OHN Tour» (D:\coding\ohn)

> File di memoria per le chat AI: leggere PRIMA di intervenire. Le regole
> generali valide per tutte le app sono in `D:\coding\agents.md` (rispondere
> SEMPRE in italiano, mai pubblicare `.freebuff/`, ecc.). Avvio locale e
> pubblicazione sono descritti nel `README.md` (AGGIORNATO 08/10 al modello
> attuale); qui c'è il resto: decisioni, storia, ambiente.

## Cosa è (stato ATTUALE, 08/10/2026)

- Mini app web **statica**: mappa OpenStreetMap (Leaflet 1.9.4 via CDN) dei
  luoghi del tour Open House Napoli. **La fonte dei dati è l'IMPORT**
  (preferiti dal sito openhousenapoli.org o file HTML «My tour» salvato dal
  browser). `data.js` è VUOTO di proposito (`luoghi = []`): senza import
  l'app parte con la lista vuota.
- **Layout**: header con ricerca e campo 🔒 password; **#adminBar** subito
  sotto (nascosta fino allo sblocco); sotto, griglia PC **mappa a sinistra,
  lista a destra** (mobile: mappa sopra, lista sotto, pagina che scrolla).
- **Strumenti admin** (password «26», campo 🔒): zona 🖼 Cartella foto
  (opzionale) · zona 📄 File HTML · ⬇ Esegui import · ⬇ Esporta stato ·
  ⬆ Importa stato · 🗑 Svuota dati.
- **Posizionamento a ritmo dell'utente**: finito l'import, avviso con i
  luoghi senza coordinate (NESSUNA coda automatica: l'import non aspetta la
  mappa). Per ogni luogo, il pulsante 🎯 sulla card tenta PRIMA Nominatim
  (`riprovaGeocodifica`: indirizzo, poi titolo). Solo se fallisce: banner
  «clicca il punto esatto» con Salta/Annulla (Esc). I rimasti in
  sospeso: in fondo alla lista con
  🎯 Posiziona (bordo arancio). Coordinate = correzione `correzioni[id]`.
- **Segnalibri per giornata** («tour personale»): solo nelle viste di
  giorno; `mytour-scelte-per-giorno-v1`; contatore e «↺ Reset segnalibri»
  (solo nelle viste di giorno, nascosto in «Tutti»).
- **✕ = esclusa SOLO dal giorno selezionato** (admin): esclusioni in
  `mytour-esclusioni-v1` {ven,sab,dom}; reversibili con **↺ Ripristina**
  sulle card in fondo alla lista (solo admin; bordo rosso). Per il
  visitatore non-admin le escluse spariscono da lista e mappa nelle viste
  dove sono escluse. I segnalibri NON vengono mai toccati dalla ✕. Storia:
  prima versione (08/10) escludeva «tutti i giorni senza preferito» —
  cancellava troppo, corretta su segnalazione («mi ha cancellato tutti i
  luoghi, anche Ambrosino»).
- **Esporta/Importa stato** versione 2: {datiImportati, correzioni, scelte,
  esclusioni}.
- **🗑 Svuota dati**: con conferma cancella i QUATTRO storage e ricarica —
  riparte pulita per la nuova edizione. Equivalente tecnico: `?reset=1`.
- **Foto**: ordine di priorità all'import (dal 09/10/2026): (1) la foto
  della cartella `…_files` del salvataggio «Pagina web, completa»,
  incorporata come DATA URL 200 px (pulsante «🖼 Cartella foto», input
  `webkitdirectory`); (2) asset di riserva `assets/ohn-<codice>.jpg` (HEAD
  con cache:no-store); (3) niente. **L'URL remoto**
  `…/location/fotolocation/<nome>` NON si usa più: openhousenapoli.org
  filtra con 403 le richieste senza User-Agent da browser (verificato con
  curl: 403 senza UA, 200 con UA, «Failed to fetch» dal browser). I data
  URL viaggiano dentro `mytour-dati-importati-v1` e funzionano offline/PC
  ↔ mobile via Esporta stato.
- **Contatori/filtri**: filtro giornata (Tutti · Ven 2 · Sab 3 · Dom 4,
  etichette in index.html), lista ordinata per primo orario nelle viste di
  giorno, orari del solo giorno scelto su card/popup, riepilogo conflitti a
  gruppi (BFS, una riga per gruppo), marker verdi (scelti) / arancio
  (aperti solo quel giorno e ≤ 500 m da un luogo scelto, RAGGIO_VICINI_M),
  popup snellito, mappa ↔ lista, deep link `?vai=<id>`.
- Pubblicata su **https://myohntour.pages.dev** (Cloudflare Pages,
  deploy automatico da GitHub su push a main). Nessun backend, nessun npm.

## Struttura (file nella RADICE di ohn)

- `index.html` — header, #adminBar, #posizionaBanner, layout (mappa+lista).
- `style.css` — dark responsive; media query ≤980px impila le colonne.
- `app.js` — tutta la logica (moduli ES).
- `data.js` — `export const luoghi = []` (vuoto: commento spiega).
- `assets/` — miniature `ohn-<codice>.jpg` (+ quelle dell'OCR storico).
- `mytour.png` — sorgente OCR storica (non richiesta dal sito).
- `_strumenti/` — utility di build (geocode.py, importa_preferiti.py,
  confronta_export.py, risultati.json): innocue se pubblicate.
- `README.md` — funzionamento attuale, avvio, deploy, nuova edizione.
- `.gitignore`: `.freebuff/`, `mytour.png`, `_strumenti/*.html`.

## Storage (localStorage)

| chiave | contenuto |
| --- | --- |
| `mytour-dati-importati-v1` | dati risultanti dall'ultimo import |
| `mytour-mappa-correzioni-v1` | correzioni (coordinate posizionate, testi) |
| `mytour-scelte-per-giorno-v1` | segnalibri per giornata {ven,sab,dom} |
| `mytour-esclusioni-v1` | esclusioni per giornata {ven,sab,dom} |

Chiavi vecchie NON più usate: `mytour-scelte-v1` (globale),
`mytour-tappe-eliminate-v1` (modello per-dispositivo del 04/10).

## Import (dettagli implementativi)

- **Import a due zone** (dal 10/10/2026): nella barra admin le due zone
  tratteggiate — 1) «🖼 Cartella foto» **opzionale** (input `webkitdirectory`:
  la cartella `…_files` di Ctrl+S) e 2) «📄 File HTML «My tour»»
  (fondamentale) — più il pulsante **«⬇ Esegui import»** che lancia l'import
  con entrambe le selezioni. Le zone mostrano lo stato corrente (
  «✅ N foto pronte» / «✅ nomefile.html»); a import riuscito le selezioni si
  consumano e le zone tornano vuote. Il solo file HTML = import valido senza
  miniature (niente foto rotte; fallback `assets/ohn-<codice>.jpg`).
- **Niente più coda di posizionamento automatica** all'import (dal
  10/10/2026, richiesta utente: l'import non deve aspettare la mappa):
  `riepilogoImport` mostra SOLO il banner di riepilogo con l'avviso ⚠ dei
  luoghi non trovati + l'istruzione 🎯 («usa il pulsante 🎯 sulla card»),
  autochiudente. Il meccanismo a coda resta per il posizionamento manuale
  da singola card (🎯 → riprova Nominatim → click mappa, Salta/Annulla, Esc).
- **📄 Importa HTML** è l'unica strada per i dati (dal 09/10/2026): il vecchio «🌐
  Importa dal sito» (fetch di `preferiti.php` con `credentials:"include"`)
  è stato RIMOSSO — openhousenapoli.org non manda header CORS, quindi da
  myohntour.pages.dev (e da qualunque altro dominio) il browser blocca la
  lettura della risposta stessa se la sessione è valida: la
  same-origin policy decide in base all'ORIGINE che chiede, non alla
  sessione. La via affidabile: l'utente salva la pagina «My tour» dal
  browser (Ctrl+S, «Pagina web, completa») e l'app la legge da file
  (lettura permessa perché il file è scelto esplicitamente dall'utente).
  Il flusso è documentato nei title delle zone, nel messaggio d'errore
  «nessun luogo riconosciuto» e nel README.
- Parser `estraiLuoghiDaHTML` (per ogni `<tr>`:
     `<b>` titolo + link `location.php?l=<n>` che lo CONTIENE; indirizzo e
     orari dai segmenti separati da `<br>`; foto dal nome file della src
     locale). Match per `normalizzaTitolo` (NFD, niente accenti, uppercase).
- Luoghi nuovi: geocodifica `geocodifica()` (Nominatim, 2 varianti «, Napoli»
  / «, Napoli, Italia», countrycodes=it, pausa 1100 ms). Import da file
  reale: 26 luoghi (2 nuovi: l=490 geocodificato, l=502 senza coordinate —
  poi posizionato a mano).
- Import = aggiorna when/address, aggiunge i nuovi, RIATTACCA le foto
  mancanti; non rimuove mai nulla.

## Accessi speciali (link)

- `?vai=<id>` — deep link: centra il punto e apre il popup.
- `?reset=1` — TECNICO: azzera i quattro storage e ricarica.
- `?impostazioni=1` (storico `?verifica=1` compatibile) — apre l'app già in
  modalità admin (barra visibile e coda di posizionamento offerta se ci sono
  luoghi senza coordinate). Combinabile: `?impostazioni=1&vai=<id>`.

## Ambiente locale

- `python -m http.server 8123` DA `D:\coding\ohn` (moduli ES non girano in
  `file://`). NB cache browser sui moduli: dopo una modifica di app.js/
  data.js serve reload forzato (Ctrl+F5) o query string nuova.
- Il server usato nelle chat gira già su http://127.0.0.1:8123/.

## Deploy Cloudflare Pages

- ATTIVO: progetto Git-connected `ubiquaedu/ohntour` →
  **https://myohntour.pages.dev**. Ogni push su `main` = deploy (≈1 min).
- Precedente: Direct Upload **ohn26** (https://ohn26.pages.dev) — dati
  vecchi, NON aggiornarlo più.

## Repository git

- Remote `origin` = `https://github.com/ubiquaedu/ohntour.git` (pubblico);
  `main` traccia `origin/main`; push via https con Git Credential Manager.
- Commit e push SOLO su richiesta esplicita dell'utente.

## Storia (sintesi, in ordine)

- **Nascita (26/09–02/10)**: lista da OCR di `mytour.png` (30 luoghi edizione
  2026), verifica in pagina 30/30, coordinate pre-calcolate con
  `_strumenti/geocode.py` (2 casi a mano: MEA DOMUS Mergellina, EDUCANDATO
  dal sito ufficiale; punto 16 posizionato a fine via De Gasperi). Primo
  commit `c4ee6ce`, repo su GitHub.
- **Rinomina (03/10)**: «My OHN Tour»; tolte le etichette dell'edizione.
- **Conflitti (03–04/10)**: riepilogo unico a GRUPPI (componenti connesse)
  sopra la lista, una riga per gruppo, nomi cliccabili; segnalibro al posto
  della stella (SVG inline); mail di contatto in header; mobile: lista a
  pagina intera; password più larga su mobile.
- **Import come fonte primaria (07/10)**: `mytour-dati-importati-v1`;
  preferiti.php / file HTML; import aggiornava orari/indirizzi e aggiungeva
  località nuove (geocodificate); ✕ cancellava NEI DATI (poi superato);
  esporta/importa stato; foto via convenzione assets/ohn-<codice>.jpg
  (ohn-490 e ohn-502 aggiunte a mano, scaricate con UA browser e ridotte a
  200px). OCR rimosso dall'app (pannello «⚙ Impostazioni»).
- **Redesign (08/10)**: pannello a schermo pieno eliminato; TUTTO nella
  pagina principale; barra admin sotto l'header; coda di posizionamento con
  banner; foto automatiche dall'HTML (URL ricostruito); esportazioni ridotte
  (via luoghi-verificati.json); `?reset=1`.
- **Per la nuova edizione (08/10, push)**: data.js svuotato; ✕ = esclusa
  solo dal giorno selezionato (correzione della versione «piano per giorni»
  che escludeva troppo); ↺ Ripristina; esclusioni per giornata (v2 dello
  stato); 🗑 Svuota dati; barra admin in alto (mobile); layout ripristinato
  (il tag `<main class="layout">` era caduto inserendo la barra); README
  riscritto sul modello attuale; posizionamento: prima Nominatim (indirizzo
  e titolo) poi click sulla mappa; `inquadraTutti()` protetto da liste senza
  coordinate.

## Idee discusse ma NON implementate

- Template riutilizzabile per future mappe (geocode.py da CSV).
- Versione stampabile della lista raggruppata per giornata.
- Script che scarica automaticamente le foto `ohn-<codice>.jpg` dal sito.

## Storia delle chat

- Parte del lavoro è stata fatta in un thread aperto PER ERRORE sul progetto
  imgclassify (stesso contenuto, altra cartella). Questo file è la memoria
  ufficiale del progetto per le chat successive: collegalo insieme a
  `D:\coding\ohn` e a `D:\coding\agents.md`.
