// App «My OHN Tour» — mappa OpenStreetMap dei luoghi di Open House Napoli.
// Fonte primaria dei dati = IMPORT (fetch di preferiti.php dal sito OHN con le
// tue credenziali, o file HTML «My tour» salvato): ha priorità su data.js e può
// aggiornare orari, ripristinare tappe cancellate e aggiungere località nuove
// (geocodificate via Nominatim). La ✕ NON cancella più i dati: aggiorna il
// piano PER GIORNO tramite i preferiti (segnalibri); le esclusioni sono
// reversibili e viaggiano in Esporta/Importa stato; data.js è il seed iniziale.
import { luoghi } from "./data.js";

const mapEl = document.getElementById("map");
const listEl = document.getElementById("list");
const searchEl = document.getElementById("search");
const resetBtn = document.getElementById("resetBtn");
const conteggioEl = document.getElementById("conteggio");
const contatoreEl = document.getElementById("contatore");
const tourCountEl = document.getElementById("tourCount");
const conflittiCountEl = document.getElementById("conflittiCount");
const resetScelteBtn = document.getElementById("resetScelteBtn");
const legendaViciniEl = document.getElementById("legendaVicini");
const riepilogoConflittiEl = document.getElementById("riepilogoConflitti");
const riepilogoTitoloEl = document.getElementById("riepilogoTitolo");
const riepilogoListaEl = document.getElementById("riepilogoLista");
const chiudiConflittiBtn = document.getElementById("chiudiConflitti");
const adminBar = document.getElementById("adminBar");
const posizionaBanner = document.getElementById("posizionaBanner");
const posizionaTesto = document.getElementById("posizionaTesto");
const posizionaSalta = document.getElementById("posizionaSalta");
const posizionaAnnulla = document.getElementById("posizionaAnnulla");
const importFileInput = document.getElementById("importFileInput");
const importFotoInput = document.getElementById("importFotoInput");
// import a due zone: etichette e stato corrente, più il pulsante che lancia
const zonaFileEl = document.getElementById("zonaFile");
const zonaFileTestoEl = document.getElementById("zonaFileTesto");
const zonaFotoEl = document.getElementById("zonaFoto");
const zonaFotoTestoEl = document.getElementById("zonaFotoTesto");
const eseguiImportBtn = document.getElementById("eseguiImportBtn");
const esportaStatoBtn = document.getElementById("esportaStatoBtn");
const importaStatoBtn = document.getElementById("importaStatoBtn");
const importaStatoInput = document.getElementById("importaStatoInput");
const svuotaDatiBtn = document.getElementById("svuotaDatiBtn");
const importStatoEl = document.getElementById("importStato");
const adminPassEl = document.getElementById("adminPass");

const STORAGE_KEY = "mytour-mappa-correzioni-v1";
// Reset da URL per la prova/diagnostica: apre l'app con i dati azzerati.
// Solo a scopo di test, NON è nell'interfaccia: http://…/?reset=1
if (new URLSearchParams(location.search).has("reset")) {
  for (const k of ["mytour-dati-importati-v1", "mytour-mappa-correzioni-v1", "mytour-scelte-per-giorno-v1", "mytour-esclusioni-v1"])
    localStorage.removeItem(k);
  location.replace(location.pathname);
}
const STORAGE_SCELTE = "mytour-scelte-per-giorno-v1";
// esclusioni per giornata: le località tolte dal piano con «✕». Reversibili.
const STORAGE_ESCLUSIONI = "mytour-esclusioni-v1";
// Dati importati (da preferiti.php o file HTML): fonte primaria con priorità su
// data.js. La ✕ NON tocca più questi dati (l'esclusione è per giornata e
// reversibile); gli id restano qui e si riprendono con «↺ Ripristina».
const STORAGE_IMPORTATI = "mytour-dati-importati-v1";
// etichette dei giorni per i contatori («★ sabato: N»)
const ETICHETTA_GIORNO = { ven: "venerdì", sab: "sabato", dom: "domenica" };
const NAPOLI = [40.849, 14.25];
// Segnalibro (richiesta utente: al posto della stella) come SVG inline:
// eredita currentColor → si colora da .star-btn (spento/attivo) senza immagini.
const SEGNALIBRO_SVG = `<svg class="icona-segnalibro" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" fill="currentColor"/></svg>`;
// Giornate dell'evento: nomi per il riconoscimento nel campo «when» e chiavi
// dei pulsanti di filtro.
const GIORNO_PER_NOME = { "venerdì": "ven", "sabato": "sab", "domenica": "dom" };
// inverso: chiave del filtro («sab») → parola usata dal parser («sabato»)
const NOME_PER_GIORNO = Object.fromEntries(
  Object.entries(GIORNO_PER_NOME).map(([nome, chiave]) => [chiave, nome])
);
// margine minimo (minuti) tra la fine di una visita e l'inizio dell'altra:
// sotto questa soglia (o con sovrapposizione) la coppia è «in conflitto»
const MARGINE_CONFLITTO_MIN = 30;
// Password che abilita il tasto «✕» (aggiornamento del piano per giorni):
// protezione leggera, per lo stesso motivo del pannello impostazioni — il sito
// è condiviso con un amico e cancellazioni/impostazioni non devono sembrare
// pubbliche. NON persistita: al refresh si torna bloccati.
const PASSWORD_ADMIN = "26";
let adminSbloccato = false;

// Vista riservata alla configurazione: ?impostazioni=1 apre direttamente il
// pannello (import, correzioni, trasferimento stato). Compatibilità: anche
// ?verifica=1 (storicamente) apre lo stesso pannello.
const accessoImpostazioni =
  new URLSearchParams(location.search).has("impostazioni") ||
  new URLSearchParams(location.search).has("verifica");

// ---------- stato ----------
let correzioni = caricaCorrezioni(); // { id: { title?, address?, when?, lat?, lon?, confermato? } }
// stelle del tour gestite PER GIORNATA: mettere ★ con «Sab 3» attivo significa
// «visito quel luogo di sabato»; di domenica la stella non appare (e i suoi
// conflitti di sabato neanche), a meno di metterla anche per domenica.
let scelte = caricaScelte(); // { ven: Set, sab: Set, dom: Set } di id
let esclusioni = caricaEsclusioni(); // { ven: Set, sab: Set, dom: Set } di id
let giornoFiltro = ""; // "", "ven", "sab", "dom" — non persistito: all'avvio sempre «Tutti»
// dati importati da preferiti.php o file HTML: se esistono SOSTITUISCONO data.js
// (fonte primaria, richiesta esplicita). La ✕ rimuove da qui: la cancellazione
// vale per tutti i dispositivi (o si replica con Esporta/Importa stato).
let datiImportati = caricaImportati(); // array di luoghi op null (= usa data.js)
const markerPerId = new Map();

// ---------- cache di calcolo ----------
// datiCorrenti() viene chiamata centinaia di volte per interazione (card,
// marker, popup, contatori): costruire l'array ogni volta era spreco. La
// cache si invalida in salvaCorrezioni() e salvaImportati() (i punti che
// cambiano dati o coordinate).
let cacheDati = null;
const cacheOrari = new Map(); // testo «when» → fasce parseate
const cacheDistanze = new Map(); // coppia di id → metri (haversine)

function datiCorrenti() {
  if (!cacheDati)
    cacheDati = luoghiBase()
      .map((l) => ({ ...l, ...(correzioni[l.id] ?? {}) }))
      .filter((l) => l.lat != null && l.lon != null); // senza coordinate: in lista, non in mappa
  return cacheDati;
}

// Stessa cosa ma senza filtro: serve al pannello verifica (la card di un luogo
// senza coordinate resta editabile, per posizionarlo a mano dalla mappa).
function datiCompleti() {
  return luoghiBase().map((l) => ({ ...l, ...(correzioni[l.id] ?? {}) }));
}

function caricaCorrezioni() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function salvaCorrezioni() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(correzioni));
  cacheDati = null;      // i dati (e le coordinate) possono essere cambiati
  cacheOrari.clear();    // il testo «when» può essere stato corretto
  cacheDistanze.clear(); // le coordinate possono essere state spostate
}

function caricaScelte() {
  const vuoto = { ven: new Set(), sab: new Set(), dom: new Set() };
  try {
    const dati = JSON.parse(localStorage.getItem(STORAGE_SCELTE));
    if (!dati) return vuoto;
    for (const g of Object.keys(vuoto)) vuoto[g] = new Set(dati[g] ?? []);
    return vuoto;
  } catch {
    return vuoto;
  }
}

function caricaEsclusioni() {
  const vuoto = { ven: new Set(), sab: new Set(), dom: new Set() };
  try {
    const dati = JSON.parse(localStorage.getItem(STORAGE_ESCLUSIONI));
    if (!dati) return vuoto;
    for (const g of Object.keys(vuoto)) vuoto[g] = new Set(dati[g] ?? []);
    return vuoto;
  } catch {
    return vuoto;
  }
}

function salvaEsclusioni() {
  const dati = {};
  for (const [g, ins] of Object.entries(esclusioni)) dati[g] = [...ins];
  localStorage.setItem(STORAGE_ESCLUSIONI, JSON.stringify(dati));
  cacheDati = null; // visibilità filtrata per giorno
}

// ---------- dati base (importato > data.js) ----------

// Dati risultanti dall'ultimo import (preferiti.php o file HTML): fonte primaria,
// ha priorità su data.js. Se non c'è nessun import si usa data.js (seed).
function luoghiBase() {
  return datiImportati ?? luoghi;
}

function caricaImportati() {
  try {
    const dati = JSON.parse(localStorage.getItem(STORAGE_IMPORTATI));
    return Array.isArray(dati) && dati.length ? dati : null;
  } catch {
    return null;
  }
}

function salvaImportati() {
  localStorage.setItem(STORAGE_IMPORTATI, JSON.stringify(datiImportati));
  cacheDati = null;
  cacheOrari.clear();   // orari aggiornati dalla fonte
  cacheDistanze.clear(); // possono essere cambiate anche le coordinate
}

