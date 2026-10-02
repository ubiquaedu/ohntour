# Geocodifica dei punti dell'itinerario tramite Nominatim (OpenStreetMap).
# Uso una tantum durante la build: risultati in _strumenti/risultati.json.
# Le coordinate vengono incorporate in data.js: la web app NON geocodifica al volo.
import json
import time
import urllib.parse
import urllib.request

PUNTI = [
    ("01", "Piazza Museo Filangieri 255, Napoli", "Piazza Museo Filangieri, Napoli"),
    ("02", "Piazzetta Giacinto Gigante 38, Napoli", "Piazzetta Giacinto Gigante, Napoli"),
    ("03", "Via Gaetano Filangieri 48, Napoli", "Via Gaetano Filangieri, Napoli"),
    ("04", "Via Toledo 402, Napoli", "Via Toledo, Napoli"),
    ("05", "Piazza Duca degli Abruzzi, Napoli", None),
    ("06", "Via Domenico Cimarosa 65, Napoli", "Via Cimarosa 65, Napoli"),
    ("07", "Via Francesco Petrarca 38, Napoli", "Via Petrarca 38, Napoli"),
    ("08", "Via Sant'Antonio a Capodimonte 10, Napoli", None),
    ("09", "Via Ferri Vecchi 18, Napoli", None),
    ("10", "Via Santa Teresa degli Scalzi 76, Napoli", None),
    ("11", "Via San Gregorio Armeno 35, Napoli", None),
    ("12", "Piazza Santa Maria la Nova 43, Napoli", None),
    ("13", "Via Sant'Anna dei Lombardi 16, Napoli", "Via Monteoliveto 16, Napoli"),
    ("14", "Largo dei Miracoli 37, Napoli", "Largo dei Miracoli, Napoli"),
    ("15", "Calata Trinita Maggiore 53, Napoli", None),
    ("16", "Via Depretis 1, Napoli", "Via Depretis, Napoli"),
    ("17", "Via Petrarca 141, Napoli", None),
    ("18", "Via Gaetano Filangieri 72, Napoli", None),
    ("19", "Corso Vittorio Emanuele 581, Napoli", None),
    ("20", "Via Alcide de Gasperi 65, Napoli", "Portosalvo, Napoli"),
    ("21", "Piazza Vanvitelli, Napoli", None),
    ("22", "Via San Sebastiano 51, Napoli", None),
    ("23", "Via Giordano Bruno 95, Napoli", None),
    ("24", "Via Santa Maria Antesaecula 129, Napoli", None),
    ("25", "Via San Paolo 51, Napoli", None),
    ("26", "Via Teresa Ravaschieri 9, Napoli", None),
    ("27", "Via della Sanita 2, Napoli", "Via Santa Maria della Sanita 2, Napoli"),
    ("28", "Piazza Trieste e Trento, Napoli", None),
    ("29", "Via San Paolo 4, Napoli", None),
    ("30", "Via Guglielmo Melisurgo 4, Napoli", None),
]

UA = "MyTourFuoriPorta/1.0 (mappa eventi personale; contatto: utente locale)"


def geocoda(query: str) -> dict | None:
    """Una richiesta a Nominatim; restituisce il primo risultato o None."""
    params = urllib.parse.urlencode({"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "it"})
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        dati = json.load(r)
    time.sleep(1.1)  # cortesia verso Nominatim: max ~1 richiesta/secondo
    if not dati:
        return None
    d = dati[0]
    return {
        "lat": float(d["lat"]),
        "lon": float(d["lon"]),
        "display_name": d.get("display_name", ""),
        "type": d.get("type", ""),
        "importance": d.get("importance", 0),
    }


def main() -> None:
    risultati = {}
    for cod, query, ripiego in PUNTI:
        trovato = None
        usata = query
        try:
            trovato = geocoda(query)
        except Exception as e:  # rete: riprova una volta
            print(f"  [{cod}] errore ({e}), riprovo…")
            time.sleep(3)
            try:
                trovato = geocoda(query)
            except Exception as e2:
                print(f"  [{cod}] secondo errore: {e2}")
        if not trovato and ripiego:
            usata = ripiego
            try:
                trovato = geocoda(ripiego)
            except Exception as e:
                print(f"  [{cod}] ripiego fallito: {e}")
        risultati[cod] = {"query": usata, "risultato": trovato}
        if trovato:
            print(f"[{cod}] OK  {trovato['lat']:.5f}, {trovato['lon']:.5f}  ({trovato['type']}) ← {usata}")
        else:
            print(f"[{cod}] NON TROVATO ← {usata}")
    with open("_strumenti/risultati.json", "w", encoding="utf-8") as f:
        json.dump(risultati, f, ensure_ascii=False, indent=2)
    mancanti = [c for c, v in risultati.items() if not v["risultato"]]
    print(f"\n{len(risultati) - len(mancanti)}/{len(risultati)} geocodificati; mancanti: {mancanti or 'nessuno'}")


if __name__ == "__main__":
    main()
