// App «My OHN Tour» — mappa OpenStreetMap dei luoghi estratti via OCR da mytour.png.
// Nessuna funzione di eliminazione: la lista è di sola consultazione, con ricerca,
// verifica OCR, filtro per giornata, tour personale con avvisi di conflitto
// orario a livello di giornata e link «Apri in Google Maps» nel popup.
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
const verificaBtn = document.getElementById("verificaBtn");
const verificaPanel = document.getElementById("verificaPanel");
const verificaList = document.getElementById("verificaList");
const chiudiVerifica = document.getElementById("chiudiVerifica");
const exportBtn = document.getElementById("exportBtn");
const ripristinaBtn = document.getElementById("ripristinaBtn");
const adminPassEl = document.getElementById("adminPass");

const STORAGE_KEY = "mytour-mappa-correzioni-v1";
const STORAGE_SCELTE = "mytour-scelte-per-giorno-v1";
// etichette dei giorni per i contatori («★ sabato: N»)
const ETICHETTA_GIORNO = { ven: "venerdì", sab: "sabato", dom: "domenica" };
const NAPOLI = [40.849, 14.25];
const ETICHETTE_CAMPI = {
  title: "Titolo",
  address: "Indirizzo",
  when: "Quando",
};
// Giornate di Open House Napoli 2026: nomi per il riconoscimento nel campo
// «when» e chiavi dei pulsanti di filtro.
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
const markerPerId = new Map();

// ---------- cache di calcolo ----------
// datiCorrenti() viene chiamata centinaia di volte per interazione (card,
// marker, popup, contatori): costruire l'array ogni volta era spreco. La
// cache si invalida in salvaCorrezioni(), unico punto che cambia «correzioni».
let cacheDati = null;
const cacheOrari = new Map(); // testo «when» → fasce parseate
const cacheDistanze = new Map(); // coppia di id → metri (haversine)