function salvaScelte() {
  const dati = {};
  for (const [g, ins] of Object.entries(scelte)) dati[g] = [...ins];
  localStorage.setItem(STORAGE_SCELTE, JSON.stringify(dati));
}

// ---------- IMPORT: fonte primaria dei dati ----------
// UNA SOLA STRADE, «📄 Importa HTML»: il file «My tour» salvato come HTML.
// (Il vecchio «🌐 Importa dal sito» è stato tolto: openhousenapoli.org non
// manda gli header CORS, quindi il browser blocca la lettura della pagina
// da myohntour.pages.dev — la sessione non c'entra, è la same-origin policy.
// Per l'utente: salva la pagina «My tour» dal browser e importala qui.)
// L'import ha PRIORITÀ sui dati interni: aggiorna orari/indirizzi, ripristina
// le tappe cancellate per errore e aggiunge le località nuove (geocodificate).

// normalizzazione per il match: maiuscole, niente accenti/punteggiatura
// (stessa strategia di _strumenti/importa_preferiti.py)
function normalizzaTitolo(t) {
  return (t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\u2019/g, "'")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

// Estrae i luoghi dall'HTML della pagina «My tour» (stessa struttura letta da
// importa_preferiti.py: righe <tr> con <b>titolo</b>, indirizzo, orari e link
// alla scheda con codice l=<n>). Ritorna [] se il file non è riconosciuto.
function estraiLuoghiDaHTML(testo) {
  const doc = new DOMParser().parseFromString(testo, "text/html");
  const luoghi_ = [];
  for (const tr of doc.querySelectorAll("tr")) {
    const titolo = tr.querySelector("b");
    if (!titolo) continue;
    // il link con i dati è quello che CONTIENE il <b> (gli altri link della
    // riga sono l'immagine e il bottone ELIMINA, che ha href preferiti.php?l=)
    const link = [...tr.querySelectorAll('a[href*="location.php?l="]')].find((a) => a.contains(titolo));
    if (!link) continue;
    const codice = (link.getAttribute("href").match(/l=(\d+)/) ?? [])[1];
    if (!codice) continue;
    // indirizzo e orari: i segmenti del link dopo il <b>, separati da <br>
    let indirizzo = "";
    let quando = "";
    {
      // segmenti del link: i nodi testo e gli elementi contribuiscono il loro
      // testo, i <br> separano i segmenti (indirizzo / orari)
      const segmenti = [];
      let corrente = "";
      for (const n of link.childNodes) {
        if (n.nodeType === 3) corrente += n.textContent;
        else if (/^br$/i.test(n.tagName)) { segmenti.push(corrente); corrente = ""; }
        else corrente += n.textContent;
      }
      segmenti.push(corrente);
      const nodi = segmenti.map((s) => s.trim()).filter((s) => s && s !== titolo.textContent.trim());
      indirizzo = nodi[0] ?? "";
      quando = nodi.slice(1).join(" | ");
    }
    // foto: nel salvataggio HTML la src è un file locale del browser
    // («./Open House Napoli - Preferiti_files/490_5188.jpeg»): il NOME FILE è
    // quello del sito (il codice davanti è l=`l=` della scheda). Il file
    // reale sta nella cartella «…_files» che il browser crea con il
    // salvataggio «Pagina web, completa»: l'utente la seleziona con
    // «🖼 Cartella foto» e l'import la converte in miniatura incorporata
    // (data URL). L'URL remoto NON si usa più: openhousenapoli.org filtra
    // le richieste non-da-browser (403) così nessuna foto carica.
    let foto = null;
    const nomeFoto = (tr.querySelector('a[href*="location.php?l="] img')?.getAttribute("src") ?? "")
      .match(/[\w.-]+\.(?:jpe?g|png|webp)$/i);
    if (nomeFoto) foto = nomeFoto[0];
    luoghi_.push({
      codice,
      titolo: titolo.textContent.trim(),
      indirizzo,
      quando,
      foto,
      url: "https://www.openhousenapoli.org/location/location.php?l=" + codice,
    });
  }
  return luoghi_;
}

// Geocodifica UN luogo via Nominatim (pausa 1,1 s dentro, per il rispetto
// del limite). Ordine delle varianti (rilevato dai casi reali):
//  1) INDIRIZZO PURO (con civico → senza civico) + «Napoli»: Nominatim trova
//     il civico SOLO senza il titolo davanti (es. «Palazzo …, Via Santa
//     Teresa degli Scalzi, 76» non trovato, ma «Via Santa Teresa degli
//     Scalzi 76» sì — caso Danilo Ambrosino);
//  2) TITOLO intero + «Napoli» (toponimi: «Palazzo…», chiese);
//  3) PAROLE CHIAVE del TITOLO da sole («Disciplina», «Santa Croce»…):
//     i titoli OHN differiscono leggermente dai nomi su OSM.
// Ritorna {lat, lon} o null.
async function geocodifica(indirizzo, titolo = "") {
  const pulito = (indirizzo ?? "").replace(/\s+/g, " ").trim();
  if (!pulito && !titolo) return null;
  // varianti senza civico: «Via Roma 12» → «Via Roma» (utile per i luoghi
  // importati da HTML dove il numero a volte manca o è annotato in coda)
  const senzaCivico = pulito.replace(/\s+\d+[\w/]*(\s*,.*)?$/, "$1").trim();
  const base = senzaCivico && senzaCivico !== pulito ? [pulito, senzaCivico] : [pulito];
  // il TITOLO non va DAVANTI all'indirizzo (Nominatim si inceppa su nomi
  // assenti in OSM, es. «Palazzo … Albertini di Cimitile, Via …»): query
  // distinte, prima tutti gli indirizzi poi toponimi.
  const varianti = [
    ...base.flatMap((v) => [v + ", Napoli", v + ", Napoli, Italia"]),
    ...(titolo ? [titolo.trim() + ", Napoli"] : []),
    ...(titolo ? paroleChiaveTitolo(titolo).map((t) => t + ", Napoli") : []),
  ].filter(Boolean);
  for (const v of varianti) {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&q=" +
      encodeURIComponent(v);
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) {
        const arr = await r.json();
        if (arr.length) return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
      }
    } catch { /* riprova con la variante successiva */ }
    await new Promise((res) => setTimeout(res, 1100)); // pausa Nominatim
  }
  return null;
}

// token generici del titolo da NON usare da soli come query geocodifica
const TOKEN_GENERICI = new Set([
  "palazzo","villa","chiesa","museo","biblioteca","teatro","galleria",
  "istituto","accademia","fondazione","napoli","via","piazza","courtyard",
  "strada", "salita", "vico", "vicolo", "borgo"
]);

// parole chiave geografiche di un titolo («Arciconfraternita della
// Compagnia della Disciplina della Santa Croce» → «Disciplina», «Santa
// Croce» → query «Disciplina, Napoli», ecc.). Token ≥ 5 lettere, generici
// esclusi, uno per query (max 4).
function paroleChiaveTitolo(titolo) {
  const base = (titolo ?? "")
    .replace(/\[[^\]]*\]/g, " ") // niente parentesi
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // niente accenti
    .toLowerCase();
  const tokens = [...base.matchAll(/[a-z]{5,}/g)].map((m) => m[0]);
  const STOP = new Set(["della","del","dei","delle","degli","degli","di","compagnia","arciconfraternita","citt","napoletana"]);
  return [...new Set(tokens.filter((t) => !TOKEN_GENERICI.has(t) && !STOP.has(t)))].slice(0, 4);
}

// Immagine dei luoghi importati: convenzione assets/ohn-<codice>.jpg. Il file
// NON viene creato dall'import (bisogna aggiungerlo in assets/, vedi README):
// qui si controlla con una richiesta HEAD che esista davvero, per non mostrare
// immagini rotte. Ritorna il percorso o null.
async function immagineSeEsiste(codice) {
  const percorso = "assets/ohn-" + codice + ".jpg";
  try {
    const r = await fetch(percorso, { method: "HEAD", cache: "no-store" });
    return r.ok ? percorso : null;
  } catch {
    return null;
  }
}

