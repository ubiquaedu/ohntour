# My OHN Tour — Mappa personalizzata per Open House Napoli

Mini app web statica: **mappa OpenStreetMap** (Leaflet) dei luoghi del tour
Open House Napoli. **La fonte dei dati è l'IMPORT**: preferiti direttamente
dal sito Open House (o dal file HTML «My tour» salvato dal browser). L'app
non contiene riferimenti all'edizione: luoghi, date e orari cambiano a ogni
edizione e vivono solo nei dati importati (`data.js` è vuoto: seed di
riserva, non usato quando esiste un import).

## Contenuti

```
ohn/
├── index.html          # pagina: header + barra admin + mappa + lista
├── style.css           # stile (dark, responsive fino a smartphone)
├── app.js              # logica: mappa, lista, filtro giornata, tour, import, esclusioni
├── data.js             # vuoto di proposito (solo per un avvio SENZA import)
├── assets/             # miniature: ohn-<codice>.jpg dei luoghi importati
└── _strumenti/         # utility di build (non pubblicate, innocue se caricate)
```

## Avvio locale

I moduli ES non funzionano aprendo il file con doppio clic (`file://`): serve un
piccolo server statico.

```
cd D:\coding\ohn
python -m http.server 8123
```

poi apri http://localhost:8123/ — oppure con l'estensione Live Server di VS Code.

## Come funziona

### Vista pubblica (senza password)

- **Mappa a sinistra, lista a destra** (su mobile impilate, mappa sopra).
- **Ricerca** per titolo/indirizzo/orari e **filtro per giornata**
  («Tutti», «Ven 2», «Sab 3», «Dom 4»): nasconde card e marker degli altri
  giorni; con una giornata selezionata la lista è **ordinata per orario di
  apertura** e card e popup mostrano **solo gli orari di quel giorno**.
- **Segnalibro (tour personale) per giornata**: con una giornata selezionata,
  il segnalibro sulla card aggiunge il luogo al piano **di quel giorno**.
  Salvato nel browser (`localStorage`, `mytour-scelte-per-giorno-v1`),
  sopravvive alla ricarica. Contatore «nel tour: N» e «↺ Reset stelle».
- **Avvisi di conflitto orario**: riepilogo unico sopra la lista — una riga
  per GRUPPO di luoghi in conflitto (sovrapposizione o meno di 30 minuti di
  margine, `MARGINE_CONFLITTO_MIN` in testa ad `app.js`), nomi cliccabili.
- **Marker arancio «vicini da non perdere»**: con una giornata selezionata e
  almeno un segnalibro, i luoghi NON scelti aperti **solo quel giorno** e
  distanti **≤ 500 m** da un luogo scelto diventano arancioni; i scelti
  diventano **verdi**; gli altri restano blu.
- **Popup snellito**: nome, indirizzo, link Google Maps, «🏛 Scheda
  ufficiale OHN», nota 🟠 per i candidati. Foto, orari e conflitti restano
  sulla card.
- **Mappa ↔ lista**: clic su un marker scorre la lista alla card (e la fa
  lampeggiare); «📍 Vai» fa il contrario.
- Deep link per condividere un punto: `?vai=<id>`.

### Strumenti admin (password «26» nel campo 🔒 in alto)

Dopo lo sblocco compaiono, **sotto l'header** (raggiungibili anche su mobile):

