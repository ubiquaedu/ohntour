# My Tour — Mappa dei luoghi (Open House Napoli 2026)

Mini app web statica: **mappa OpenStreetMap** (Leaflet) con i 30 luoghi dell'itinerario
«My Tour» (2–4 ottobre 2026), estratti via OCR da `mytour.png` e **verificati
dall'utente in pagina** (pannello Verifica OCR, 30/30 confermati).

## Contenuti

I file dell'app sono nella radice di `D:\coding\ohn` (insieme all'immagine
sorgente `mytour.png`):

```
ohn/
├── index.html          # pagina: ricerca + mappa + lista + pannello verifica
├── style.css           # stile (dark, responsive fino a smartphone)
├── app.js              # logica: mappa, lista, popup, filtro giornata, tour, verifica OCR
├── data.js             # i 30 luoghi: titolo, indirizzo, orari, coordinate
├── assets/             # miniature ritagliate da mytour.png
├── mytour.png          # immagine sorgente dell'OCR (non richiesta dal sito)
└── _strumenti/         # utility di build (non pubblicate, innocue se caricate)
    ├── geocode.py      # geocodifica Nominatim dei 30 indirizzi
    └── risultati.json  # esiti del geocoding
```

## Avvio locale

I moduli ES non funzionano aprendo il file con doppio clic (`file://`): serve un
piccolo server statico.

```
cd D:\coding\ohn
python -m http.server 8123
```

poi apri http://localhost:8123/ — oppure con l'estensione Live Server di VS Code.

## Funzioni

- **Mappa con due strati base**: OpenStreetMap e **satellite** (Esri World
  Imagery), selezionabili dal riquadro in alto a destra — utile in fase di
  verifica per posizionare a mano i segnalatori.