// Applica l'import ai dati base: aggiorna orari/indirizzi dalla fonte, ripristina
// le tappe cancellate presenti, aggiunge i luoghi nuovi (geocodificati se
// possibile). fotoPerCodice (opzionale): mappe codice → data URL della
// miniatura letta dalla cartella «…_files» del salvataggio browser.
// Ritorna {aggiornati, aggiunti, senzaCoord, messaggi} — i messaggi elencano
// solo ciò che va verificato (senzaCoord) + miniature incorporate.
async function applicaImport(estrazione, fotoPerCodice = new Map()) {
  if (!datiImportati) datiImportati = luoghi.map((l) => ({ ...l }));
  const base = datiImportati;
  const indice = new Map(base.map((l, i) => [normalizzaTitolo(l.title), i]));
  const aggiornati = [];
  const aggiunti = [];
  const senzaCoord = [];
  for (const p of estrazione) {
    const i = indice.get(normalizzaTitolo(p.titolo));
    // immagine: PRIMA la miniatura incorporata dalla cartella foto (data URL),
    // poi la riserva assets/ohn-<codice>.jpg; l'URL remoto NON si usa più
    // (openhousenapoli.org blocca le richieste non-da-browser: 403)
    const imgNuova = fotoPerCodice.get(p.codice) ?? (await immagineSeEsiste(p.codice));
    if (i !== undefined) {
      const l = base[i];
      if (p.quando && p.quando !== l.when) { l.when = p.quando; aggiornati.push(p.titolo); }
      if (p.indirizzo && p.indirizzo !== l.address) { l.address = p.indirizzo; if (!aggiornati.includes(p.titolo)) aggiornati.push(p.titolo); }
      if (l.url && p.url && l.url !== p.url) l.url = p.url;
      if (imgNuova && l.image !== imgNuova) {
        l.image = imgNuova;
        if (!aggiornati.includes(p.titolo)) aggiornati.push(p.titolo);
      }
    } else {
      // luogo nuovo: geocodifica (1,1 s di pausa è dentro geocodifica)
      const coord = await geocodifica(p.indirizzo, p.titolo);
      const nuovo = {
        id: "ohn-" + p.codice,
        title: p.titolo,
        address: p.indirizzo,
        when: p.quando,
        url: p.url,
        ...(imgNuova ? { image: imgNuova } : {}),
        ...(coord ?? {}),
      };
      base.push(nuovo);
      indice.set(normalizzaTitolo(p.titolo), base.length - 1);
      if (coord) aggiunti.push(p.titolo);
      else { senzaCoord.push(p.titolo); aggiunti.push(p.titolo); }
      // NB: una tappa cancellata per errore e poi reimportata torna con un
      // nuovo id (ohn-<codice>): i dati (orari, indirizzo, url, immagine se
      // disponibile) tornano dalla fonte/convenzione.
    }
  }
  const messaggi = [];
  // Il riepilogo mostra SOLO ciò che va verificato (luoghi senza coordinate):
  // aggiornamenti e aggiunte restano silenziosi (richiesta esplicita).
  // conteggio solo delle miniature VERAMENTE incorporate (data URL dalla
  // cartella foto), non degli asset di riserva assets/ohn-<codice>.jpg
  const incorporate = [...fotoPerCodice.keys()].filter((c) =>
    base.some((l) => l.id === "ohn-" + c && (l.image ?? "").startsWith("data:"))
  ).length;
  if (incorporate) messaggi.push("Miniature incorporate: " + incorporate + " immagini dalla cartella (− 3 icone del sito)");
  if (senzaCoord.length) messaggi.push("⚠ Coordinate non trovate: "+ senzaCoord.join(", ") + "\n→ usa 🎯 sulla card per posizionarli dalla lista (prima si riprova Nominatim)");
  if (!messaggi.length) messaggi.push("Nessuna differenza: i dati sono già allineati alla fonte.");
  salvaImportati();
  return { aggiornati, aggiunti, senzaCoord, messaggi };
}

// stelle della giornata selezionata (Set vuoto in «Tutti», dove non si scelgono)
function scelteDelGiorno() {
  return (giornoFiltro && scelte[giornoFiltro]) || new Set();
}

// Un luogo è escluso dal piano del giorno dato (o di QUALSIASI giorno se non
// se ne passa uno): lista e mappa lo nascondono in quelle viste.
function esclusaDalGiorno(id, giorno = giornoFiltro) {
  if (!giorno) return false;
  return esclusioni[giorno]?.has(id) ?? false;
}

// La località è esclusa da TUTTI i giorni (per la sezione «↺ Ripristina»)
function esclusaSempre(id) {
  return Object.values(esclusioni).some((ins) => ins.has(id));
}

function totScelte() {
  return Object.values(scelte).reduce((n, ins) => n + ins.size, 0);
}

function campo(luogo, chiave) {
  return correzioni[luogo.id]?.[chiave] ?? luogo[chiave];
}

// ---------- orari: parse del campo «when» ----------
// Il campo contiene una o più fasce separate da «|»; ogni fascia può iniziare
// con il giorno («Sabato …») oppure ereditare quello precedente
// («Sabato 10:00 > 13:00 | 16:30 > 19:00»). Se un testo non si interpreta il
// luogo resta comunque visibile: il parse non genera mai errori.
function parseOrari(testoWhen) {
  const chiave = testoWhen ?? "";
  if (cacheOrari.has(chiave)) return cacheOrari.get(chiave);
  const fasce = [];
  let giornoCorrente = null;
  for (const blocco of chiave.split("|")) {
    const t = blocco.trim();
    if (!t) continue;
    const matchGiorno = t.match(/^(venerd[iì]|sabato|domenica)/i);
    if (matchGiorno) giornoCorrente = matchGiorno[1].toLowerCase();
    if (!giornoCorrente) continue;
    for (const m of t.matchAll(/(\d{1,2}):(\d{2})\s*>\s*(\d{1,2}):(\d{2})/g)) {
      const inizio = Number(m[1]) * 60 + Number(m[2]);
      const fine = Number(m[3]) * 60 + Number(m[4]);
      if (fine > inizio) fasce.push({ giorno: giornoCorrente, inizio, fine });
    }
  }
  // deduplica: stessa giornata e stessi orari (caso MEA DOMUS nei dati originali)
  const viste = new Set();
  const risultato = fasce.filter((f) => {
    const chiave = `${f.giorno}|${f.inizio}|${f.fine}`;
    if (viste.has(chiave)) return false;
    viste.add(chiave);
    return true;
  });
  cacheOrari.set(testoWhen ?? "", risultato);
  return risultato;
}

// Due fasce sono in conflitto se si sovrappongono oppure se tra la fine di una
// e l'inizio dell'altra passano meno di MARGINE_CONFLITTO_MIN minuti.
function slotInConflitto(a, b) {
  if (a.giorno !== b.giorno) return false;
  const margine = a.inizio >= b.fine ? a.inizio - b.fine : b.inizio - a.fine;
  return margine < MARGINE_CONFLITTO_MIN;
}

// Conflitti del luogo con gli altri luoghi SCELTI con ★ della giornata
// (richiesta utente: i candidati arancio NON partecipano più ai conflitti —
// «è una scelta che si fa al momento»). La verifica è a livello di GIORNATA:
// con un giorno selezionato (ven/sab/dom) si confrontano solo le fasce di
// quel giorno; nella vista «Tutti» non ci sono avvisi.
function conflittiPerLuogo(id, lista) {
  if (!giornoFiltro) return [];
  const scelteGiorno = scelteDelGiorno();
  if (scelteGiorno.size === 0) return [];
  const luogo = lista.find((l) => l.id === id);
  if (!luogo) return [];
  if (!scelteGiorno.has(id)) return [];
  const giorno = NOME_PER_GIORNO[giornoFiltro];
  const mie = parseOrari(campo(luogo, "when")).filter((f) => f.giorno === giorno);
  if (mie.length === 0) return [];
  // UN conflitto per altro luogo: basta la prima coppia di fasce sovrapposte
  // (nel riepilogo non si mostrano gli orari, solo i nomi).
  const gruppi = new Map();
  for (const altro of lista) {
    if (altro.id === id || !scelteGiorno.has(altro.id)) continue;
    const fasceAltro = parseOrari(campo(altro, "when")).filter((f) => f.giorno === giorno);
    const tocca = fasceAltro.some((b) => mie.some((a) => slotInConflitto(a, b)));
    if (tocca) gruppi.set(altro.id, { idAltro: altro.id, titolo: campo(altro, "title") });
  }
  return [...gruppi.values()];
}

// ---------- mappa ----------
const map = L.map("map").setView(NAPOLI, 13);

// Strati base: OpenStreetMap (di serie) e satellite (Esri World Imagery) per la verifica
const baseOSM = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap contributors",
}).addTo(map);
const baseSatellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Immagini © Esri — Source: Esri, Maxar, Earthstar Geographics",
  }
);
L.control.layers(
  { "🗺 OpenStreetMap": baseOSM, "🛰 Satellite": baseSatellite },
  {},
  { position: "topright", collapsed: true }
).addTo(map);

function popupHTML(luogo) {
  // Popup snellito su richiesta: niente foto, né orari, né avvisi di conflitto
  // (restano sulla card della lista); solo nome, indirizzo, i link a Google
  // Maps e alla scheda ufficiale OHN (info di accesso/visita), la nota 🟠 se
  // il luogo è un candidato vicino da non perdere.
  const linkOHN = luogo.url
    ? `<a class="popup-ohn" target="_blank" rel="noopener" href="${luogo.url}">🏛 Scheda ufficiale OHN</a>`
    : "";
  return `<div class="popup-body">
    <p class="popup-titolo"></p>
    <p class="popup-addr"></p>
    <a class="popup-gmaps" target="_blank" rel="noopener" href="#">🗺 Apri in Google Maps</a>
    ${linkOHN}
    <div class="popup-vicino" hidden></div>
  </div>`;
}

function testoWhenVisualizzato(luogo) {
  const testo = campo(luogo, "when");
  return giornoFiltro ? testoWhenDelGiorno(testo, giornoFiltro) : testo;
}

function riempiPopup(el, luogo) {
  el.querySelector(".popup-titolo").textContent = campo(luogo, "title");
  el.querySelector(".popup-addr").textContent = campo(luogo, "address");
  // «Apri in Google Maps»: indicazioni stradali verso le coordinate verificate del punto
  el.querySelector(".popup-gmaps").href =
    `https://www.google.com/maps/dir/?api=1&destination=${luogo.lat},${luogo.lon}`;
  // nota nel popup per i marker arancio (vicini aperti solo nel giorno scelto)
  const vicinoBox = el.querySelector(".popup-vicino");
  if (eVicinoDaVisitare(luogo, datiCorrenti())) {
    vicinoBox.textContent =
      `🟠 Aperto solo ${ETICHETTA_GIORNO[giornoFiltro]} e vicino a un luogo del tour: candidata per dopo la visita`;
    vicinoBox.hidden = false;
  } else {
    vicinoBox.hidden = true;
  }
  // gli avvisi di conflitto restano SOLO sulla card della lista (richiesta:
  // il popup deve occupare meno spazio possibile)
}

function creaContenutoPopup(luogo) {
  const el = document.createElement("div");
  el.innerHTML = popupHTML(luogo);
  riempiPopup(el, luogo);
  return el;
}

function creaMarker(luogo) {
  const marker = L.marker([luogo.lat, luogo.lon], { icon: iconaMarker("normale") }).addTo(map);
  marker.__statoPin = "normale";
  marker.bindPopup(() => {
    const corrente = datiCorrenti().find((x) => x.id === luogo.id) ?? luogo;
    return creaContenutoPopup(corrente);
  });
  markerPerId.set(luogo.id, marker);
}

datiCorrenti().forEach(creaMarker);

