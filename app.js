// App «My OHN Tour» — mappa OpenStreetMap dei luoghi di Open House Napoli.
// Fonte primaria dei dati = IMPORT (fetch di preferiti.php dal sito OHN con le
// tue credenziali, o file HTML «My tour» salvato): ha priorità su data.js e può
// aggiornare orari, ripristinare tappe cancellate e aggiungere località nuove
// (geocodificate via Nominatim). La ✕ cancella NEI DATI (validi per tutti i
// dispositivi, replicabili con Esporta/Importa stato); data.js è il seed iniziale.
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
const verificaBtn = document.getElementById("verificaBtn");
const verificaPanel = document.getElementById("verificaPanel");
const verificaList = document.getElementById("verificaList");
const chiudiVerifica = document.getElementById("chiudiVerifica");
const exportBtn = document.getElementById("exportBtn");
const importSitoBtn = document.getElementById("importSitoBtn");
const importFileBtn = document.getElementById("importFileBtn");
const importFileInput = document.getElementById("importFileInput");
const importBox = document.getElementById("importBox");
const importMsg = document.getElementById("importMsg");
const esportaStatoBtn = document.getElementById("esportaStatoBtn");
const importaStatoBtn = document.getElementById("importaStatoBtn");
const importaStatoInput = document.getElementById("importaStatoInput");
const ripristinaBtn = document.getElementById("ripristinaBtn");
const adminPassEl = document.getElementById("adminPass");

const STORAGE_KEY = "mytour-mappa-correzioni-v1";
const STORAGE_SCELTE = "mytour-scelte-per-giorno-v1";
// Dati importati (da preferiti.php o file HTML): fonte primaria con priorità su
// data.js. La ✕ cancella da QUI, quindi la cancellazione vale su tutti i
// dispositivi (o si replica con Esporta/Importa stato).
const STORAGE_IMPORTATI = "mytour-dati-importati-v1";
// etichette dei giorni per i contatori («★ sabato: N»)
const ETICHETTA_GIORNO = { ven: "venerdì", sab: "sabato", dom: "domenica" };
const NAPOLI = [40.849, 14.25];
// Segnalibro (richiesta utente: al posto della stella) come SVG inline:
// eredita currentColor → si colora da .star-btn (spento/attivo) senza immagini.
const SEGNALIBRO_SVG = `<svg class="icona-segnalibro" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" fill="currentColor"/></svg>`;
const ETICHETTE_CAMPI = {
  title: "Titolo",
  address: "Indirizzo",
  when: "Quando",
};
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
// Password che abilita il tasto «✕» (rimozione dal tour di tutti i giorni):
// protezione leggera, per lo stesso motivo del pannello ?verifica=1 — il sito
// è condiviso con un amico e il tasto di cancellazione non deve sembrare
// pubblico. NON persistita: al refresh si torna bloccati.
const PASSWORD_ADMIN = "26";
let adminSbloccato = false;

const NOTE_COORDINATE = {
  "05-cantiere-ex-mercato-ittico": "piazza senza numero civico",
  "14-educandato-statale": "«Largo dei Miracoli» non mappato su OSM: coordinate della chiesa del monastero",
  "16-i-non-luoghi-porto": "segnalatore a fine via De Gasperi × Piazza Municipio (confermato dall'utente)",
  "21-liberty-al-vomero": "piazza senza numero civico",
  "28-santa-lucia-borgo": "piazza senza numero civico",
};

// Vista riservata: ?verifica=1 abilita il pannello OCR e il contatore di verifica.
// La costante sta in testa perché serve anche ad aggiornaBadgeVerifica() all'avvio.
const accessoVerifica = new URLSearchParams(location.search).has("verifica");

