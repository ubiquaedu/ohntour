# Memoria progetto — App web «My OHN Tour» (D:\coding\ohn)

> File di memoria per le chat AI: leggere PRIMA di intervenire. Le regole
> generali valide per tutte le app sono in `D:\coding\agents.md` (rispondere
> SEMPRE in italiano, mai pubblicare `.freebuff/`, ecc.). Avvio locale e
> pubblicazione sono descritti nel `README.md`; qui c'è tutto il resto.

## Cosa è

- Mini app web **statica** «My OHN Tour»: mappa OpenStreetMap (Leaflet 1.9.4 via
  CDN) con i **30 luoghi** dell'itinerario «Fuori Porta» di Open House Napoli
  2026 (2–4 ottobre), estratti via OCR dall'immagine `mytour.png` e **verificati
  dall'utente in pagina (30/30 confermati)**.
- **Rinomina (03/10)**: l'app si chiama **«My OHN Tour»** (nome scelto
  dall'utente; descrizione: «Mappa personalizzata per Open House Napoli»).
  Aggiornati titolo pagina, header, README e commenti. Restano INVARIATI le
  chiavi `localStorage` `mytour-*`, il file `mytour.png` e la pagina «My
  tour» di openhousenapoli.org (nomi funzionali/esterni).
- **Generalizzazione per il riuso (03/10, richiesta esplicita)**: l'app è
  pubblica su GitHub e va riusata nelle prossime edizioni: tolti i riferimenti
  DESCRITTIVI a quest'anno e al numero dei luoghi (brand-sub in index.html,
  intro e testi del README, commenti; la regex del prefisso del giorno in
  `testoWhenDelGiorno` non fissa più «ottobre»). Restano INTATTI i dati
  funzionali dell'edizione corrente (date e orari nei `when` di data.js), i
  pulsanti «Ven 2 · Sab 3 · Dom 4» (funzionali: per la nuova edizione cambia
  solo l'etichetta) e gli URL. README con nuova sezione «Nuova edizione».
- **Bug conflitti duplicati (03/10, segnalazione utente)**:
  `conflittiPerLuogo` aggiungeva un avviso PER OGNI COPPIA di fasce
  sovrapposte: con due luoghi da due fasce nello stesso giorno (es. ODEON e
  TEATRO ANTICO, 10–13 | 15–18) la STESSA località compariva più volte nella
  card. Ora una Map raggruppa per `idAltro` (fasce accumulate in
  `fasceA`/`fasceB`) e `testoConflitto` deduplica gli intervalli e declina al
  plurale («10:00–13:00 e 15:00–18:00 vanno in conflitto con…»). Verificato
  nel browser: un avviso per località, contatore «⚠ N in conflitto» invariato
  (conta i luoghi).
- **Deploy Git-connected attivo (04/10)**: l'utente ha collegato il repo
  GitHub `ubiquaedu/ohntour` a un nuovo progetto Cloudflare Pages →
  **https://myohntour.pages.dev** (ogni push su main = deploy automatico).
  Il vecchio progetto Direct Upload «ohn26» (https://ohn26.pages.dev) resta
  online con dati vecchi: NON aggiornarlo più.
- **Mail di contatto sotto il titolo (04/10)**: in index.html nella `.brand`,
  sotto la `.brand-sub`, nuovo link `.brand-mail` (mailto:ubiqua.edu@gmail.com),
  stile discreto in style.css (muted 11px, hover sottolineato). Commit b84e6db,
  verificato sul sito live.
- **Riepilogo unico dei conflitti (04/10, richiesta esplicita)**: con molte
  stelle gli avvisi di conflitto si ripetevano in più card allungando troppo
  la lista. Tolto il box `.card-conflitto` dalle card: ora un UNICO pannello
  `#riepilogoConflitti` in testa alla lista (prima dei filtri di giornata)
  mostra una RIGA PER COPPIA di luoghi (dedup per coppia non ordinata: la
  coppia A/B e B/A diventa una riga sola, fasce riattribuite al lato giusto),
  con i nomi cliccabili (`data-vai-conflitto` → `vaiAlLuogo`) e pulsante
  «Nascondi» (`riepilogoChiuso`, NON persistito: ogni `refreshConflitti()` —
  stella o cambio giornata — lo resetta e il pannello riappare). Visibile
  solo con giornata selezionata e almeno un conflitto; nascosto in «Tutti».
  Commit ab15ef8, verificato nel browser (ODEON/GARIBALDI/BASILICA).
- **Estetica (04/10, richieste esplicite)**:
  - **Segnalibro al posto della stella**: nelle card SVG inline
    `SEGNALIBRO_SVG` (currentColor, `.star-btn` acceso/spento invariato di
    logica e classi); nel contatore tour `tourCountEl.innerHTML` con l'SVG
    («🔖 sabato: N») + CSS `.stato-tour .icona-segnalibro` per l'allineamento.
    Confirm di reset parla di «segnalibri».
  - **Riepilogo**: intestazione SENZA ⚠ («Conflitti d'orario — giorno», il ⚠
    resta SOLO sulle righe); testo «in conflitto con» (prima «confligge con»).
  - **Password su mobile**: `.pass-admin` 150px nel media query ≤980px
    (a 92px l'ultimo pallino era tagliato e il 🔓 non si leggeva; sbloccato
    resta 64px anche su mobile). Sblocco testato con keydown Enter.
- **Riepilogo a gruppi, zero duplicati (04/10, richiesta esplicita)**: prima
  ogni coppia era una riga («BASILICA ✕ GARIBALDI», «BASILICA ✕ ODEON»…):
  con più fasce/stelle gli stessi nomi si ripetevano e confondevano. Ora
  `aggiornaRiepilogoConflitti` costruisce il grafo NON orientato dei
  conflitti tra stellati ed estrae le COMPONENTI CONNESSE (BFS): UNA riga
  per gruppo, formato «⚠ SOGGETTO in conflitto con ALTRO e ALTRO» (soggetto =
  luogo col più alto grado del gruppo, a parità il primo nei dati; elenco
  ordinato per posizione in data.js, congiunzioni «e»/«,»). Nomi cliccabili
  (vaiAlLuogo). Il pannello si aggiorna a ogni stella: con 2 stelle una
  riga, con la terza che tocca entrambe la riga resta una sola. Verificato
  nel browser (ODEON/GARIBALDI/BASILICA).
- **Mobile: lista a pagina intera (04/10, segnalazione utente)**: su schermi
  ≤980px la colonna lista NON è più fissa a 60vh con scroll interno (il
  riepilogo conflitti comprimeva `.list` finché non scorrava più): ora
  `.list-wrap`/`.list` sono height/overflow auto-visible e la PAGINA scrolla
  naturalmente fino all'ultima card. Su desktop resta lo scroll interno.
  Commit 63742f8, verificato con viewport 390×844.
- **✕ = cancella tappa — MODELLO VECCHIO (04/10), SUPERATO il 07/10** (storia:
  chiarimento dell'utente: «almeno a livello locale in questa lista dovrebbe
  essere cancellata»): il pulsante «✕» (admin, password «26») NON «toglie dal
  tour» ma CANCELLA la tappa dalla lista di QUESTO browser (per dispositivo,
  nessun sync). Chiave `mytour-tappe-eliminate-v1` (STORAGE_ELIMINATE, Set
  `eliminate`, `salvaEliminate()`), `datiCorrenti()` filtrava
  `!eliminate.has(id)`, `datiCompleti()` senza filtro, ripristino da
  `?verifica=1`. → **SOSTITUITO dal modello «cancellazione nei dati» descritto
  nella sezione «Import come fonte primaria» più sotto** (chiave
  `mytour-dati-importati-v1`); la vecchia chiave non viene più letta né scritta.
- Pubblicata su **https://myohntour.pages.dev** (Cloudflare Pages, deploy
  automatico da GitHub; prima edizione: https://ohn26.pages.dev, Direct Upload).
- Nessun backend, nessuna dipendenza npm: solo file statici. La lista resta di
  sola consultazione per il visitatore: la cancellazione è riservata all'admin
  (vedi «Import come fonte primaria» più sopra).
- **Filtro per giornata** (Tutti · Ven 2 · Sab 3 · Dom 4): nasconde le card E i
  marker degli altri giorni (scelta utente), combinabile con la ricerca; NON
  persistito — all'avvio è sempre «Tutti», così i deep link `?vai=` funzionano.
  Nelle viste di giornata le card sono ordinate per il PRIMO orario del giorno
  presente nei dati (prima fascia di quel giorno; orari non interpretabili in
  fondo); in «Tutti» l'ordine resta alfabetico (quello di `data.js`). Card e
  popup nelle viste di giorno mostrano SOLO le fasce del giorno scelto
  (`testoWhenDelGiorno`): i 12 luoghi aperti più giorni non fanno più vedere
  la parte degli altri giorni (es. «Domenica…» sotto Sabato), che sembrava un
  conflitto appartenere al giorno dopo — segnalazione dell'utente del 26/09.
- **Tour personale PER GIORNATA** (26/09, richiesta esplicita: «se ho scelto
  la stella il sabato vuol dire che lo visito di sabato»): il pulsante ★ si
  vede e si usa SOLO con una giornata selezionata e vale per QUEL giorno —
  passando a un altro giorno la stella (e i suoi conflitti) non appare, a
  meno di metterla anche lì. Le scelte stanno in `localStorage` con la chiave
  `mytour-scelte-per-giorno-v1` (`{ven:[], sab:[], dom:[]}`; la vecchia
  chiave globale `mytour-scelte-v1` non è più letta) e sopravvivono alla
  ricarica. Contatori: «★ sabato: N» col giorno attivo, «★ nel tour: N»
  (somma) in «Tutti»; il pulsante «↺ Reset stelle» (con conferma) svuota
  TUTTI i giorni. Le stelle appaiono/scompaiono al volo al cambio di giorno.
  Nelle viste di giorno ogni card ha anche il pulsante «✕» (sotto password,
  funziona ANCHE senza stella). COMPORTAMENTO CAMBIATO il 04/10: non «rimuove
  dal tour» ma CANCELLA la tappa dalla lista del browser — vedi «✕ = cancella
  tappa in locale» più sopra.
- **✕ sotto password** (01/10, richiesta esplicita prima del deploy: «mettere
  sotto password il tasto di cancellazione»): il pulsante «✕» delle card
  appare SOLO dopo lo sblocco con il campo «🔒 Password» in alto a destra
  nella barra (`.pass-admin`), password **«26»** (costante `PASSWORD_ADMIN`
  in testa ad `app.js`) + Invio. Sbagliata → il campo trema (animazione CSS
  `passa-errore`) e si cancella; giusta → diventa «🔓» con bordo verde e le
  card mostrano «✕» nelle viste di giorno. Click sul campo sbloccato =
  riblocca. NON persistita in localStorage: al refresh si torna bloccati;
  l'amico che apre il sito vede solo il campo, senza ✕. `eliminaTappa`
  (ex `rimuoviDaTuttiIGiorni`) riverifica `adminSbloccato` per sicurezza.
- **Avvisi di conflitto orario** tra i luoghi scelti con ★, SOLO a livello di
  giornata (richiesta esplicita): con un giorno selezionato (Ven 2 · Sab 3 ·
  Dom 4) l'avviso giallo su card e popup segnala le coppie che si sovrappongono
  o si susseguono con meno di 30 minuti di margine (costante
  `MARGINE_CONFLITTO_MIN` in testa ad `app.js`; 30 minuti esatti NON sono
  conflitto), considerando SOLO le fasce di quel giorno; nella vista «Tutti»
  non ci sono avvisi. Contatori «⚠ N in conflitto» e «★ nel tour: N» sopra la
  lista; il meccanismo della stella è invariato (stesse scelte, stesso
  localStorage, live-update di card e popup al cambio giorno e al toggle ★).
- **«Apri in Google Maps» nel popup**: link a Google Maps Directions
  (`/maps/dir/?api=1&destination=<lat>,<lon>` con le coordinate verificate del
  punto), apre in nuova scheda (`target=_blank`, `rel=noopener`).
- **Popup snellito** (01/10, richieste esplicite: «togli foto e orari» poi
  «togli i conflitti dal popup»): il popup del marker mostra SOLO nome,
  indirizzo, link Google Maps e la nota 🟠 se il luogo è un candidato
  vicino; foto, orari e avvisi di conflitto restano sulla card della lista.
  Regredire solo su nuova richiesta esplicita.
- **Mappa → lista** (01/10, richiesta esplicita: «quando clicco il segnalino
  la lista non si sposta», utile soprattutto su mobile): all'apertura del
  popup di un marker la lista scorre fino alla card di quel luogo
  (`evidenziaCardLista`, scrollIntoView `block:"nearest"`) e la card
  lampeggia in giallo per ~2 s (`.card.evidenzia`). Click ripetuti: animazione
  riavviata via reflow. Card nascosta dai filtri: nessun scroll, nessun
  errore. Il flusso inverso resta «📍 Vai» (lista → mappa).
- **Ottimizzazione (01/10)**: `datiCorrenti()` è memoizzato in `cacheDati`
  (prima ricostruiva l'array di 30 luoghi a OGNI chiamata, e viene chiamata
  centinaio di volte per interazione); `parseOrari` è memoizzato per testo
  `when` in `cacheOrari` (prima ri-parseava con regex gli stessi testi);
  `distanzaMetri` è memoizzato per coppia di id in `cacheDistanze`; i marker
  cambiano icona SOLO se cambia lo stato (`marker.__statoPin`), così
  `setIcon` non rimonta il DOM dei 30 pin a ogni aggiornamento. Le tre cache
  si invalidano in `salvaCorrezioni()`, unico punto che cambia correzioni e
  coordinate (pannello verifica, spostamento su mappa, ripristino).
  Benchmark nel browser: ~9 ms per toggle ★, ~8 ms per cambio giornata.
  CSS morto rimosso (`.popup-img`, `.popup-conflitto`).
- **Import ufficiale da HTML preferiti (01/10)**: l'utente ha salvato la
  pagina «My tour» di openhousenapoli.org come HTML (Downloads). Nuovo
  script `_strumenti/importa_preferiti.py`: estrae i 30 luoghi (titolo,
  indirizzo, orari, codice `l=<n>` della scheda), li confronta con data.js
  per titolo normalizzato e con `--scrivi` aggiunge il campo `url` a ogni
  voce (idempotente). RISULTATO: 30/30 abbinati. PRECISAZIONE (03/10,
  richiesta dell'utente): i due cambi di orario NON erano errori OCR ma
  ORARI CAMBIATI DAGLI ORGANIZZATORI — SAN GENNARO ALL'OLMO era 16:30–19:30,
  ufficiale **10:30–13:30**; INTERNO 6 chiudeva 13:00, ufficiale **13:30**
  (i conflitti mostrati cambiano di conseguenza). MEA DOMUS resta volutamente diversa
  (prenotazione dom 11:00) e lo script la segnala ogni volta: normale.
  Campo `url` nel popup: bottone «🏛 Scheda ufficiale OHN» (rosso, accanto a
  Google Maps) che apre `location.php?l=<n>` con info di accesso e visita.
  PROCEDURA per i prossimi import: salva la pagina preferiti come HTML →
  `python _strumenti/importa_preferiti.py [percorso] [--scrivi]` → correggi
  le differenze segnalate a mano in data.js.
- **Conflitti estesi ai candidati arancio** (01/10, segnalazione utente:
  «INTERNO 6 non era segnalato in conflitto»): `conflittiPerLuogo` confronta
  ora gli orari di luoghi scelti con ★ E dei candidati arancio (aperti solo
  quel giorno e vicini a un luogo scelto), a entrambi i sensi (l'avviso
  appare sulla card/popup di entrambi). Storicamente i conflitti erano SOLO
  tra stellati — prima nella vista «Tutti», poi limitati alla giornata — la
  memoria dell'utente di «conflitti anche senza stella» riguardava il caso
  «Tutti» vecchio.
- **Marker arancio «vicini da visitare»** (01/10, richiesta esplicita: «se
  scelgo un luogo voglio che cambi colore al segnalino di quelli vicini che
  sono aperti solo quel giorno»): con una giornata selezionata e almeno una
  stella nel tour, i marker dei luoghi NON scelti che sono aperti SOLO quel
  giorno (tutte le fasce interpretabili su quel giorno; orari non
  interpretabili o multi-giorno = mai arancio) e distano ≤ 500 m
  (`RAGGIO_VICINI_M`) da un luogo scelto diventano arancioni e pulsano
  (divIcon custom con TRE stati: `.pin-blu` normale, `.pin-verde` scelto con
  ★ nella giornata selezionata, `.pin-arancio` con animazione CSS; i default
  di Leaflet non supportano la ricolorazione). Legenda «🟠 solo questo
  giorno, vicini al tour» accanto ai filtri, visibile solo se ce n'è almeno
  uno; nota 🟠 nel popup del luogo evidenziato. Ricolorazione in
  `aggiornaColoriMarker()`, chiamata da `applicaFiltroMarker()` (quindi anche
  al cambio giorno e al reset filtri), al toggle ★, a ✕ e al reset stelle.
  Funzione distanza: haversine in `distanzaMetri()`.
  NOTA (01/10, segnalazione utente): con ATELIER AMBRA stellato il pin
  arancio sembra «l'atelier» ma è INTERNO 6 / CARLA CELESTINO, nello STESSO
  palazzo (0 m, pin sovrapposti); i luoghi già scelti restano blu (ora verdi)
  perché l'arancio segnala solo i NON scelti. Il verde risolve l'ambiguità.
- **Vista pubblica «pulita»** (vedi anche «✕ sotto password» sopra): il
  contatore «✓ verificato» in barra è visibile
  SOLO nella vista riservata `?verifica=1` (nella vista pubblica lo span resta
  nel DOM ma con `hidden`, così non occupa spazio). Deciso dalla costante
  `accessoVerifica` in testa ad `app.js`.

## Import come fonte primaria + cancellazione NEI DATI (07/10/2026)

- **Modello attuale** (piano approvato con exit_plan): i dati vivono in
  `localStorage` alla chiave **`mytour-dati-importati-v1`**
  (STORAGE_IMPORTATI). `datiImportati` è null finché non c'è un import: allora
  `luoghiBase()` = `datiImportati ?? luoghi` (data.js resta il SEED).
  - `datiCorrenti()` = luoghiBase + correzioni, FILTRANDO i luoghi senza
    lat/lon (i nuovi importati senza coordinate non compaiono in mappa/lista
    ma restano nel pannello verifica per essere posizionati a mano).
  - `datiCompleti()` = luoghiBase + correzioni, senza filtro (pannello
    verifica, badge, export).
  - «✕» (admin «26») ora rimuove la tappa DA datiImportati (creandolo da
    data.js se null): la cancellazione vale su TUTTI i dispositivi ed è
    ripristinabile con l'import o con Esporta/Importa stato. Conferma:
    «Cancellare «NOME» dai dati del tour? La cancellazione vale per tutti i
    dispositivi; si può ripristinare con l'import (file HTML o preferiti.php)
    o dal pannello di verifica».
  - «↺ Ripristina originali» nel pannello verifica ora azzera SOLO le
    correzioni (i dati importati restano): conferma «Tornare ai DATI BASE
    attuali (import compreso)? Verranno eliminate le correzioni fatte nel
    pannello di verifica».
- **DUE strade di import** (pulsanti in `.verifica-actions`, pannello
  `?verifica=1`), che convergono su `applicaImport(estrazione)`:
  1. **«🌐 Importa dal sito»** (importSitoBtn): fetch di
     `https://www.openhousenapoli.org/location/preferiti.php`
     (PREF_DIRETTI) con `credentials: "include"`. Funziona solo se il browser
     è già autenticato su openhousenapoli.org in quella finestra. Da locale
     esce un errore CORS ATTESO (messaggio chiaro in importBox: «richiesta
     bloccata… usa Importa HTML»); da Cloudflare Pages l'utente lo proverà —
     se il sito risponde senza header CORS fallirà comunque: in quel caso la
     via file è quella affidabile.
  2. **«📄 Importa HTML»** (importFileBtn → importFileInput hidden,
     accept=.html,.htm): il file «My tour» (preferiti) salvato come HTML dal
     browser. PARSER `estraiLuoghiDaHTML(testo)`: per ogni `<tr>`, prende il
     `<b>` e il link `location.php?l=<n>` che lo CONTIENE (gli altri link sono
     l'immagine e il bottone ELIMINA con href preferiti.php?l=…a=del — non
     matchare quelli!); indirizzo/orari = segmenti del link separati da `<br>`
     (il `<b>` sta dentro un `<span class="uk-text-primary">`; usare
     textContent dei nodi, filtrando il titolo). Ritorna [{codice, titolo,
     indirizzo, quando, url}]. Testato con il file reale dell'utente: 26/26.
- **`applicaImport(estrazione)`**: match per titolo normalizzato
  (`normalizzaTitolo`: NFD, niente diacritici, uppercase, ’→', non-alnum→spazio).
  Match → aggiorna when/address (se diversi) + url. Non matchato → NUOVO
  luogo {id: "ohn-"+codice, …} geocodificato via **Nominatim**
  (`geocodifica()`: 2 varianti «X, Napoli» / «X, Napoli, Italia»,
  countrycodes=it, pausa 1100 ms; se non trovato: nel pannello verifica con
  «⚠ senza coordinate», posizionabile a mano cliccando la mappa). Ritorna
  {aggiornati, aggiunti, senzaCoord, messaggi}. NB: una tappa cancellata con
  la ✕ e reimportata TORNA con un nuovo id (ohn-<codice>) e senza miniatura —
  comportamento accettato. Testato: 2 località nuove geocodificate,
  3 orari/indirizzi aggiornati, ✕+reimport → tappa ripristinata.
- **Trasferimento PC ↔ mobile**: «⬇ Esporta stato» (esportaStatoBtn) scarica
  `mytour-stato-<data>.json` = {versione:1, esportato, datiImportati,
  correzioni, scelte:{ven,sab,dom:[id…]}}; «⬆ Importa stato»
  (importaStatoBtn → importaStatoInput) valida il JSON, chiede conferma,
  riscrive i TRE storage (importati, correzioni, scelte) e ricarica la pagina.
- **UI/JS aggiuntivi**: #importBox/#importMsg (riepilogo o errore, classe
  `import-msg errore` in rosso), `mostraImportMsg()`, `riepilogoImport()`
  (ricostruisce marker/verifica/lista dopo l'import), `scaricaJSON()`.
  Vecchio export «⬇ Esporta dati verificati (JSON)» (luoghi-verificati.json)
  resta com'era. Guardie per i luoghi senza coordinate: input lat/lon vuoti
  con placeholder, niente pulsante «centra» (e il click handler ha guardia
  null); la card verifica nasconde l'immagine se `image` manca (onerror).
- **Testato in locale** (server 8123, browser preview): import file 26 luoghi
  (2 nuovi: 480 SITE SPECIFIC l=490 geocodificato; ARCICONFRATERNITA DELLA
  DISCIPLINA DELLA SANTA CROCE l=502 senza coordinate — via corta non trovata
  da Nominatim), ✕ persistente dopo reload, reimport ripristina,
  esporta/importa stato OK, messaggio CORS su «Importa dal sito» da locale.
  NOTA: import con MOLTI luoghi nuovi = 1 richiesta Nominatim a ~1,1 s per
  luogo (26 luoghi ≈ 30 s): il messaggio in importBox avvisa.

## Fonte dati e OCR (come sono stati ricavati i dati)

- `mytour.png` (1920×5618) = screenshot della lista web dei luoghi con
  miniature, titoli, indirizzi, orari e pulsanti ELIMINA.
- L'OCR è stato fatto «a vista» dall'agente: ritagli sovrapposti della PNG
  salvati in JPG nel TEMP e letti come immagini. Le prime stime (15 punti)
  erano SBAGLIATE: il conteggio automatico delle fasce di pixel non-bianchi
  nella colonna della miniatura (x=200–480) ha rivelato **30 miniature** (passo
  ~185 px). Le fasce rilevate sono registrate negli appunti di chat, non nei file.
- Ordine della lista: alfabetico. Campi per punto: title, address, when,
  lat/lon, image (miniature ritagliate in `assets/`, 200px di larghezza).
- **MEA DOMUS MERGELLINA**: il campo `when` dell'OCR (tante fasce, con
  «18:00 > 18:45» duplicato) è stato RIDOTTO su richiesta dell'utente alla
  sola prenotazione confermata: «Domenica 4 ottobre 11:00 > 11:45» (con
  commento in `data.js`). Il parser degli orari di `app.js` resta comunque
  in grado di leggere fasce multiple con giorno ereditato e deduplica.

## Coordinate (pre-calcolate, la mappa NON geocodifica al volo)

- Script: `_strumenti/geocode.py` (Nominatim, UA personalizzato, 1,1 s tra le
  richieste, countrycodes=it, varianti di ripiego); esiti in
  `_strumenti/risultati.json`.
- 29/30 risolti. Casi particolari:
  - **MEA DOMUS MERGELLINA** (via Giordano Bruno 95): il primo match Nominatim
    era una via omonima a Casoria (40.90…): corretto a Mergellina
    (40.83073, 14.22169) imponendo «80122 Napoli» / «Mergellina».
  - **EDUCANDATO STATALE** («Largo dei Miracoli, 37»): non esiste su OSM;
    coordinate della chiesa di Santa Maria dei Miracoli (il monastero
    dell'Educandato, Sanità) prese dalla pagina ufficiale Open House Napoli
    (openhousenapoli.org/location/location.php?l=309).
- **Segnalatore del porto (punto 16, «I (NON) LUOGHI DEL PORTO»)»: posizionato
  a mano su richiesta dell'utente a FINE VIA ALCIDE DE GASPERI, incrocio con
  Piazza Municipio (40.84100, 14.25415) — estremo della via ricavato dalla
  geometria OSM via Overpass. Nota ambiente: overpass.kumi.systems va in
  timeout da questa macchina e overpass-api.de ha il CERTIFICATO SSL SCADUTO
  (serve context con verify_mode=CERT_NONE per query in sola lettura).

## Verifica OCR (chiusa)

- Pannello «🔍 Verifica OCR» integrato nella pagina: campi editabili, campi
  sospetti gialli (`needsReview`), casella «confermo», export JSON
  (scarica `luoghi-verificati.json` in Downloads), «Ripristina originali».
- Le correzioni fatte in pagina restano nel BROWSER (`localStorage`, chiave
  `mytour-mappa-correzioni-v1`) e si applicano a mappa/lista/popup.
- Esito: l'export dell'utente è stato confrontato con `data.js` tramite
  `_strumenti/confronta_export.py` → **zero differenze, 30/30 confermati**.
  I flag `needsReview` sono stati quindi RIMOSSI da `data.js`.

## Accessi speciali (link)

- `?vai=<id>` → deep link: centra il punto e apre il popup
  (es. `?vai=16-i-non-luoghi-porto`).
- `?verifica=1` → ricrea il pulsante «🔍 Verifica OCR» in alto e apre il
  pannello. IL PULSANTE NON È NELL'INTERFACCIA PUBBLICA (richiesta esplicita:
  il sito viene condiviso con un amico); è una riservatezza leggera.
- Combinabili: `?verifica=1&vai=<id>`.
- Il contatore «✓ verificato» in barra è visibile SOLO con `?verifica=1`
  (nascosto nella vista pubblica, richiesta esplicita: il sito viene condiviso
  con un amico).

## Struttura (i file dell'app sono nella RADICE di ohn)

- STORIA: l'app nasceva in `mytour-mappa/`; l'utente stava (per errore)
  caricando `ohn` su Cloudflare, quindi i file sono stati SPOSTATI nella
  radice di `D:\coding\ohn` e la cartella eliminata. I link interni sono
  relativi e non hanno richiesto modifiche.
- `index.html`, `style.css`, `app.js`, `data.js`, `assets/` (30 jpg) = sito.
- `mytour.png` = sorgente OCR (non richiesta dal sito, può essere omessa dal deploy).
- `_strumenti/` = geocode.py, confronta_export.py, risultati.json (build, non pubblicabili ma innocue).
- `README.md` = avvio locale, funzioni, deploy Cloudflare, esito verifica.

## Deploy Cloudflare Pages

- ATTIVO: progetto Git-connected collegato a GitHub `ubiquaedu/ohntour` →
  **https://myohntour.pages.dev**. Ogni push su `main` = deploy automatico
  (≈1 minuto). Il browser potrebbe servire la versione in cache: verificare con
  `?v=2` in coda all'URL se serve.
- Precedente: progetto Direct Upload **ohn26** → https://ohn26.pages.dev
  (dati vecchi, ancora online ma NON aggiornarlo più).
- Nota: in una prima schermata Cloudflare ha proposto la creazione di un
  «worker»; l'utente ha poi completato il collegamento del repo da solo e il
  deploy Git-connected funziona.

## Repository git

- Repo locale creato (02/10): branch `main`, commit iniziale `c4ee6ce` (41
  file, «Commit iniziale: «My Tour» — mappa dei 30 luoghi di Open House Napoli
  2026»), working tree pulita.
- `.gitignore` esclude: `.freebuff/` (metadati assistente), `mytour.png`
  (sorgente OCR, 3 MB) e `_strumenti/*.html` (salvataggi HTML dei preferiti).
- **Remote**: `origin` = `https://github.com/ubiquaedu/ohntour.git` — repo
  GitHub pubblico **ubiquaedu/ohntour**, creato dall'utente via browser (la
  CLI `gh` non è installata). `main` traccia `origin/main`; primo push
  eseguito (03/10) e verificato con `git ls-remote` (stesso hash sui due
  lati). Push via https con Git Credential Manager (credenziali già
  memorizzate su Windows: nessun prompt).
- Commit e push SOLO su richiesta esplicita dell'utente (regola generale in
  `D:\coding\agents.md`).
- Futuro possibile (NON fatto): collegare il repo GitHub al progetto
  Cloudflare Pages per il deploy automatico (push = deploy).

## Ambiente locale

- `python -m http.server 8123` DA `D:\coding\ohn` (i moduli ES non girano in
  `file://`). Attenzione: il comando deve avere cwd=ohn — una volta partito
  dalla directory sbagliata serviva 404 su app.js.
- Le coordinate dei 30 punti sono in `data.js`: per cambiare un indirizzo
  serve anche aggiornare lat/lon (a mano o rilanciando il geocode).

## Idee discusse ma NON implementate (proposte all'utente)

- Template riutilizzabile per future «mappe per indirizzi»: `geocode.py` che
  legge un CSV di indirizzi invece della lista hardcoded + `data.js` esempio.
  Il codice dell'app (mappa, lista, ricerca, popup, strati, deep link,
  verifica) è già generico: dipende solo da `data.js`.
- Versione stampabile della lista raggruppata per giornata.

Implementate nel frattempo (26/09/2026, da verificare poi in rete dopo il
deploy): «Apri in Google Maps» nel popup; contatore «✓ verificato» visibile
solo con `?verifica=1`; avvisi di conflitto limitati alla giornata selezionata
(niente avvisi nella vista «Tutti»); stelle visibili solo nelle viste di
giornata; pulsante «↺ Reset stelle» (conferma inclusa) per svuotare il tour;
lista ordinata per primo orario del giorno; nelle viste di giorno card e
popup mostrano solo le fasce del giorno scelto (niente orari degli altri giorni);
stelle per giorno e conflitti solo tra i luoghi scelti del giorno attivo.

## Storia delle chat

- Parte del lavoro è stata fatta in un thread aperto PER ERRORE sul progetto
  imgclassify (stesso contenuto, altra cartella). Questo file è la memoria
  ufficiale del progetto per le chat successive: collegalo insieme a
  `D:\coding\ohn` e a `D:\coding\agents.md`.