// ---------- marker arancio: vicini aperti SOLO nel giorno scelto ----------
// Con una giornata selezionata e almeno una stella nel tour, i marker dei
// luoghi NON scelti che sono aperti SOLO quel giorno e distano ≤ RAGGIO_VICINI_M
// da un luogo scelto diventano arancioni: se non li visiti quel giorno li
// perdi, quindi sono le candidate naturali per «dopo la visita».
const RAGGIO_VICINI_M = 500;

// distanze memoizzate per coppia di id (la cache si invalida con salvaCorrezioni,
// quando le coordinate possono essere state spostate)
function distanzaMetri(a, b) {
  const chiave = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
  if (cacheDistanze.has(chiave)) return cacheDistanze.get(chiave);
  const R = 6371000; // raggio terrestre in metri
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  const metri = 2 * R * Math.asin(Math.sqrt(s));
  cacheDistanze.set(chiave, metri);
  return metri;
}

// «Aperto solo quel giorno»: tutte le fasce interpretabili del luogo sono del
// giorno selezionato. Con orari non interpretabili (o più giorni) NON è
// evidenziato: l'urgenza manca (o non è dimostrabile).
function apertoSoloNelGiorno(luogo, filtro) {
  if (!filtro) return false;
  const fasce = parseOrari(campo(luogo, "when"));
  if (fasce.length === 0) return false;
  const nome = NOME_PER_GIORNO[filtro];
  return fasce.every((f) => f.giorno === nome);
}

// Il luogo è da evidenziare: aperto solo nel giorno scelto, vicino a un luogo
// scelto con ★, e lui stesso non scelto (quello già è nel tour).
function eVicinoDaVisitare(luogo, lista) {
  if (!giornoFiltro || scelteDelGiorno().size === 0) return false;
  if (scelteDelGiorno().has(luogo.id)) return false;
  if (!apertoSoloNelGiorno(luogo, giornoFiltro)) return false;
  const scelti = lista.filter((l) => scelteDelGiorno().has(l.id));
  return scelti.some((s) => distanzaMetri(s, luogo) <= RAGGIO_VICINI_M);
}

function iconaMarker(stato) {
  // stato: "normale" | "scelto" (★ nel tour della giornata) | "vicino" (arancio)
  const classe = stato === "scelto" ? "pin pin-verde" : stato === "vicino" ? "pin pin-arancio" : "pin pin-blu";
  return L.divIcon({
    className: classe,
    html: "<span></span>",
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

// Ricolora tutti i marker in base allo stato corrente (giorno + stelle):
// verde = scelto con ★ nel giorno selezionato, arancio = vicino da non perdere,
// blu = gli altri. Verde e arancio solo nelle viste di giornata.
function aggiornaColoriMarker() {
  const lista = datiCorrenti();
  let nArancio = 0;
  for (const [id, marker] of markerPerId) {
    const luogo = lista.find((l) => l.id === id);
    if (!luogo) continue;
    let stato = "normale";
    if (giornoFiltro && scelteDelGiorno().has(id)) stato = "scelto";
    else if (eVicinoDaVisitare(luogo, lista)) { stato = "vicino"; nArancio++; }
    // setIcon smonta e rimonta il nodo DOM del pin: toccarlo SOLO se cambia davvero
    if (marker.__statoPin !== stato) {
      marker.setIcon(iconaMarker(stato));
      marker.__statoPin = stato;
    }
  }
  // legenda accanto ai filtri: solo quando c'è almeno un marker evidenziato
  legendaViciniEl.hidden = nArancio === 0;
}

// Testo «when» ridotto alle SOLE fasce del giorno selezionato: nelle viste di
// giornata card e popup non mostrano gli orari degli altri giorni (es. la
// parte «Domenica …» di un luogo aperto sabato e domenica), che altrimenti
// sembrano appartenere al giorno filtrato. Il blocco senza giorno eredita il
// precedente, come nel parser; il nome del giorno resta in testa al testo.
function testoWhenDelGiorno(testoWhen, filtro) {
  if (!filtro) return testoWhen;
  const nome = NOME_PER_GIORNO[filtro]; // es. "sabato"
  const mantenuti = [];
  let giornoCorrente = null;
  for (const blocco of (testoWhen ?? "").split("|")) {
    const t = blocco.trim();
    if (!t) continue;
    const m = t.match(/^(venerd[iì]|sabato|domenica)/i);
    if (m) giornoCorrente = m[1].toLowerCase();
    if (giornoCorrente === nome) mantenuti.push(t);
  }
  if (mantenuti.length === 0) return testoWhen; // orari non interpretabili: resta il testo intero
  // il primo blocco del giorno porta il nome del giorno: lo riusa come prefisso
  // il mese non è fissato («ottobre»): la maschera vale per ogni edizione
  const mPrima = mantenuti[0].match(/^((?:venerd[iì]|sabato|domenica)\s+\d+\s+\S+)/i);
  if (!mPrima) return mantenuti.join(" | ");
  const resto = mantenuti[0].slice(mPrima[0].length).trim();
  return [`${mPrima[1]} ${resto}`.trim(), ...mantenuti.slice(1)].join(" | ");
}

// Un luogo è visibile col filtro giornata attivo se ha almeno una fascia quel giorno.
// Se il testo orari non si interpreta (nessuna fascia riconosciuta) resta sempre visibile.
function primaOraNelGiorno(luogo) {
  const fasce = parseOrari(campo(luogo, "when")).filter(
    (f) => GIORNO_PER_NOME[f.giorno] === giornoFiltro
  );
  return fasce.length ? Math.min(...fasce.map((f) => f.inizio)) : null;
}

function visibileNelFiltro(luogo) {
  if (!giornoFiltro) return true;
  if (esclusaDalGiorno(luogo.id)) return false; // esclusa dal piano del giorno
  const fasce = parseOrari(campo(luogo, "when"));
  if (fasce.length === 0) return true;
  return fasce.some((f) => GIORNO_PER_NOME[f.giorno] === giornoFiltro);
}

// Il filtro per giornata nasconde anche i marker sulla mappa (scelta utente).
function applicaFiltroMarker() {
  for (const [id, marker] of markerPerId) {
    const luogo = datiCorrenti().find((l) => l.id === id);
    if (!luogo) continue;
    if (visibileNelFiltro(luogo)) {
      if (!map.hasLayer(marker)) marker.addTo(map);
    } else if (map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  }
  aggiornaColoriMarker();
}

function inquadraTutti() {
  if (vaiIniziale) return; // con un deep link la vista è già del punto richiesto
  const punti = datiCorrenti().filter((l) => l.lat != null && l.lon != null);
  if (!punti.length) return; // nessuna coordinata (dati di prova vuoti): la vista resta su Napoli
  map.invalidateSize();
  map.fitBounds(
    L.latLngBounds(punti.map((l) => [l.lat, l.lon])).pad(0.08),
    { maxZoom: 15 }
  );
}
// la vista va aggiustata dopo che il layout ha le dimensioni definitive
window.addEventListener("load", inquadraTutti);
setTimeout(inquadraTutti, 300);
window.addEventListener("resize", () => map.invalidateSize());

// Deep link: ?vai=<id> centra il punto e apre il popup (utile per condividere un luogo)
const vaiIniziale = new URLSearchParams(location.search).get("vai");
if (vaiIniziale) setTimeout(() => vaiAlLuogo(vaiIniziale), 400);

function aggiornaMarker(luogo) {
  const marker = markerPerId.get(luogo.id);
  if (marker) marker.setLatLng([luogo.lat, luogo.lon]);
}

// Ricrea tutti i marker dalla lista corrente (dopo un ripristino di tappe
// eliminate: i marker mancanti tornano sulla mappa, quelli in eccesso escono).
function ricostruisciMarker() {
  for (const [id, marker] of markerPerId) {
    map.removeLayer(marker);
    markerPerId.delete(id);
  }
  datiCorrenti().forEach(creaMarker);
  aggiornaColoriMarker();
}

// ---------- lista ----------
function cardHTML(luogo, senzaCoord, esclusa = false) {
  const thumb = luogo.image
    ? `<img src="${luogo.image}" alt="" loading="lazy" />`
    : "";
  // 🎯 per i luoghi senza coordinate (solo modalità admin): apre il posizionamento
  const posiziona = senzaCoord && adminMode()
    ? `<button class="vai-btn" type="button" data-posiziona="${luogo.id}"
        title="Posiziona questo luogo sulla mappa">🎯 Posiziona</button>`
    : "";
  // La stella del tour si usa solo con una giornata selezionata e vale per
  // QUEL giorno; nella vista «Tutti» le card mostrano in sola lettura i
  // segnalibri già messi per i giorni, così il tour composto si vede a colpo
  // d'occhio (i giorni sono indicati in piccolo accanto alla stella).
  const scelta = scelteDelGiorno().has(luogo.id);
  const giorniProva = !giornoFiltro
    ? Object.entries(ETICHETTA_GIORNO)
        .filter(([g]) => scelte[g]?.has(luogo.id))
        .map(([, eta]) => eta)
    : [];
  const badgeTutti = giorniProva.length
    ? `<span class="badge-tour" title="Segnalibro del tour per ${giorniProva.join(", ")}">
        ${SEGNALIBRO_SVG} ${giorniProva.join(" · ")}</span>`
    : "";
  // «✕» accanto alla stella: presente nelle viste di giorno SOLO dopo lo
  // sblocco con password (campo 🔒 in alto): aggiorna il piano per giorni
  // (esclude dai giorni senza preferito; reversibile con «↺ Ripristina»)
  const del = giornoFiltro && adminSbloccato
    ? `<button class="del-btn" type="button" data-elimina="${luogo.id}"
        title="Aggiorna il piano: esclude dai giorni senza preferito (reversibile con ↺ Ripristina)">✕</button>`
    : "";
  // «↺» sulle card ESCLUSE (solo admin): ripristina nel giorno della vista
  // (o in tutti i giorni in vista «Tutti»)
  const ripristina = esclusa && adminMode()
    ? `<button class="vai-btn" type="button" data-ripristina="${luogo.id}"
        title="Rimette la località nel piano ${giornoFiltro ? "di " + ETICHETTA_GIORNO[giornoFiltro] : "di tutti i giorni"}">↺ Ripristina</button>`
    : "";
  const star = giornoFiltro
    ? `<button class="star-btn ${scelta ? "attiva" : ""}" type="button" data-scelta="${luogo.id}"
        aria-pressed="${scelta}" title="${scelta ? "Togli dal tour di " + ETICHETTA_GIORNO[giornoFiltro] : "Aggiungi al tour di " + ETICHETTA_GIORNO[giornoFiltro]}">${SEGNALIBRO_SVG}</button>`
    : "";
  return `<div class="thumb">${thumb}</div>
    <div class="card-main">
      <p class="card-title"></p>
      <p class="card-addr"></p>
      <p class="card-when"></p>
    </div>
    <div class="card-side">
      ${posiziona}
      ${ripristina}
      ${senzaCoord ? "" : `<button class="vai-btn" type="button" data-vai="${luogo.id}">📍 Vai</button>`}
      ${star}
      ${del}
      ${badgeTutti}
    </div>`;
}

function creaCard(luogo, senzaCoord = false, esclusa = false) {
  const card = document.createElement("div");
  card.className = "card" + (senzaCoord ? " da-posizionare" : "") + (esclusa ? " esclusa" : "");
  card.dataset.id = luogo.id;
  card.innerHTML = cardHTML(luogo, senzaCoord, esclusa);
  card.querySelector(".card-title").textContent = campo(luogo, "title");
  card.querySelector(".card-addr").textContent = campo(luogo, "address");
  card.querySelector(".card-when").textContent = testoWhenVisualizzato(luogo);
  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-posiziona]")) return;
    if (e.target.closest("[data-ripristina]")) return;
    if (e.target.closest("[data-vai]")) return;
    if (e.target.closest("[data-scelta]")) return;
    if (e.target.closest("[data-elimina]")) return;
    vaiAlLuogo(luogo.id);
  });
  return card;
}

// Riepilogo UNICO dei conflitti sopra la lista (sostituisce gli avvisi sulle
// singole card: con molte stelle i conflitti si ripetevano in più schede,
// allungando troppo la lista). Una riga per luogo in conflitto, con i luoghi
// cliccabili per centrarli sulla mappa. Visibile solo con una giornata
// selezionata e almeno un conflitto; chiusura manuale fino al prossimo
// aggiornamento (cambio stella o di giornata).
function vaiAlLuogo(id) {
  const luogo = datiCorrenti().find((l) => l.id === id);
  const marker = markerPerId.get(id);
  if (!luogo || !marker) return;
  map.setView([luogo.lat, luogo.lon], 17, { animate: true });
  marker.openPopup();
  evidenziaCardLista(id);
}

// Aggiorna il riepilogo unico dei conflitti sopra la lista: UNA riga per
// GRUPPO di luoghi in conflitto («ODEON confligge con BASILICA e LICEO»):
// i gruppi sono le componenti connesse del grafo dei conflitti tra stellati,
// così ogni località compare una volta sola nel pannello anche quando le
// coppie sono tante. Il soggetto della riga è il luogo con più conflitti del
// gruppo (a parità, il primo nei dati); tutti i nomi sono cliccabili per
// centrarli sulla mappa. Visibile solo con una giornata selezionata e almeno
// un conflitto; se l'utente lo ha nascosto con «Nascondi» resta chiuso fino
// al prossimo aggiornamento (cambio di stella o di giornata).
function aggiornaRiepilogoConflitti() {
  riepilogoConflittiEl.hidden = true;
  riepilogoListaEl.innerHTML = "";
  if (!giornoFiltro) return;
  const lista = datiCorrenti();
  // grafo non orientato dei conflitti tra luoghi stellati
  const adiac = new Map();
  for (const l of lista) {
    for (const c of conflittiPerLuogo(l.id, lista)) {
      if (!adiac.has(l.id)) adiac.set(l.id, new Set());
      if (!adiac.has(c.idAltro)) adiac.set(c.idAltro, new Set());
      adiac.get(l.id).add(c.idAltro);
      adiac.get(c.idAltro).add(l.id);
    }
  }
  if (adiac.size === 0) return;
  // componenti connesse (BFS)
  const visti = new Set();
  const gruppi = [];
  for (const id of adiac.keys()) {
    if (visti.has(id)) continue;
    const gruppo = [];
    const coda = [id];
    visti.add(id);
    while (coda.length) {
      const cur = coda.pop();
      gruppo.push(cur);
      for (const n of adiac.get(cur)) {
        if (!visti.has(n)) { visti.add(n); coda.push(n); }
      }
    }
    gruppi.push(gruppo);
  }
  const nomi = new Map(lista.map((l) => [l.id, campo(l, "title")]));
  const ordine = new Map(lista.map((l, i) => [l.id, i]));
  const righe = gruppi.map((gruppo) => {
    const soggetto = [...gruppo].sort(
      (a, b) => (adiac.get(b).size - adiac.get(a).size) || (ordine.get(a) - ordine.get(b))
    )[0];
    const altri = gruppo.filter((id) => id !== soggetto)
      .sort((a, b) => ordine.get(a) - ordine.get(b));
    const elenco = altri.map((id, i) =>
      (i === 0 ? "" : i === altri.length - 1 ? " e " : ", ") + btnLuogoRiepilogo(id, nomi.get(id))
    ).join("");
    return `<p>⚠ ${btnLuogoRiepilogo(soggetto, nomi.get(soggetto))} in conflitto con ${elenco}</p>`;
  });
  riepilogoTitoloEl.textContent = `Conflitti d'orario — ${ETICHETTA_GIORNO[giornoFiltro]}`;
  riepilogoListaEl.innerHTML = righe.join("");
  riepilogoConflittiEl.hidden = riepilogoChiuso;
}

// Nome del luogo nel riepilogo, cliccabile per centrarlo sulla mappa.
function btnLuogoRiepilogo(id, titolo) {
  return `<button class="vai-conflitto" data-vai-conflitto="${id}" type="button">${titolo}</button>`;
}

// Nasconde il riepilogo fino al prossimo aggiornamento (cambio stella o di
// giornata): non persistito, al refresh della pagina torna visibile.
let riepilogoChiuso = false;
chiudiConflittiBtn.addEventListener("click", () => {
  riepilogoChiuso = true;
  riepilogoConflittiEl.hidden = true;
});

// Click su un nome nel riepilogo: centra il luogo sulla mappa.
riepilogoListaEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-vai-conflitto]");
  if (btn) vaiAlLuogo(btn.dataset.vaiConflitto);
});

