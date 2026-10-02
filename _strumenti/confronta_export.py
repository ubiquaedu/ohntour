# Confronta l'export JSON del pannello di verifica con data.js
# e mostra le correzioni fatte dall'utente in pagina.
import json
import re

EXPORT = r"C:\Users\ferdi\Downloads\luoghi-verificati.json"
DATA = r"D:\coding\ohn\mytour-mappa\data.js"

export = json.load(open(EXPORT, encoding="utf-8"))
testo = open(DATA, encoding="utf-8").read()

blocchi = {}
for m in re.finditer(r'id: "([^"]+)",(.*?)\n  \}', testo, re.S):
    cid, corpo = m.group(1), m.group(2)

    def campo(nome, corpo=corpo):
        mm = re.search(rf'{nome}: "((?:[^"\\]|\\.)*)"', corpo)
        return mm.group(1) if mm else None

    def num(nome, corpo=corpo):
        mm = re.search(rf"{nome}: ([0-9.]+)", corpo)
        return float(mm.group(1)) if mm else None

    blocchi[cid] = {
        "title": campo("title"),
        "address": campo("address"),
        "when": campo("when"),
        "lat": num("lat"),
        "lon": num("lon"),
    }

diverse = 0
for e in export:
    orig = blocchi.get(e["id"])
    if not orig:
        print("!! non trovato in data.js:", e["id"])
        continue
    for k in ("title", "address", "when"):
        if e.get(k) != orig[k]:
            diverse += 1
            print(f'[{e["id"]}] {k}:')
            print(f"   data.js : {orig[k]}")
            print(f"   export  : {e.get(k)}")
    for k in ("lat", "lon"):
        if abs((e.get(k) or 0) - (orig[k] or 0)) > 1e-7:
            diverse += 1
            print(f'[{e["id"]}] {k}: {orig[k]} -> {e.get(k)}')

print()
print("correzioni trovate:", diverse)
print("confermati presenti:", [e["id"] for e in export if e.get("confermato")])
print("needsReview residui:", [(e["id"], e.get("needsReview")) for e in export if e.get("needsReview")])