function datiCorrenti() {
  if (!cacheDati) cacheDati = luoghi.map((l) => ({ ...l, ...(correzioni[l.id] ?? {}) }));
  return cacheDati;
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

function salvaScelte() {
  const dati = {};
  for (const [g, ins] of Object.entries(scelte)) dati[g] = [...ins];
  localStorage.setItem(STORAGE_SCELTE, JSON.stringify(dati));
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
// con il giorno («Sabato 3 ottobre …») oppure ereditare quello precedente
// («Sabato 3 ottobre 10:00 > 13:00 | 16:30 > 19:00»). Se un testo non si
// interpreta il luogo resta comunque visibile: il parse non genera mai errori.
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

// Conflitti del luogo con i luoghi «rilevanti» del giorno: gli scelti con ★
// e i candidati arancio (aperti solo quel giorno e vicini a un luogo scelto,
// es. INTERNO 6 accanto ad ATELIER AMBRA stellata). La verifica è a livello di
// GIORNATA: con un giorno selezionato (ven/sab/dom) si confrontano solo le
// fasce di quel giorno; nella vista «Tutti» non ci sono avvisi.
function conflittiPerLuogo(id, lista) {
  if (!giornoFiltro) return [];
  const scelteGiorno = scelteDelGiorno();
  if (scelteGiorno.size === 0) return [];
  const luogo = lista.find((l) => l.id === id);
  if (!luogo) return [];
  // set dei luoghi che partecipano ai confronti: scelti con ★ + candidati arancio
  const rilevanti = new Set(scelteGiorno);
  for (const l of lista) if (eVicinoDaVisitare(l, lista)) rilevanti.add(l.id);
  if (!rilevanti.has(id)) return [];
  const giorno = NOME_PER_GIORNO[giornoFiltro];
  const mie = parseOrari(campo(luogo, "when")).filter((f) => f.giorno === giorno);
  if (mie.length === 0) return [];
  const out = [];
  for (const altro of lista) {
    if (altro.id === id || !rilevanti.has(altro.id)) continue;
    const fasceAltro = parseOrari(campo(altro, "when")).filter((f) => f.giorno === giorno);
    for (const a of mie) {
      for (const b of fasceAltro) {
        if (slotInConflitto(a, b)) {
          out.push({ idAltro: altro.id, titolo: campo(altro, "title"), fasciaA: a, fasciaB: b });
        }
      }
    }
  }
  return out;
}

function formattaOra(minuti) {
  return `${String(Math.floor(minuti / 60)).padStart(2, "0")}:${String(minuti % 60).padStart(2, "0")}`;
}

// Le fasce sono già dello stesso giorno selezionato: nell'avviso basta l'ora,
// senza il prefisso del giorno (serviva solo quando i conflitti si vedevano
// anche nella vista «Tutti»).
function testoConflitto(c) {
  const a = `${formattaOra(c.fasciaA.inizio)}–${formattaOra(c.fasciaA.fine)}`;
  const b = `${formattaOra(c.fasciaB.inizio)}–${formattaOra(c.fasciaB.fine)}`;
  return `${a} va in conflitto con «${c.titolo}» (${b})`;
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
  const mPrima = mantenuti[0].match(/^(venerd[iì]\s+\d+\s+ottobre|sabato\s+\d+\s+ottobre|domenica\s+\d+\s+ottobre)/i);
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
  // rimuove il luogo dal tour di TUTTI i giorni in una volta
  const del = giornoFiltro && adminSbloccato
    ? `<button class="del-btn" type="button" data-elimina="${luogo.id}"
        title="Rimuove il luogo dal tour di tutti i giorni">✕</button>`
    : "";
  const star = giornoFiltro
    ? `<button class="star-btn ${scelta ? "attiva" : ""}" type="button" data-scelta="${luogo.id}"
        aria-pressed="${scelta}" title="${scelta ? "Togli dal tour di " + ETICHETTA_GIORNO[giornoFiltro] : "Aggiungi al tour di " + ETICHETTA_GIORNO[giornoFiltro]}">★</button>`
    : "";
  return `<div class="thumb">${thumb}</div>
    <div class="card-main">
      <p class="card-title"></p>
      <p class="card-addr"></p>
      <p class="card-when"></p>
      <div class="card-conflitto" hidden></div>
    </div>
    <div class="card-side">
      ${badge}
      <button class="vai-btn" type="button" data-vai="${luogo.id}">📍 Vai</button>
      ${star}
      ${del}
    </div>`;
}

function aggiornaConflittiCard(card, luogo) {
  const box = card.querySelector(".card-conflitto");
  if (!box) return;
  const conflitti = conflittiPerLuogo(luogo.id, datiCorrenti());
  if (conflitti.length) {
    box.innerHTML = conflitti.map((c) => `<p>⚠ ${testoConflitto(c)}</p>`).join("");
    box.hidden = false;
  } else {
    box.innerHTML = "";
    box.hidden = true;
  }
}

function creaCard(luogo) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = luogo.id;
  card.innerHTML = cardHTML(luogo);
  card.querySelector(".card-title").textContent = campo(luogo, "title");
  card.querySelector(".card-addr").textContent = campo(luogo, "address");
  card.querySelector(".card-when").textContent = testoWhenVisualizzato(luogo);
  aggiornaConflittiCard(card, luogo);
  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-vai]")) return;
    if (e.target.closest("[data-scelta]")) return;
    if (e.target.closest("[data-elimina]")) return;
    vaiAlLuogo(luogo.id);
  });
  return card;
}

function vaiAlLuogo(id) {
  const luogo = datiCorrenti().find((l) => l.id === id);
  const marker = markerPerId.get(id);
  if (!luogo || !marker) return;
  map.setView([luogo.lat, luogo.lon], 17, { animate: true });
  marker.openPopup();
  evidenziaCardLista(id);
}

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
  conteggioEl.textContent = `(${visibili}/${luoghi.length})`;
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

// Rimuove il luogo dal tour di TUTTI i giorni in una volta (pulsante «✕»
// accanto alla stella): serve dopo la visita per non rivedere il luogo — e i
// suoi conflitti — negli altri giorni. Se il luogo non ha stelle non fa nulla
// (nessun dialog). Doppia protezione: il tasto esiste solo dopo lo sblocco,
// ma qui si riverifica in caso di richiamo programmatico.
function rimuoviDaTuttiIGiorni(id) {
  if (!adminSbloccato) return;
  const giorni = Object.keys(scelte).filter((g) => scelte[g].has(id));
  if (giorni.length === 0) return;
  if (!confirm(`Rimuovere «${campo(datiCorrenti().find((l) => l.id === id), "title")}» dal tour di tutti i giorni (${giorni.length})?`)) return;
  for (const g of giorni) scelte[g].delete(id);
  salvaScelte();
  renderLista();
  refreshConflitti();
  aggiornaColoriMarker();
}

