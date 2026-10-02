# -*- coding: utf-8 -*-
"""
Importazione dati ufficiali dal salvataggio HTML della pagina «My tour»
(openhousenapoli.org → MY TOUR → salva la pagina come HTML).

Cosa fa:
  1. estrae i luoghi dall'HTML (titolo, indirizzo, orari, codice l=<n> della
     scheda ufficiale);
  2. li confronta con data.js (titolo normalizzato: maiuscole/accenti/punteggiatura);
  3. riporta le differenze di indirizzo e orari;
  4. con --scrivi aggiunge a ogni voce di data.js il campo:
         url: "https://www.openhousenapoli.org/location/location.php?l=<codice>",
     (idempotente: non inserisce url dove esiste già).

Uso (da D:\\coding\\ohn):
    python _strumenti/importa_preferiti.py [percorso_html] [--scrivi]
"""
import html as htmllib
import re
import sys
import unicodedata
from pathlib import Path

PERCORSO_DEFAULT = r"C:\Users\ferdi\Downloads\Open House Napoli - Preferiti.html"
DATA_JS = Path(__file__).resolve().parent.parent / "data.js"
BASE_OHN = "https://www.openhousenapoli.org/location/location.php?l="


def normalizza(testo):
    """Uppercase, niente accenti/punteggiatura/spaziature incoerenti."""
    testo = htmllib.unescape(testo)
    testo = unicodedata.normalize("NFKD", testo)
    testo = "".join(c for c in testo if not unicodedata.combining(c))
    testo = testo.upper().replace("\u2019", "'")
    testo = re.sub(r"[^A-Z0-9]+", " ", testo)
    return " ".join(testo.split())


def pulisci(testo):
    """Unescape + nbsp → spazio + spaziature ripulite (per il confronto diretto)."""
    return re.sub(r"\s+", " ", htmllib.unescape(testo).replace("\u00a0", " ")).strip()


def estrai_dal_html(percorso_html):
    """Ritorna [{codice, titolo, indirizzo, quando}] per le righe della tabella."""
    testo = Path(percorso_html).read_text(encoding="utf-8", errors="replace")
    luoghi = []
    for blocco in testo.split("<tr>"):
        m_codice = re.search(r"location\.php\?l=(\d+)\"", blocco)
        m_titolo = re.search(r"<b>(.*?)</b>", blocco)
        m_resto = re.search(r"</b></span><br>(.*?)<br>(.*?)</a>", blocco, re.S)
        if not (m_codice and m_titolo and m_resto):
            continue  # non è una riga di luogo (header, filtri, ecc.)
        luoghi.append({
            "codice": m_codice.group(1),
            "titolo": pulisci(m_titolo.group(1)),
            "indirizzo": pulisci(m_resto.group(1)),
            "quando": pulisci(m_resto.group(2)),
        })
    return luoghi


def estrai_da_data_js():
    """Ritorna ([{id, title, address, when}], testo_integrale di data.js)."""
    testo = DATA_JS.read_text(encoding="utf-8")
    voci = []
    for m in re.finditer(r"\{([^{}]*)\}", testo, re.S):
        blocco = m.group(1)
        preleva = lambda chiave: (re.search(chiave + r':\s*"([^"]*)"', blocco) or [None, None])[1]
        vid, vtit = preleva("id"), preleva("title")
        if not (vid and vtit):
            continue  # non è una voce di luogo
        voci.append({
            "id": vid,
            "title": vtit,
            "address": preleva("address") or "",
            "when": preleva("when") or "",
        })
    return voci, testo


def inserisci_url(testo_data, id_luogo, codice):
    """Inserisce url: "..." dopo la riga image: della voce, se non c'è già. Idempotente."""
    blocco = re.search(r'\{[^{}]*id:\s*"' + re.escape(id_luogo) + r'"[^{}]*\}', testo_data, re.S)
    if not blocco:
        return testo_data, False
    if "url:" in blocco.group(0):
        return testo_data, False
    nuovo = re.sub(r'(image:\s*"[^"]+",\s*)', r'\1\n    url: "' + BASE_OHN + codice + r'",\n    ', blocco.group(0), count=1)
    return testo_data[: blocco.start()] + nuovo + testo_data[blocco.end():], True


def main():
    # console Windows in cp1252: serve utf-8 per i simboli ✓ △ 🏛
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]
    scrivi = "--scrivi" in args
    percorso_html = args[0] if args and not args[0].startswith("--") else PERCORSO_DEFAULT

    html_luoghi = estrai_dal_html(percorso_html)
    voci_data, testo_data = estrai_da_data_js()
    indice_data = {normalizza(v["title"]): v for v in voci_data}

    print(f"HTML «{Path(percorso_html).name}»: {len(html_luoghi)} luoghi")
    print(f"data.js: {len(voci_data)} luoghi\n")

    abbinati, non_trovati = 0, []
    for luogo in html_luoghi:
        chiave = normalizza(luogo["titolo"])
        voce = indice_data.get(chiave)
        if not voce:
            non_trovati.append(luogo["titolo"])
            continue
        abbinati += 1
        problemi = []
        if normalizza(luogo["indirizzo"]) != normalizza(voce["address"]):
            problemi.append(f"  indirizzo: data.js «{voce['address']}» vs ufficiale «{luogo['indirizzo']}»")
        if normalizza(luogo["quando"]) != normalizza(voce["when"]):
            problemi.append(f"  orari:     data.js «{voce['when']}» vs ufficiale «{luogo['quando']}»")
        if problemi:
            print(f"△ {voce['id']}  (l={luogo['codice']})")
            print("\n".join(problemi))
        if scrivi:
            testo_data, inserito = inserisci_url(testo_data, voce["id"], luogo["codice"])
            if inserito:
                print(f"✓ url aggiunto a {voce['id']} (l={luogo['codice']})")

    print(f"\nAbbinati: {abbinati}/{len(html_luoghi)}")
    if non_trovati:
        print("NON abbinati (controllare a mano):")
        for t in non_trovati:
            print(f"  - {t}")

    if scrivi:
        DATA_JS.write_text(testo_data, encoding="utf-8", newline="\n")
        print(f"\ndata.js aggiornato: {DATA_JS}")
    else:
        print("\n(lettura sola — usa --scrivi per aggiungere i campi url a data.js)")


if __name__ == "__main__":
    main()