// Mappa → lista (richiesta esplicita, soprattutto mobile): quando si apre il
// popup di un marker, la lista scorre fino alla card di quel luogo e la
// evidenzia per qualche istante. La card nascosta dai filtri di ricerca non
// si può mostrare: in quel caso si lascia tutto com'è.
function evidenziaCardLista(id) {
  const card = listEl.querySelector(`.card[data-id="${id}"]`);
  if (!card || card.classList.contains("nascosta")) return;
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  card.classList.remove("evidenzia");
  void card.offsetWidth; // riavvia l'animazione anche su click ripetuti
  card.classList.add("evidenzia");
  clearTimeout(card.__timerEvidenzia);
  card.__timerEvidenzia = setTimeout(() => card.classList.remove("evidenzia"), 2200);
}

function applicaFiltro() {
  const q = (searchEl.value || "").trim().toLowerCase();
  const lista = datiCorrenti();
  let visibili = 0;
  for (const card of listEl.children) {
    const luogo = lista.find((l) => l.id === card.dataset.id);
    // la ricerca guarda solo titolo, indirizzo e orari, non gli avvisi di conflitto
    const testo = [...card.querySelectorAll(".card-title, .card-addr, .card-when")]
      .map((el) => el.textContent)
      .join(" ")
      .toLowerCase();
    // le card EXTRA (da posizionare / escluse, sezione admin in fondo) restano
    // sempre visibili: servono per 🎯 e ↺, non devono sparire col filtro giorno
    const extra = card.classList.contains("da-posizionare") || card.classList.contains("esclusa");
    const mostra =
      (!q || testo.includes(q)) &&
      (extra || (!luogo || visibileNelFiltro(luogo)));
    card.classList.toggle("nascosta", !mostra);
    if (mostra && !extra) visibili++;
  }
  conteggioEl.textContent = `(${visibili}/${lista.length})`;
  applicaFiltroMarker();
}

// Aggiunge/toglie un luogo dal tour DELLA GIORNATA selezionata (le stelle non
// esistono in «Tutti») e aggiorna card, popup e contatori.
function toggleScelta(id) {
  if (!giornoFiltro) return;
  const ins = scelteDelGiorno();
  if (ins.has(id)) ins.delete(id);
  else ins.add(id);
  salvaScelte();
  renderLista();
  refreshConflitti();
  aggiornaColoriMarker();
}

// «✕» accanto al segnalibro: esclude la tappa SOLO dalla GIORNATA
// selezionata (richiesta utente: «voglio cancellare da venerdì, ma poi
// l'ho visitata domenica»; con segnalibro su sabato e ✕ di domenica la
// versione che escludeva «tutti i giorni non preferiti» cancellava troppo).
// Reversibile con «↺ Ripristina» in fondo alla lista (o in «Tutti» per tutti
// i giorni). I DATI importati NON vengono toccati. La ✕ resta sotto password.
function eliminaTappa(id) {
  if (!adminSbloccato) return; // solo a pannello sbloccato
  if (!giornoFiltro) return; // la ✕ esiste solo nelle viste di giorno
  const luogo = datiCompleti().find((l) => l.id === id);
  if (!luogo) return;
  const titolo = campo(luogo, "title");
  if (scelte[giornoFiltro].has(id)) {
    // preferito del giorno corrente: togli solo quello (come il clic sul segnalibro)
    scelte[giornoFiltro].delete(id);
    esclusioni[giornoFiltro].delete(id);
    salvaScelte();
    salvaEsclusioni();
    bannerAutochiudente(`↺ «${titolo}» tolta dal piano di ${ETICHETTA_GIORNO[giornoFiltro]}.`);
  } else {
    esclusioni[giornoFiltro].add(id);
    salvaEsclusioni();
    const conStella = Object.keys(scelte).filter((g) => scelte[g].has(id));
    bannerAutochiudente(
      `✕ «${titolo}» esclusa da ${ETICHETTA_GIORNO[giornoFiltro]}.` +
        (conStella.length ? ` Resta nei giorni: ${conStella.map((g) => ETICHETTA_GIORNO[g]).join(", ")} (segnalibro).` : "") +
        " Ripristino con ↺ in fondo alla lista."
    );
  }
  // il marker sparisce dalle viste dove il luogo è escluso
  renderLista();
  refreshConflitti();
  applicaFiltroMarker();
}