// «Reset stelle»: svuota il tour di TUTTI i giorni (le selezioni di prova non
// devono restare nel browser quando il sito viene condiviso).
function resetScelte() {
  const tot = totScelte();
  if (!tot) return;
  if (!confirm(`Rimuovere tutte le ${tot} stelle dal tour (tutti i giorni)?`)) return;
  for (const ins of Object.values(scelte)) ins.clear();
  salvaScelte();
  renderLista();
  refreshConflitti();
  aggiornaColoriMarker();
}

// Rinfresca gli avvisi di conflitto (card + popup aperto) e i contatori del tour.
function refreshConflitti() {
  const lista = datiCorrenti();
  for (const card of listEl.children) {
    const luogo = lista.find((l) => l.id === card.dataset.id);
    if (luogo) aggiornaConflittiCard(card, luogo);
  }
  for (const [id, marker] of markerPerId) {
    const popup = marker.getPopup();
    const luogo = lista.find((l) => l.id === id);
    if (popup?.isOpen() && luogo) popup.setContent(creaContenutoPopup(luogo));
  }
  const nConflitti = lista.filter((l) => conflittiPerLuogo(l.id, lista).length > 0).length;
  conflittiCountEl.hidden = nConflitti === 0;
  conflittiCountEl.textContent = `⚠ ${nConflitti} in conflitto`;
  // con un giorno attivo il contatore riguarda solo quel giorno; in «Tutti» la somma
  const nScelte = giornoFiltro ? scelteDelGiorno().size : totScelte();
  tourCountEl.hidden = nScelte === 0;
  tourCountEl.textContent = giornoFiltro
    ? `★ ${ETICHETTA_GIORNO[giornoFiltro]}: ${nScelte}`
    : `★ nel tour: ${nScelte}`;
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
    rimuoviDaTuttiIGiorni(del.dataset.elimina);
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
  const daVedere = datiCorrenti().filter(
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
  const nota = NOTE_COORDINATE[luogo.id] ?? "";
  return `<label>Coordinate</label>
    <div class="coord-riga">
      <input type="number" step="0.00001" data-campo="lat" value="${luogo.lat}"
        class="${sospetto ? "da-vedere" : ""}" aria-label="Latitudine" />
      <input type="number" step="0.00001" data-campo="lon" value="${luogo.lon}"
        class="${sospetto ? "da-vedere" : ""}" aria-label="Longitudine" />
      <span class="coord-note">${nota}${nota ? " — " : ""}clicca la mappa per spostare il punto</span>
      <button class="vai-btn" type="button" data-centra="${luogo.id}">centra</button>
    </div>`;
}

function creaCardVerifica(luogo) {
  const card = document.createElement("div");
  card.className = "verifica-card" + (luogo.needsReview?.length ? " sospetta" : "");
  card.dataset.id = luogo.id;
  const confermato = Boolean(correzioni[luogo.id]?.confermato);
  card.innerHTML = `
    <div class="vc-head">
      <img src="${luogo.image}" alt="" loading="lazy" />
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
  card.querySelector("[data-centra]").addEventListener("click", () => {
    const l = datiCorrenti().find((x) => x.id === luogo.id);
    map.setView([l.lat, l.lon], 17);
    markerPerId.get(luogo.id)?.openPopup();
  });
  return card;
}

function renderVerifica() {
  verificaList.replaceChildren(...datiCorrenti().map(creaCardVerifica));
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
  aggiornaTutto();
  renderVerifica();
});

exportBtn.addEventListener("click", () => {
  const dati = datiCorrenti().map(({ id, title, address, when, lat, lon, confermato, ...resto }) => ({
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
  if (!confirm("Ripristinare i dati originali dell'OCR? Le correzioni salvate in questo browser verranno eliminate.")) return;
  correzioni = {};
  salvaCorrezioni();
  renderVerifica();
  aggiornaTutto();
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