- **🌐 Importa dal sito**: scarica i preferiti direttamente da
  openhousenapoli.org (richiede l'accesso già fatto in quella finestra; se il
  sito blocca il CORS si segnala e si usa l'import HTML).
- **📄 Importa HTML**: legge il file «My tour» salvato come HTML dal browser.
  L'import ha priorità sui dati: aggiorna orari/indirizzi, aggiunge le
  località nuove e riporta le foto (miniatura locale `assets/ohn-<codice>.jpg`
  se esiste, altrimenti l'URL della foto sul sito ricostruito dal file).
- **Posizionamento guidato**: finito l'import, per ogni luogo senza
  coordinate l'app tenta PRIMA la geocodifica Nominatim (indirizzo, poi
  titolo). Solo se non trova nulla chiede il click sulla mappa («clicca il
  punto esatto», Salta/Annulla). I luoghi rimasti in sospeso restano in fondo
  alla lista con 🎯 **Posiziona**.
- **✕ = esclusa SOLO dal giorno selezionato**: nelle viste di giornata la ✕
  toglie la località dal piano **solo di quel giorno** (reversibile). I
  segnalibri degli altri giorni restano e non vengono mai toccati.
- **↺ Ripristina**: le località escluse appaiono in fondo alla lista (bordo
  rosso, solo admin); ↺ le rimette nel piano del giorno della vista, o di
  tutti i giorni nella vista «Tutti».
- **⬇ Esporta stato / ⬆ Importa stato**: JSON con dati importati, correzioni,
  segnalibri ed esclusioni — per trasferire tutto da PC a mobile.
- **🗑 Svuota dati**: con conferma cancella TUTTI i dati locali (import,
  correzioni, segnalibri, esclusioni): l'app riparte vuota, pronta per
  l'import della nuova edizione.
- Click sul campo 🔒 sbloccato per ribloccare; al refresh si torna bloccati.

### Storage (localStorage)

| chiave | contenuto |
| --- | --- |
| `mytour-dati-importati-v1` | dati risultanti dall'ultimo import |
| `mytour-mappa-correzioni-v1` | coordinate posizionate a mano (e testi) |
| `mytour-scelte-per-giorno-v1` | segnalibri per giornata |
| `mytour-esclusioni-v1` | esclusioni per giornata (la ✕) |

Diagnostica: `?reset=1` azzera tutto i dati e ricarica (equivalente a «🗑
Svuota dati», senza conferma).

## Pubblicazione su Cloudflare Pages

La cartella è tutta statica: si pubblica senza build. **Il sito è online su
https://myohntour.pages.dev.**

**Deploy automatico da GitHub (attivo)**: il repository
https://github.com/ubiquaedu/ohntour (branch `main`) è collegato a un
progetto Cloudflare Pages Git-connected: **ogni push su `main` produce un
nuovo deploy automatico** (circa un minuto). Basta commit+push.

Direct Upload (alternativa): dash.cloudflare.com → Workers & Pages → Pages →
Upload assets, trascinare l'intera cartella.

## Nuova edizione

1. **🗑 Svuota dati** (barra admin): l'app riparte pulita.
2. **Import** (dal sito o file HTML «My tour»): la lista e la mappa si
   riempiono; le località nuove vengono geocodificate (Nominatim, con
   ripiego sul titolo); le foto arrivano da `assets/ohn-<codice>.jpg` o
   dall'URL del sito. Se un luogo resta senza coordinate, 🎯 + click sulla
   mappa (o l'import lo trova da solo al prossimo giro).
3. Allinea in `index.html` le etichette dei pulsanti delle giornate
   («Ven 2 · Sab 3 · Dom 4»): i tasti restano gli stessi, cambia il testo.
4. Costruisci il piano con i segnalibri per giornata; usa ✕ per escludere
   le località che non puoi visitare (e ↺ se cambi idea).

### Immagini dei luoghi importati

Convenzione: se in `assets/` esiste **`ohn-<codice>.jpg`** (codice = numero
`l=` della scheda, es. `ohn-490.jpg` per la scheda `location.php?l=490`),
l'import la aggancia automaticamente al luogo. Se manca, l'import usa
l'URL della foto sul sito ricostruito dal file HTML. Per una miniatura
locale: apri la scheda del luogo su openhousenapoli.org, scarica la foto
principale (`/location/fotolocation/<codice>_*.jpg`), riducila a 200px di
larghezza e salvala come `assets/ohn-<codice>.jpg`.