// «↺ Ripristina» su una card esclusa: rimette il luogo nel piano (del giorno
// della vista, o di tutti i giorni in vista «Tutti»). Reversibile come la ✕.
function ripristinaTappa(id) {
  if (!adminMode()) return;
  const luogo = datiCompleti().find((l) => l.id === id);
  if (!luogo) return;
  const giorni = giornoFiltro ? [giornoFiltro] : Object.keys(esclusioni);
  let tolti = 0;
  for (const g of giorni) {
    if (esclusioni[g].delete(id)) tolti++;
  }
  salvaEsclusioni();
  if (tolti) {
    bannerAutochiudente(
      `↺ «${campo(luogo, "title")}» ripristinata ${giornoFiltro ? "in " + ETICHETTA_GIORNO[giornoFiltro] : "in tutti i giorni"}.`
    );
  }
  renderLista();
  refreshConflitti();
  applicaFiltroMarker();
}

// «Reset segnalibri»: svuota i segnalibri della GIORNATA selezionata o, in
// vista «Tutti», del tour INTERO (richiesto: la vista generale serve anche
// per svuotare tutto il tour rifatto da capo). Sempre con conferma.
function resetScelte() {
  const inGiorno = giornoFiltro ? (scelte[giornoFiltro]?.size ?? 0) : 0;
  const tot = totScelte();
  if (!giornoFiltro && tot === 0) return;
  if (giornoFiltro && inGiorno === 0) return;
  const msg = !giornoFiltro
    ? `Rimuovere tutti i ${tot} segnalibri dal tour (tutti i giorni)?`
    : `Rimuovere ${inGiorno} segnalibri dal tour di ${ETICHETTA_GIORNO[giornoFiltro]}?`;
  if (!confirm(msg)) return;
  if (giornoFiltro) scelte[giornoFiltro].clear();
  else for (const ins of Object.values(scelte)) ins.clear();
  salvaScelte();
  renderLista();
  refreshConflitti();
  aggiornaColoriMarker();
}

// Rinfresca riepilogo conflitti e contatori del tour (gli avvisi non stanno
// più sulle singole card: tutto nel pannello sopra la lista).
function refreshConflitti() {
  const lista = datiCorrenti();
  // ogni aggiornamento (stella aggiunta/tolta, cambio giornata) riapre il
  // riepilogo: «Nascondi» vale solo finché i dati non cambiano
  riepilogoChiuso = false;
  for (const [id, marker] of markerPerId) {
    const popup = marker.getPopup();
    const luogo = lista.find((l) => l.id === id);
    if (popup?.isOpen() && luogo) popup.setContent(creaContenutoPopup(luogo));
  }
  const nConflitti = lista.filter((l) => conflittiPerLuogo(l.id, lista).length > 0).length;
  conflittiCountEl.hidden = nConflitti === 0;
  conflittiCountEl.textContent = `⚠ ${nConflitti} in conflitto`;
  aggiornaRiepilogoConflitti();
  // con un giorno attivo il contatore riguarda solo quel giorno; in «Tutti» la somma
  const nScelte = giornoFiltro ? scelteDelGiorno().size : totScelte();
  tourCountEl.hidden = nScelte === 0;
  // innerHTML (non textContent): il segnalibro è un SVG inline
  tourCountEl.innerHTML = giornoFiltro
    ? `${SEGNALIBRO_SVG} ${ETICHETTA_GIORNO[giornoFiltro]}: ${nScelte}`
    : `${SEGNALIBRO_SVG} nel tour: ${nScelte}`;
  aggiornaResetScelte();
  aggiornaResetFiltri();
}

// «Reset segnalibri» accanto ai filtri di giornata: visibile con almeno un
// segnalibro nella vista corrente (quel giorno, o tutti in «Tutti»).
function aggiornaResetScelte() {
  resetScelteBtn.hidden = giornoFiltro
    ? (scelte[giornoFiltro]?.size ?? 0) === 0
    : totScelte() === 0;
}

// «Reset filtri» (torna a «Tutti» + azzera ricerca): ha senso solo se si è
// in una vista di giorno; in «Tutti» è nascosto perché non c'è nulla da
// resettare.
function aggiornaResetFiltri() {
  resetBtn.hidden = !giornoFiltro;
}

// Sblocco/blocco del tasto «✕»: password giusta → le card mostrano «✕» nelle
// viste di giornata; sbagliata → il campo si svuota e trema. Il click sul
// campo da sbloccato richiude (torna password). Non persistito: al refresh
// si torna bloccati.
function aggiornaStatoAdmin() {
  adminPassEl.classList.toggle("sbloccato", adminSbloccato);
  if (adminSbloccato) {
    adminPassEl.type = "text";
    adminPassEl.value = "🔓";
    adminPassEl.title = "Impostazioni e cancellazione abilitate — clicca per ribloccare";
  }
  // barra admin e card «da posizionare»: visibili solo a pannello sbloccato
  // (o con ?impostazioni=1)
  aggiornaAdminUI();
  renderLista();
}

adminPassEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (adminSbloccato) {
    // riblocca
    adminSbloccato = false;
    adminPassEl.type = "password";
    adminPassEl.value = "";
    adminPassEl.title = "Password per abilitare il tasto di cancellazione (✕)";
    adminPassEl.classList.remove("sbloccato");
    aggiornaStatoAdmin();
    return;
  }
  if (adminPassEl.value === PASSWORD_ADMIN) {
    adminSbloccato = true;
    adminPassEl.classList.remove("errore");
    aggiornaStatoAdmin();
  } else {
    adminPassEl.classList.remove("errore");
    void adminPassEl.offsetWidth; // riparte l'animazione anche su errori consecutivi
    adminPassEl.classList.add("errore");
    adminPassEl.select();
  }
});
adminPassEl.addEventListener("input", () => {
  adminPassEl.classList.remove("errore");
});
adminPassEl.addEventListener("click", () => {
  if (adminSbloccato) {
    adminSbloccato = false;
    adminPassEl.type = "password";
    adminPassEl.value = "";
    adminPassEl.title = "Password per abilitare il tasto di cancellazione (✕)";
    adminPassEl.classList.remove("sbloccato");
    aggiornaStatoAdmin();
  }
});

function renderLista() {
  // Nelle viste di giornata la lista segue l'orario: prima card = luogo che
  // apre prima quel giorno (prima fascia presente nei dati). In «Tutti»
  // l'ordine resta quello di data.js (alfabetico, come la lista originale).
  let dati = datiCorrenti();
  if (giornoFiltro) {
    dati = [...dati].sort((a, b) => {
      const oa = primaOraNelGiorno(a);
      const ob = primaOraNelGiorno(b);
      if (oa === null && ob === null) return 0;
      if (oa === null) return 1; // orari non interpretabili: in fondo
      if (ob === null) return -1;
      return oa - ob;
    });
  }
  // In modalità admin, in fondo alla lista (sezione «ripristino») vanno:
  //  - i luoghi SENZA coordinate (con 🎯 Posiziona)
  //  - i luoghi ESCLUSI dal piano (con ↺ Ripristina): nel giorno della vista
  //    (esclusi da quel giorno) o in «Tutti» (esclusi da QUALSIASI giorno).
  // Senza admin si comportano come prima: le escluse spariscono dalle viste.
  // NB: si itera su datiCompleti() perché datiCorrenti() NON contiene i luoghi
  // senza coordinate (vengono filtrati lì): qui invece devono stare in lista.
  const main = [];
  const extra = [];
  for (const l of datiCompleti()) {
    const senzaCoord = l.lat == null || l.lon == null;
    const visibileNelGiorno = !giornoFiltro || visibileNelFiltro(l);
    const esclusa = giornoFiltro ? esclusaDalGiorno(l.id) : esclusaSempre(l.id);
    if (senzaCoord) extra.push(creaCard(l, true, false));
    else if (esclusa && adminMode()) extra.push(creaCard(l, false, true));
    else if (visibileNelGiorno) main.push(creaCard(l, false, false));
  }
  listEl.replaceChildren(...[...main, ...extra]);
  applicaFiltro();
}

listEl.addEventListener("click", (e) => {
  const star = e.target.closest("[data-scelta]");
  if (star) {
    toggleScelta(star.dataset.scelta);
    return;
  }
  const del = e.target.closest("[data-elimina]");
  if (del) {
    eliminaTappa(del.dataset.elimina);
    return;
  }
  const rip = e.target.closest("[data-ripristina]");
  if (rip) {
    ripristinaTappa(rip.dataset.ripristina);
    return;
  }
  const pos = e.target.closest("[data-posiziona]");
  if (pos) {
    avviaPosizionamento(pos.dataset.posiziona);
    return;
  }
  const btn = e.target.closest("[data-vai]");
  if (btn) vaiAlLuogo(btn.dataset.vai);
});
searchEl.addEventListener("input", applicaFiltro);
// «Reset filtri»: torna alla vista «Tutti» + azzera la ricerca; utile solo
// quando si è in una vista di giorno (in «Tutti» il pulsante è nascosto:
// non c'è nulla da azzerare).
resetBtn.addEventListener("click", () => {
  searchEl.value = "";
  giornoFiltro = "";
  for (const b of document.querySelectorAll(".giorno-btn"))
    b.classList.toggle("attivo", b.dataset.giorno === "");
  renderLista(); // si torna a «Tutti»: via le stelle e gli avvisi di conflitto
  refreshConflitti();
  applicaFiltroMarker(); // i marker tornano tutti blu (giornoFiltro = "")
});