- 30 puntatori con coordinate pre-calcolate con Nominatim in fase di build
  (nessun geocoding al volo quando usi l'app); il segnalatore di «I (NON)
  LUOGHI DEL PORTO» è a fine via De Gasperi, all'incrocio con Piazza Municipio.
- **Lista affiancata** con ricerca (titolo/indirizzo/orari) e pulsante «📍 Vai»
  che centra il punto e apre il popup con miniatura, indirizzo e orari completi.
- **Filtro per giornata**: pulsanti «Tutti · Ven 2 · Sab 3 · Dom 4» sopra la
  lista; nascondono le card e i marker degli altri giorni e si combinano con
  la ricerca. «Reset filtri» azzera ricerca e giornata. Con una giornata
  selezionata la lista è **ordinata per orario di apertura** (il luogo che
  apre prima quel giorno sta in cima) e card e popup mostrano **solo gli
  orari di quel giorno**: per i luoghi aperti più giorni (es. sabato e
  domenica) non compare la parte degli altri giorni. Nella vista «Tutti»
  l'ordine resta alfabetico e gli orari sono completi.
- **Tour personale (★) per giornata**: con una giornata selezionata (Ven 2 ·
  Sab 3 · Dom 4), il pulsante a stella sulla card aggiunge il luogo al tour
  **di quel giorno**: passando a un altro giorno la stella non appare (e i
  suoi conflitti nemmeno), a meno di metterla anche lì. La selezione resta
  salvata nel browser (`localStorage`, chiave `mytour-scelte-per-giorno-v1`)
  e sopravvive alla ricarica della pagina. Nella vista «Tutti» le stelle non
  compaiono; con almeno una stella attiva si vedono il contatore («★ sabato:
  N» col giorno attivo, «★ nel tour: N» come somma in «Tutti») e il pulsante
  **«↺ Reset stelle»** (con conferma) che rimuove le stelle di tutti i giorni
  in un colpo solo. Nelle viste di giorno ogni card ha anche il pulsante
  **«✕»** accanto alla stella: rimuove il luogo dal tour di **tutti i giorni**
  in una volta (con conferma), anche se il luogo non è stellato nel giorno
  corrente; senza stelle non fa nulla. Il tasto «✕» è **sotto password**:
  compare solo dopo aver digitato **26** nel campo «🔒 Password» in alto a
  destra (Invio conferma); sbagliata il campo trema, giusta diventa «🔓».
  Cliccando il campo sbloccato si riblocca; aggiornando la pagina si torna
  bloccati comunque.
- **Avvisi di conflitto orario a livello di giornata**: con un giorno
  selezionato (Ven 2 · Sab 3 · Dom 4), un avviso giallo su card e popup
  segnala quando due visite di QUEL giorno si sovrappongono o si susseguono
  con meno di 30 minuti di margine (costante `MARGINE_CONFLITTO_MIN` in testa
  ad `app.js`). I confronti riguardano i luoghi scelti con ★ **e** i
  candidati arancio (aperti solo quel giorno, vicini al tour). Contatore
  «⚠ N in conflitto» sopra la lista; nella vista «Tutti» gli avvisi non
  compaiono.
- **Popup snellito**: il popup del marker mostra nome, indirizzo, link
  Google Maps, **«🏛 Scheda ufficiale OHN»** (info di accesso e visita sul
  sito openhousenapoli.org) e la nota 🟠 dei candidati; foto, orari e avvisi
  di conflitto restano sulla card della lista.
- **Import dei dati ufficiali** (`_strumenti/importa_preferiti.py`): dal
  salvataggio HTML della pagina «My tour» del sito OHN estrae i 30 luoghi,
  li confronta con `data.js` (titolo normalizzato) e riporta le differenze
  di indirizzo/orari; con `--scrivi` aggiunge il campo `url` ufficiale a
  ogni voce (idempotente). Procedura per i prossimi aggiornamenti: salva la
  pagina preferiti come HTML → `python _strumenti/importa_preferiti.py
  [percorso] [--scrivi]` → correggi le differenze segnalate.
- **Mappa → lista**: cliccando un segnalino, la lista scorre fino alla card
  di quel luogo e la fa lampeggiare in giallo per un attimo (utile su mobile,
  per non cercarla a mano); il flusso inverso resta il pulsante «📍 Vai».
- **«Apri in Google Maps»**: in ogni popup del marker, il link apre Google
  Maps con le indicazioni stradali verso le coordinate del punto.
- **Marker arancio «vicini da non perdere»**: con una giornata selezionata e
  almeno una stella nel tour, i segnalini dei luoghi NON scelti che sono
  aperti **solo quel giorno** e distano **≤ 500 m** da un luogo scelto
  diventano arancioni e pulsano: se li salti quel giorno li perdi, quindi
  sono le candidate naturali per «dopo la visita». I luoghi già scelti con ★
  diventano **verdi**, gli altri restano blu. Legenda 🟠 accanto ai filtri e
  nota nel popup; tolta la stella (o cambiando giorno) tutto torna blu. Nota:
  due luoghi nello stesso edificio (es. ATELIER AMBRA e INTERNO 6 a Palazzo
  Mannajuolo) hanno pin sovrapposti: quello visibile può essere l'altro.
- Orari e fasce per il filtro e i conflitti derivano dal campo `when` di
  `data.js` (con giorno ereditato dalle fasce successive, deduplica e
  tolleranza ai testi non interpretabili, che restano sempre visibili).
- **Pannello «🔍 Verifica OCR»**: strumento di verifica usato in fase di build
  (tutti i 30 punti confermati). NON è nell'interfaccia pubblica: si accede
  solo con il link **`?verifica=1`** (es. `https://ohn26.pages.dev/?verifica=1`),
  che ricrea il pulsante in alto e apre il pannello; le modifiche fatte lì
  restano nel browser (`localStorage`) e si applicano a mappa, lista e popup.
  Anche il contatore «✓ verificato» in barra appare solo in questa vista
  riservata, non nel sito pubblico.
- **Esporta dati verificati (JSON)**: produce il file con le correzioni da
  ricopiare dentro `data.js` quando la verifica è conclusa.
- **Ripristina originali**: riporta i dati OCR di partenza.
- Nessuna funzione di eliminazione: la lista è di sola consultazione.
- Deep link per condividere un punto: `?vai=<id>`
  (es. `https://ohn26.pages.dev/?vai=16-i-non-luoghi-porto`).
- Combinabili: `?verifica=1&vai=<id>` apre il pannello e poi centra il punto.

## Pubblicazione su Cloudflare Pages (dopo la verifica OCR)

La cartella è tutta statica: si pubblica senza build.

**Metodo Direct Upload (consigliato, senza riga di comando)**

1. Vai su https://dash.cloudflare.com → **Workers & Pages** → **Create** →
   scheda **Pages** → **Upload assets** (caricamento diretto).
2. Nome del progetto: per esempio `fuori-porta` (diventerà
   `https://fuori-porta.pages.dev`).
3. Trascina **l'intera cartella** `D:\coding\ohn` (Cloudflare pubblica il
   contenuto: index.html, style.css, app.js, data.js, assets/; mytour.png,
   README.md e _strumenti/ vengono caricati ma sono innocui).
4. **Deploy site**: dopo pochi secondi il sito è online sull'URL indicato.

**Alternativa con la CLI (opzionale)**

```
npm install -g wrangler
wrangler login
cd D:\coding\ohn
wrangler pages deploy . --project-name ohn26
```

Per aggiornare i dati dopo la verifica: modifica `data.js` (o sostituiscilo con
l'export JSON convertito in `export const luoghi = [...]`), controlla in locale
e ripeti il deploy (con Direct Upload basta ricaricare i file nello stesso
progetto: nasce un nuovo deployment).

**Repository del codice**: https://github.com/ubiquaedu/ohntour (branch `main`,
remoto `origin` del repo locale). Collegando questo repository a Cloudflare
Pages il push diventerebbe deploy automatico: per ora il deploy resta manuale
con Direct Upload.

## Verifica OCR — esito

Verifica completata in pagina dall'utente: **30/30 punti confermati** senza
modifiche (export JSON del pannello confrontato con `data.js`: nessuna
differenza). Il segnalatore di «I (NON) LUOGHI DEL PORTO» è stato posizionato
a mano a fine via De Gasperi, incrocio con Piazza Municipio.