// ---------- stato ----------
let correzioni = caricaCorrezioni(); // { id: { title?, address?, when?, lat?, lon?, confermato? } }
// stelle del tour gestite PER GIORNATA: mettere ★ con «Sab 3» attivo significa
// «visito quel luogo di sabato»; di domenica la stella non appare (e i suoi
// conflitti di sabato neanche), a meno di metterla anche per domenica.
let scelte = caricaScelte(); // { ven: Set, sab: Set, dom: Set } di id
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
// Due strade che convergono su applicaImport():
//  - «🌐 Importa dal sito»: fetch di preferiti.php (funziona solo nel browser
//    in cui si è fatto l'accesso a Open House; se il sito blocca il CORS si
//    segnala e resta l'altra via);
//  - «📄 Importa HTML»: il file «My tour» salvato come HTML.
// L'import ha PRIORITÀ sui dati interni: aggiorna orari/indirizzi, ripristina
// le tappe cancellate per errore e aggiunge le località nuove (geocodificate).

const PREF_DIRETTI = "https://www.openhousenapoli.org/location/preferiti.php";

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
    luoghi_.push({
      codice,
      titolo: titolo.textContent.trim(),
      indirizzo,
      quando,
      url: "https://www.openhousenapoli.org/location/location.php?l=" + codice,
    });
  }
  return luoghi_;
}