resetScelteBtn.addEventListener("click", resetScelte);

// filtro per giornata: card e marker degli altri giorni nascosti
document.querySelectorAll(".giorno-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    giornoFiltro = btn.dataset.giorno;
    for (const b of document.querySelectorAll(".giorno-btn"))
      b.classList.toggle("attivo", b === btn);
    renderLista(); // le stelle (e i conflitti) si mostrano/nascondono col cambio giorno
    refreshConflitti();
  });
});

// ---------- contatore tappe da posizionare (solo in modalità admin) ----------
function adminMode() {
  return adminSbloccato || accessoImpostazioni;
}

function aggiornaBadgeVerifica() {
  const senzaCoord = datiCompleti().filter((l) => l.lat == null || l.lon == null).length;
  contatoreEl.hidden = senzaCoord === 0 || !adminMode();
  contatoreEl.title = "Tappe senza coordinate: clicca 🎯 sulla card per posizionarle sulla mappa";
  contatoreEl.textContent = `⚠ ${senzaCoord} da posizionare`;
}

// ---------- posizionamento sulla mappa (coda automatica dopo l'import, o singolo luogo) ----------
let codaPosizionamento = []; // id dei luoghi ancora senza coordinate
let posizionaCorrente = null; // id del luogo che aspetta il click sulla mappa
let bannerRiepilogo = ""; // riepilogo dell'ultimo import, mostrato sopra il prompt
let bannerTimer = null;

function mostraBanner(testo, conAzioni) {
  clearTimeout(bannerTimer);
  posizionaBanner.hidden = false;
  posizionaTesto.textContent = testo;
  posizionaSalta.hidden = !conAzioni;
  posizionaAnnulla.hidden = !conAzioni;
}

function bannerAutochiudente(testo, ms = 7000) {
  mostraBanner(testo, false);
  bannerTimer = setTimeout(() => { posizionaBanner.hidden = true; }, ms);
}

function fermaPosizionamento() {
  codaPosizionamento = [];
  posizionaCorrente = null;
  posizionaBanner.hidden = true;
}

async function prossimaPosizione() {
  const id = codaPosizionamento.shift();
  posizionaCorrente = id ?? null;
  if (!id) {
    // fine coda: il messaggio dipende da quanto è rimasto indietro (Salti)
    const rimasti = datiCompleti().filter((l) => l.lat == null || l.lon == null);
    bannerAutochiudente(
      bannerRiepilogo +
        (rimasti.length
          ? `\n⚠ ${rimasti.length} ${rimasti.length === 1 ? "luogo resta" : "luoghi restano"} senza coordinate: usa 🎯 sulla sua card quando vuoi posizionarl${rimasti.length === 1 ? "o" : "i"}.`
          : "\n✓ Tutti i luoghi hanno le coordinate."),
      9000
    );
    bannerRiepilogo = "";
    aggiornaTutto();
    return;
  }
  const l = datiCompleti().find((x) => x.id === id);
  // PRIMA la geocodifica (indirizzo e nome), poi il click sulla mappa: se
  // Nominatim risolve il luogo non serve che l'utente lo piazzzi a mano
  mostraBanner(
    (bannerRiepilogo ? bannerRiepilogo + "\n" : "") +
      `🔎 Cerco «${l?.title ?? id}» su OpenStreetMap…`,
    false
  );
  const trovato = await riprovaGeocodifica(id);
  if (posizionaCorrente !== id) return; // annullata nel frattempo
  if (trovato) {
    prossimaPosizione(); // il prossimo della coda (anche la fine)
    return;
  }
  posizionaCorrente = id;
  mostraBanner(
    (bannerRiepilogo ? bannerRiepilogo + "\n" : "") +
      `📍 Posiziona «${l?.title ?? id}» sulla mappa: clicca il punto esatto.` +
      (codaPosizionamento.length ? ` (${codaPosizionamento.length} dopo questo)` : ""),
    true
  );
  aggiornaTutto();
}

function avviaPosizionamento(id) {
  codaPosizionamento = [id];
  prossimaPosizione();
}

posizionaSalta.addEventListener("click", () => prossimaPosizione());
posizionaAnnulla.addEventListener("click", () => {
  bannerRiepilogo = "";
  fermaPosizionamento();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && posizionaCorrente) {
    bannerRiepilogo = "";
    fermaPosizionamento();
  }
});

// clic sulla mappa in modalità posizionamento: imposta le coordinate del luogo
map.on("click", (e) => {
  if (!posizionaCorrente) return;
  applicaCoordinate(posizionaCorrente, e.latlng.lat, e.latlng.lng);
  prossimaPosizione();
});

// Coordinate trovate (dalla mappa o da Nominatim): salvate come correzione
// (valgono per tutti i dispositivi via Esporta/Importa stato).
function applicaCoordinate(id, lat, lon) {
  correzioni[id] = { ...(correzioni[id] ?? {}), lat, lon };
  salvaCorrezioni();
  ricostruisciMarker(); // il luogo può non avere ancora un marker
}

// Per il luogo corrente si riprova PRIMA la geocodifica (richiesta utente: se
// «Disciplina» sta sulla mappa non c'è motivo di farla pescare a mano): con
// l'indirizzo e, in ripiego, col nome del luogo (Nominatim risolve spesso anche
// solo i toponimi: «Palazzo…», chiese, ecc.). Ritorna true se ha trovato.
async function riprovaGeocodifica(id) {
  const l = datiCompleti().find((x) => x.id === id);
  if (!l) return false;
  const candidati = [[campo(l, "address"), campo(l, "title")], [null, campo(l, "title")]].filter((c) => c[0] || c[1]);
  for (const [ind, tit] of candidati) {
    const coord = await geocodifica(ind, tit);
    if (coord) {
      applicaCoordinate(id, coord.lat, coord.lon);
      return true;
    }
  }
  return false;
}

function aggiornaTutto() {
  // aggiorna liste e marker senza ricostruire la mappa
  datiCorrenti().forEach((l) => aggiornaMarker(l));
  renderLista();
  refreshConflitti();
  aggiornaBadgeVerifica();
}

// Gli strumenti admin stanno NELLA PAGINA PRINCIPALE: la barra #adminBar
// appare sotto l'header dopo lo sblocco con password (o con ?impostazioni=1,
// o il vecchio ?verifica=1, storico).
function aggiornaAdminUI() {
  adminBar.hidden = !adminMode();
  if (accessoImpostazioni && !posizionaCorrente && codaPosizionamento.length === 0) {
    const vai = new URLSearchParams(location.search).get("vai");
    if (!vai) {
      // apertura diretta via URL: si offre il posizionamento di chi non ce l'ha
      const daPosizionare = datiCompleti().filter((l) => l.lat == null || l.lon == null);
      if (daPosizionare.length) {
        bannerRiepilogo = "⚠ " + daPosizionare.length + " luoghi senza coordinate.";
        codaPosizionamento = daPosizionare.map((l) => l.id);
        prossimaPosizione();
      }
    }
  }
}

// ---------- import: fonte primaria dei dati ----------
//  - «📄 Importa HTML»: il file «My tour» salvato come HTML dal browser.
// Risultato: aggiorna orari/indirizzi, ripristina tappe cancellate per errore,
// aggiunge località nuove (geocodificate via Nominatim).

function mostraImportMsg(testo, tipo = "ok") {
  // riga di stato sotto i pulsanti nella barra admin (richiesta: il messaggio
  // galleggiante sopra la mappa era di difficile lettura). Gli errori restano
  // visibili finché l'utente non riparte; i messaggi normali pure.
  if (tipo === "err") {
    bannerRiepilogo = "";
    fermaPosizionamento();
  }
  importStatoEl.hidden = false;
  importStatoEl.textContent = (tipo === "err" ? "⚠ " : "⏳ ") + testo;
  importStatoEl.classList.toggle("stato-err", tipo === "err");
}

function riepilogoImport(res) {
  ricostruisciMarker();
  aggiornaTutto();
  bannerRiepilogo = res.messaggi.join("\n");
  // niente coda di posizionamento automatica (richiesta: l'import non deve
  // aspettare la mappa): si segnala SOLO chi non è stato trovato, il "+ usa
  // 🎯" indica che si posiziona poi dalla lista, a ritmo dell'utente.
  // Il riepilogo va nella riga di stato sotto i pulsanti (tested: leggere).
  importStatoEl.hidden = false;
  importStatoEl.textContent = "ℹ️ " + bannerRiepilogo + "\n🎯 I luoghi ⚠ si posizionano poi dalla lista: pulsante 🎯 sulla loro card.";
  importStatoEl.classList.remove("stato-err");
  bannerRiepilogo = "";
}

// click su una zona = apre il selettore file/cartella nascosto dentro la label
zonaFotoEl.addEventListener("click", () => importFotoInput.click());
zonaFileEl.addEventListener("click", () => importFileInput.click());

// Zona 1 (OPZIONALE): cartella foto «…_files» del salvataggio browser. I file
// restano QUI finché l'utente preme «⬇ Esegui import», che li consuma e azzera
// la selezione (le etichette di stato si aggiornano con aggiornaZoneImport()).
let fileFotoSelezionati = [];
let fileHtmlSelezionato = null;
importFotoInput.addEventListener("change", () => {
  const tutti = [...(importFotoInput.files ?? [])];
  fileFotoSelezionati = tutti.filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name) && /\d+/.test(f.name));
  importFotoInput.value = ""; // riscegliere la stessa cartella: riparte l'evento
  aggiornaZoneImport();
  if (fileFotoSelezionati.length)
    bannerAutochiudente(`🖼 ${fileFotoSelezionati.length - 3} immagini nella cartella (− 3 icone del sito): ora premi «⬇ Esegui import» (il file HTML va scelto prima).`, 6000);
});

// Zona 2 (fondamentale): il file .html di «My tour». NON lo si consuma subito:
// l'import parte col click su «⬇ Esegui import» (e il reimport dello stesso
// file resta possibile rimandando l'import a «⬇ Esegui import»).
importFileInput.addEventListener("change", () => {
  fileHtmlSelezionato = importFileInput.files?.[0] ?? null;
  importFileInput.value = ""; // riscegliere lo stesso file: riparte l'evento
  aggiornaZoneImport();
});

// stato visivo delle due zone + abilitazione di «Esegui import»
function aggiornaZoneImport() {
  zonaFotoEl.classList.toggle("piena", fileFotoSelezionati.length > 0);
  zonaFotoTestoEl.textContent = fileFotoSelezionati.length
    ? `✅ ${fileFotoSelezionati.length - 3} immagini pronte (− 3 icone)`
    : "nessuna cartella scelta (import senza miniature)";
  zonaFileEl.classList.toggle("piena", !!fileHtmlSelezionato);
  zonaFileTestoEl.textContent = fileHtmlSelezionato
    ? `✅ ${fileHtmlSelezionato.name}`
    : "nessun file scelto";
  eseguiImportBtn.disabled = !fileHtmlSelezionato;
}

// Miniatura da file locale: ridimensiona via canvas a 200 px e produce un
// data URL (l'immagine viaggia dentro i dati dell'import: niente richieste
// remote, niente 403, funziona offline e su mobile). Ritorna stringa o null.
function miniaturaDaFile(file, codice) {
  return new Promise((resolve) => {
    // match nome file → codice scheda: «490_5188.jpeg» → 490 (i file della
    // cartella _files portano il codice davanti, come sul sito)
    if (!file || !file.name.startsWith(codice + "_")) return resolve(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scala = Math.min(1, 200 / img.naturalWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scala);
        canvas.height = Math.round(img.naturalHeight * scala);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// «⬇ Esegui import»: il pulsante lancia l'import con le DUE selezioni delle
// zone sopra (file HTML obbligatorio, cartella foto opzionale). Fallisce con
// avviso se il file HTML manca (la cartella non basta da sola).
eseguiImportBtn.addEventListener("click", async () => {
  if (!fileHtmlSelezionato) {
    mostraImportMsg(
      "Manca il file HTML: 1) sul sito openhousenapoli.org, autenticato, apri la pagina «My tour»; 2) salvala in formato HTML (Ctrl+S o Salva con nome, «Pagina web, completa»); 3) qui riempi la zona «📄 File HTML» (la cartella foto è opzionale, serve solo per le miniature). La procedura completa è sopra le zone.",
      "err"
    );
    return;
  }
  await eseguiImport(fileHtmlSelezionato);
});

// import del file .html (con o senza cartella immagini): estrazione, conferma,
// abbinamento immagini → data URL, applicaImport e riepilogo SOLO avvisi 🎯.

// Stima «fino a ~N sec.» per la geocodifica: ogni richiesta a Nominatim rispetta
// la pausa di 1,1 s; per ogni luogo MANCANTE di coordinate si provano fino a
// 4 varianti d'indirizzo (2 basi × 2 suffissi) = fino a ~4,4 s ciascuno; per i
// luoghi già posizionati nessun tentativo. La stima è il caso peggiore.
function stimaSecondiGeocodifica(estrazione) {
  const dati = datiImportati ?? luoghi;
  const titoli = new Set(dati.map((l) => normalizzaTitolo(l.title)));
  const daGeocodificare = estrazione.filter((p) => !titoli.has(normalizzaTitolo(p.titolo))).length;
  return Math.max(4.4, daGeocodificare * 4.4);
}
async function eseguiImport(file) {
  const testo = await file.text();
  const estrazione = estraiLuoghiDaHTML(testo);
  if (!estrazione.length) {
    mostraImportMsg(
      "Nessun luogo riconosciuto nel file «" + file.name + "». La procedura corretta:\n" +
        "1) sul sito openhousenapoli.org, autenticato, apri la pagina «My tour» (i tuoi preferiti);\n" +
        "2) salva la pagina in formato HTML (Ctrl+S, tipo «Pagina web, completa»);\n" +
        "3) qui riempi la zona «📄 File HTML» e premi «⬇ Esegui import» (cartella foto opzionale, per le miniature).",
      "err"
    );
    return;
  }
  const conFoto = fileFotoSelezionati.length > 0;
  if (
    !confirm(
      "Importare " + estrazione.length + " località dal file «" + file.name + "»?" +
        (conFoto ? "\n(con " + (fileFotoSelezionati.length - 3) + " immagini dalla cartella (− 3 icone del sito): diventano miniature incorporate)"
                 : "\n(senza cartella immagini: luoghi senza miniature)" ) +
        "\n\n- orari e indirizzi vengono allineati alla fonte\n" +
        "- le località nuove vengono geocodificate (Nominatim, poi click sulla mappa)\n" +
        "- le tappe cancellate per errore tornano nell'elenco\n" +
        "- i luoghi non geocodificati si segnalano e si posizionano poi con 🎯 dalla lista"
    )
  )
    return;
  mostraImportMsg("Import in corso (geocodifica dei luoghi nuovi: fino a ~" + stimaSecondiGeocodifica(estrazione) + " sec.)…");
  try {
    const fotoPerCodice = new Map();
    for (const p of estrazione) {
      if (!p.foto) continue;
      const fileFoto = fileFotoSelezionati.find((f) => f.name === p.foto);
      if (!fileFoto) continue;
      const dataUrl = await miniaturaDaFile(fileFoto, p.codice);
      if (dataUrl) fotoPerCodice.set(p.codice, dataUrl);
    }
    riepilogoImport(await applicaImport(estrazione, fotoPerCodice));
  } catch (e) {
    mostraImportMsg("Errore durante l'import: " + e.message, "err");
  } finally {
    // le selezioni si consumano a import riuscito (o errore): le zone tornano
    // vuote e «Esegui import» si disabilita finché non si risceglie il file
    fileFotoSelezionati = [];
    fileHtmlSelezionato = null;
    aggiornaZoneImport();
  }
}

// trasferimento stato PC ↔ mobile: esporta dati importati + correzioni + scelte
function scaricaJSON(nome, oggetto) {
  const blob = new Blob([JSON.stringify(oggetto, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}

esportaStatoBtn.addEventListener("click", () => {
  const data = new Date().toISOString().slice(0, 10);
  scaricaJSON("mytour-stato-" + data + ".json", {
    versione: 2,
    esportato: new Date().toISOString(),
    datiImportati,
    correzioni,
    scelte: Object.fromEntries(Object.entries(scelte).map(([g, ins]) => [g, [...ins]])),
    esclusioni: Object.fromEntries(Object.entries(esclusioni).map(([g, ins]) => [g, [...ins]])),
  });
});

importaStatoBtn.addEventListener("click", () => importaStatoInput.click());

// «🗑 Svuota dati»: riparte pulito per la nuova edizione (richiesta utente:
// «di anno in anno si ricomincia pulito»). Cancella TUTTI i dati locali
// (dati importati, correzioni, segnalibri, esclusioni): data.js vuoto non
// mostra nulla; la lista si ripopola con l'import. Con conferma.
svuotaDatiBtn.addEventListener("click", () => {
  if (!confirm(
    "Svuotare TUTTI i dati?\n\n" +
      "- dati importati (le località del tour)\n" +
      "- correzioni di coordinate e testi\n" +
      "- segnalibri (il piano dei 3 giorni)\n" +
      "- esclusioni\n\n" +
      "L'app riparte vuota: si ricarica con l'import (dal sito o file HTML)."
  )) return;
  for (const k of [STORAGE_IMPORTATI, STORAGE_KEY, STORAGE_SCELTE, STORAGE_ESCLUSIONI])
    localStorage.removeItem(k);
  location.replace(location.pathname); // riparte pulito (senza ?reset=1 in cronologia)
});

importaStatoInput.addEventListener("change", async () => {
  const file = importaStatoInput.files?.[0];
  if (!file) return;
  importaStatoInput.value = "";
  let stato;
  try {
    stato = JSON.parse(await file.text());
  } catch {
    alert("File non leggibile: deve essere un JSON esportato con «⬇ Esporta stato».");
    return;
  }
  if (!stato || typeof stato !== "object" || (stato.datiImportati && !Array.isArray(stato.datiImportati))) {
    alert("Struttura non riconosciuta: deve essere un JSON esportato con «⬇ Esporta stato».");
    return;
  }
  if (!confirm("Sostituire i dati locali (dati importati, correzioni e scelte) con quelli del file «" + file.name + "»?"))
    return;
  localStorage.setItem(STORAGE_IMPORTATI, JSON.stringify(stato.datiImportati ?? []));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stato.correzioni ?? {}));
  const scelteArr = stato.scelte ?? {};
  localStorage.setItem(
    STORAGE_SCELTE,
    JSON.stringify(Object.fromEntries(Object.entries(scelteArr).map(([g, arr]) => [g, arr])))
  );
  const esclusioniArr = stato.esclusioni ?? {};
  localStorage.setItem(
    STORAGE_ESCLUSIONI,
    JSON.stringify(Object.fromEntries(Object.entries(esclusioniArr).map(([g, arr]) => [g, arr])))
  );
  location.reload();
});

// il popup sulla mappa evidenzia la card corrispondente nella lista
map.on("popupopen", (e) => {
  const id = [...markerPerId.entries()].find(([, m]) => m === e.popup._source)?.[0];
  if (!id) return;
  evidenziaCardLista(id); // la lista segue il marker (non il viceversa: c'è già «📍 Vai»)
});

// ---------- avvio ----------
aggiornaAdminUI();
renderLista();
refreshConflitti();
aggiornaBadgeVerifica();