// Geocodifica UN luogo via Nominatim (stessa strategia di geocode.py:
// countrycodes=it, varianti di ripiego). 1 richiesta/secondo rispettata dal
// chiamante (await tra un luogo e l'altro). Ritorna {lat, lon} o null.
async function geocodifica(indirizzo) {
  const pulito = (indirizzo ?? "").replace(/\s+/g, " ").trim();
  if (!pulito) return null;
  const varianti = [pulito + ", Napoli", pulito + ", Napoli, Italia"];
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

// Applica l'import ai dati base: aggiorna orari/indirizzi dalla fonte, ripristina
// le tappe cancellate presenti, aggiunge i luoghi nuovi (geocodificati se
// possibile). Ritorna il riepilogo testuale ({aggiornati, ripristinati, aggiunti,
// senzaCoord, messaggi: []}).
async function applicaImport(estrazione) {
  if (!datiImportati) datiImportati = luoghi.map((l) => ({ ...l }));
  const base = datiImportati;
  const indice = new Map(base.map((l, i) => [normalizzaTitolo(l.title), i]));
  const aggiornati = [];
  const aggiunti = [];
  const senzaCoord = [];
  for (const p of estrazione) {
    const i = indice.get(normalizzaTitolo(p.titolo));
    if (i !== undefined) {
      const l = base[i];
      if (p.quando && p.quando !== l.when) { l.when = p.quando; aggiornati.push(p.titolo); }
      if (p.indirizzo && p.indirizzo !== l.address) { l.address = p.indirizzo; if (!aggiornati.includes(p.titolo)) aggiornati.push(p.titolo); }
      if (l.url && p.url && l.url !== p.url) l.url = p.url;
    } else {
      // luogo nuovo: geocodifica (1,1 s di pausa è dentro geocodifica)
      const coord = await geocodifica(p.indirizzo);
      const nuovo = {
        id: "ohn-" + p.codice,
        title: p.titolo,
        address: p.indirizzo,
        when: p.quando,
        url: p.url,
        ...(coord ?? {}),
      };
      base.push(nuovo);
      indice.set(normalizzaTitolo(p.titolo), base.length - 1);
      if (coord) aggiunti.push(p.titolo);
      else { senzaCoord.push(p.titolo); aggiunti.push(p.titolo); }
      // NB: una tappa cancellata per errore e poi reimportata torna con un
      // nuovo id (ohn-<codice>) e senza miniatura: i dati (orari, indirizzo,
      // url) tornano dalla fonte.
    }
  }
  const messaggi = [];
  if (aggiornati.length) messaggi.push("Orari/indirizzi aggiornati: " + aggiornati.join(", "));
  if (aggiunti.length) messaggi.push("Località aggiunte: " + aggiunti.join(", "));
  if (senzaCoord.length) messaggi.push("⚠ Coordinate non trovate (posizionabile a mano dal pannello): " + senzaCoord.join(", "));
  if (!messaggi.length) messaggi.push("Nessuna differenza: i dati sono già allineati alla fonte.");
  salvaImportati();
  return { aggiornati, aggiunti, senzaCoord, messaggi };
}

// stelle della giornata selezionata (Set vuoto in «Tutti», dove non si scelgono)
function scelteDelGiorno() {
  return (giornoFiltro && scelte[giornoFiltro]) || new Set();
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
  // deduplica: stessa giornata e stessi orari (caso MEA DOMUS nell'OCR originale)
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
  map.invalidateSize();
  map.fitBounds(
    L.latLngBounds(datiCorrenti().map((l) => [l.lat, l.lon])).pad(0.08),
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
function cardHTML(luogo) {
  const thumb = luogo.image
    ? `<img src="${luogo.image}" alt="" loading="lazy" />`
    : "";
  const badge = luogo.needsReview?.length
    ? `<span class="badge-review" title="Campi da verificare: ${luogo.needsReview.join(", ")}">da verificare</span>`
    : "";
  // La stella del tour si vede e si usa solo con una giornata selezionata e
  // vale per QUEL giorno; nella vista «Tutti» le card restano senza stella.
  const scelta = scelteDelGiorno().has(luogo.id);
  // «✕» accanto alla stella: presente nelle viste di giorno SOLO dopo lo
  // sblocco con password (campo 🔒 in alto); funziona anche senza stella e
  // cancella la tappa dalla lista di questo browser (ex «rimuove dal tour»)
  const del = giornoFiltro && adminSbloccato
    ? `<button class="del-btn" type="button" data-elimina="${luogo.id}"
        title="Cancella la tappa dalla lista di questo browser (ripristinabile da ?verifica=1)">✕</button>`
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
      ${badge}
      <button class="vai-btn" type="button" data-vai="${luogo.id}">📍 Vai</button>
      ${star}
      ${del}
    </div>`;
}

function creaCard(luogo) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = luogo.id;
  card.innerHTML = cardHTML(luogo);
  card.querySelector(".card-title").textContent = campo(luogo, "title");
  card.querySelector(".card-addr").textContent = campo(luogo, "address");
  card.querySelector(".card-when").textContent = testoWhenVisualizzato(luogo);
  card.addEventListener("click", (e) => {
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
    const mostra =
      (!q || testo.includes(q)) && (!luogo || visibileNelFiltro(luogo));
    card.classList.toggle("nascosta", !mostra);
    if (mostra) visibili++;
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

// «✕» accanto al segnalibro: CANCELLA la tappa NEI DATI (richiesta
// esplicita: vale per tutti i dispositivi, non solo questo browser). La
// rimozione si applica ai dati base (importati se esistono, altrimenti si crea
// lo storage importati da data.js) e le scelte del tour vengono ripulite.
// Ripristino con l'import (fonte primaria) o da pannello verifica.
// Il tasto esiste solo dopo lo sblocco con password; qui si riverifica in caso
// di richiamo programmatico.
function eliminaTappa(id) {
  if (!adminSbloccato) return;
  const luogo = datiCompleti().find((l) => l.id === id);
  if (!luogo) return;
  if (!confirm(`Cancellare «${campo(luogo, "title")}» dai dati del tour?
La cancellazione vale per tutti i dispositivi; si può ripristinare con l'import
(file HTML o preferiti.php) o dal pannello di verifica.`)) return;
  // nel caso in cui non ci sia ancora un import: si parte da data.js
  if (!datiImportati) datiImportati = luoghi.map((l) => ({ ...l }));
  const idx = datiImportati.findIndex((l) => l.id === id);
  if (idx >= 0) datiImportati.splice(idx, 1);
  salvaImportati();
  for (const ins of Object.values(scelte)) ins.delete(id); // pulizia scelte
  salvaScelte();
  // il marker va rimosso dalla mappa (datiCorrenti non lo contiene più)
  const marker = markerPerId.get(id);
  if (marker) { map.removeLayer(marker); markerPerId.delete(id); }
  renderLista();
  refreshConflitti();
  aggiornaColoriMarker();
  aggiornaBadgeVerifica();
}

// «Reset stelle»: svuota il tour di TUTTI i giorni (le selezioni di prova non
// devono restare nel browser quando il sito viene condiviso).
function resetScelte() {
  const tot = totScelte();
  if (!tot) return;
  if (!confirm(`Rimuovere tutti i ${tot} segnalibri dal tour (tutti i giorni)?`)) return;
  for (const ins of Object.values(scelte)) ins.clear();
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
}

// «Reset stelle» accanto ai filtri di giornata: visibile solo con scelte attive.
function aggiornaResetScelte() {
  resetScelteBtn.hidden = totScelte() === 0;
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
    adminPassEl.title = "Cancellazione abilitata — clicca per ribloccare";
  }
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
    renderLista();
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
    renderLista();
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
  listEl.replaceChildren(...dati.map(creaCard));
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
  const btn = e.target.closest("[data-vai]");
  if (btn) vaiAlLuogo(btn.dataset.vai);
});
searchEl.addEventListener("input", applicaFiltro);
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

// ---------- verifica OCR ----------
function aggiornaBadgeVerifica() {
  const btn = document.getElementById("verificaBtn"); // presente solo con ?verifica=1
  const daVedere = datiCompleti().filter(
    (l) => (l.needsReview?.length ?? 0) > 0 && !correzioni[l.id]?.confermato
  ).length;
  if (btn) btn.textContent = daVedere > 0 ? `🔍 Verifica OCR (${daVedere})` : "🔍 Verifica OCR";
  // Il contatore «✓ verificato» è solo della vista riservata: il sito pubblico
  // non mostra nulla della verifica (richiesta esplicita).
  contatoreEl.hidden = !accessoVerifica;
  if (accessoVerifica)
    contatoreEl.textContent = daVedere > 0 ? `✔ ${daVedere} da confermare` : "✓ verificato";
}

function rigaCampo(luogo, chiave) {
  const sospetto = luogo.needsReview?.includes(chiave);
  const valore = campo(luogo, chiave);
  const etichetta = ETICHETTE_CAMPI[chiave];
  return `<label for="v-${luogo.id}-${chiave}">${etichetta}</label>
    <textarea id="v-${luogo.id}-${chiave}" data-campo="${chiave}" rows="${chiave === "when" ? 3 : 2}"
      class="${sospetto ? "da-vedere" : ""}">${valore}</textarea>`;
}

function rigaCoordinate(luogo) {
  const sospetto = luogo.needsReview?.includes("coordinates");
  const senzaCoord = luogo.lat == null || luogo.lon == null;
  const nota = NOTE_COORDINATE[luogo.id] ?? "";
  return `<label>Coordinate</label>
    <div class="coord-riga">
      <input type="number" step="0.00001" data-campo="lat" value="${luogo.lat ?? ""}"
        class="${sospetto ? "da-vedere" : ""}" aria-label="Latitudine" placeholder="lat" />
      <input type="number" step="0.00001" data-campo="lon" value="${luogo.lon ?? ""}"
        class="${sospetto ? "da-vedere" : ""}" aria-label="Longitudine" placeholder="lon" />
      <span class="coord-note">${senzaCoord ? "⚠ senza coordinate — ": ""}${nota}${nota ? " — " : ""}clicca la mappa per spostare il punto</span>
      ${senzaCoord ? "" : `<button class="vai-btn" type="button" data-centra="${luogo.id}">centra</button>`}
    </div>`;
}

function creaCardVerifica(luogo) {
  const card = document.createElement("div");
  card.className = "verifica-card" + (luogo.needsReview?.length ? " sospetta" : "");
  card.dataset.id = luogo.id;
  const confermato = Boolean(correzioni[luogo.id]?.confermato);
  card.innerHTML = `
    <div class="vc-head">
      <img src="${luogo.image ?? ""}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />
      <span class="vc-titolo"></span>
      <label class="vc-ok"><input type="checkbox" data-confermato ${confermato ? "checked" : ""} /> confermo</label>
    </div>
    <div class="vc-grid">
      ${rigaCampo(luogo, "title")}
      ${rigaCampo(luogo, "address")}
      ${rigaCampo(luogo, "when")}
      ${rigaCoordinate(luogo)}
    </div>`;
  card.querySelector(".vc-titolo").textContent = campo(luogo, "title");

  card.addEventListener("input", (e) => {
    const campo_ = e.target.dataset.campo;
    if (!campo_) return;
    correzioni[luogo.id] = { ...(correzioni[luogo.id] ?? {}), [campo_]: e.target.value };
    salvaCorrezioni();
    aggiornaTutto();
  });
  card.querySelector("[data-confermato]").addEventListener("change", (e) => {
    correzioni[luogo.id] = { ...(correzioni[luogo.id] ?? {}), confermato: e.target.checked };
    salvaCorrezioni();
    aggiornaBadgeVerifica();
  });
  const btnCentra = card.querySelector("[data-centra]");
  if (btnCentra) {
    btnCentra.addEventListener("click", () => {
      const l = datiCompleti().find((x) => x.id === luogo.id);
      if (!l || l.lat == null || l.lon == null) return; // guardia: senza coordinate non centra
      map.setView([l.lat, l.lon], 17);
      markerPerId.get(luogo.id)?.openPopup();
    });
  }
  return card;
}

function renderVerifica() {
  // datiCompleti (non datiCorrenti): le tappe eliminate con la ✕ devono restare
  // visibili qui, per poterle ripristinare
  verificaList.replaceChildren(...datiCompleti().map(creaCardVerifica));
}

function aggiornaTutto() {
  // aggiorna liste e marker senza ricostruire la mappa
  datiCorrenti().forEach((l) => aggiornaMarker(l));
  renderLista();
  refreshConflitti();
  aggiornaBadgeVerifica();
}

// Il pulsante di verifica non è nell'interfaccia pubblica: il pannello resta
// raggiungibile solo con il link dedicato ?verifica=1, che ricrea il pulsante
// in alto e apre il pannello (se non c'è anche un deep link ?vai= da eseguire).
if (accessoVerifica) {
  const btn = document.createElement("button");
  btn.id = "verificaBtn";
  btn.className = "btn btn-ghost";
  btn.type = "button";
  btn.textContent = "🔍 Verifica OCR";
  btn.addEventListener("click", () => {
    renderVerifica();
    verificaPanel.hidden = false;
  });
  document.querySelector(".topbar-actions").prepend(btn);
  const vai = new URLSearchParams(location.search).get("vai");
  if (!vai) {
    renderVerifica();
    verificaPanel.hidden = false;
  }
}
chiudiVerifica.addEventListener("click", () => {
  verificaPanel.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !verificaPanel.hidden) verificaPanel.hidden = true;
});

// clic sulla mappa col pannello aperto: sposta il punto selezionato (si sceglie con «centra» + trascina il marker)
map.on("click", (e) => {
  if (verificaPanel.hidden) return;
  const id = window.__luogoSelezionato;
  if (!id) return;
  correzioni[id] = { ...(correzioni[id] ?? {}), lat: e.latlng.lat, lon: e.latlng.lng };
  salvaCorrezioni();
  ricostruisciMarker(); // il luogo può non avere ancora un marker (nuovo import senza coordinate)
  aggiornaTutto();
  renderVerifica();
});

exportBtn.addEventListener("click", () => {
  const dati = datiCompleti().map(({ id, title, address, when, lat, lon, confermato, ...resto }) => ({
    id, title, address, when, lat, lon, ...(confermato ? { confermato } : {}), ...resto,
  }));
  const blob = new Blob([JSON.stringify(dati, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "luoghi-verificati.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

ripristinaBtn.addEventListener("click", () => {
  if (!confirm("Tornare ai DATI BASE attuali (import compreso)? Verranno eliminate le correzioni fatte nel pannello di verifica.")) return;
  correzioni = {};
  salvaCorrezioni();
  ricostruisciMarker();
  renderVerifica();
  aggiornaTutto();
});

// ---------- import: fonte primaria dei dati ----------
// Due strade che convergono su applicaImport():
//  - «🌐 Importa dal sito»: fetch dei preferiti direttamente da
//    openhousenapoli.org (funziona solo se il browser è già autenticato lì;
//    da Cloudflare Pages la risposta del sito non porta header CORS → messaggio
//    di errore chiaro, usare «📄 Importa HTML»).
//  - «📄 Importa HTML»: il file «My tour» salvato come HTML dal browser.
// Risultato: aggiorna orari/indirizzi, ripristina tappe cancellate per errore,
// aggiunge località nuove (geocodificate via Nominatim).

function mostraImportMsg(testo, tipo = "ok") {
  importBox.hidden = false;
  importMsg.className = tipo === "err" ? "import-msg errore" : "import-msg";
  importMsg.textContent = testo;
}

function riepilogoImport(res) {
  mostraImportMsg(res.messaggi.join("\n"));
  ricostruisciMarker();
  renderVerifica();
  aggiornaTutto();
}

importSitoBtn.addEventListener("click", async () => {
  importSitoBtn.disabled = true;
  mostraImportMsg("Scarico i preferiti da openhousenapoli.org…");
  try {
    const r = await fetch(PREF_DIRETTI, { credentials: "include" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const testo = await r.text();
    const estrazione = estraiLuoghiDaHTML(testo);
    if (!estrazione.length) {
      mostraImportMsg(
        "La pagina scaricata non contiene luoghi: probabilmente non sei autenticato su openhousenapoli.org in questa finestra (nessun «My tour» con preferiti). Prova con «📄 Importa HTML».",
        "err"
      );
      return;
    }
    riepilogoImport(await applicaImport(estrazione));
  } catch (e) {
    mostraImportMsg(
      "Impossibile leggere i preferiti dal sito (" +
        (e.name === "TypeError"
          ? "richiesta bloccata: openhousenapoli.org non consente richieste da questo dominio (CORS)"
          : e.message) +
        "). Usa «📄 Importa HTML» con il file «My tour» salvato dal browser.",
      "err"
    );
  } finally {
    importSitoBtn.disabled = false;
  }
});

importFileBtn.addEventListener("click", () => importFileInput.click());

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  if (!file) return;
  importFileInput.value = ""; // reimport dello stesso file: ricarica l'evento
  const testo = await file.text();
  const estrazione = estraiLuoghiDaHTML(testo);
  if (!estrazione.length) {
    mostraImportMsg(
      "Nessun luogo riconosciuto nel file: deve essere la pagina «My tour» di openhousenapoli.org salvata come HTML.",
      "err"
    );
    return;
  }
  if (
    !confirm(
      "Importare " + estrazione.length + " località dal file «" + file.name + "»?\n\n" +
        "- orari e indirizzi vengono allineati alla fonte\n" +
        "- le località nuove vengono geocodificate (1 richiesta/secondo)\n" +
        "- le tappe cancellate per errore tornano nell'elenco"
    )
  )
    return;
  mostraImportMsg("Import in corso (geocodifica dei luoghi nuovi: fino a ~2 s ciascuno)…");
  try {
    riepilogoImport(await applicaImport(estrazione));
  } catch (e) {
    mostraImportMsg("Errore durante l'import: " + e.message, "err");
  }
});

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
    versione: 1,
    esportato: new Date().toISOString(),
    datiImportati,
    correzioni,
    scelte: Object.fromEntries(Object.entries(scelte).map(([g, ins]) => [g, [...ins]])),
  });
});

importaStatoBtn.addEventListener("click", () => importaStatoInput.click());

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
  location.reload();
});

// marker cliccabile = selezione per lo spostamento via mappa
map.on("popupopen", (e) => {
  const id = [...markerPerId.entries()].find(([, m]) => m === e.popup._source)?.[0];
  if (!id) return;
  window.__luogoSelezionato = id;
  evidenziaCardLista(id); // la lista segue il marker (non il viceversa: c'è già «📍 Vai»)
});

// ---------- avvio ----------
renderLista();
refreshConflitti();
aggiornaBadgeVerifica();
