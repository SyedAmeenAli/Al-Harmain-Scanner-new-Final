"""Quick audit of the full catalogue CSV."""
import csv
from pathlib import Path

CSV_PATH = Path(r"C:\Users\Ameen\Downloads\Al Harmain Catlouge.csv")

with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

total = len(rows)
notes = sum(1 for r in rows if (r.get("fragrance_notes") or "").strip())
desc = sum(1 for r in rows if (r.get("description") or "").strip())
sizes = sum(1 for r in rows if (r.get("sizes") or "").strip())
img = sum(1 for r in rows if (r.get("image_url") or "").strip())
popular = sum(1 for r in rows if (r.get("is_popular") or "").strip().lower() == "true")
instock = sum(1 for r in rows if (r.get("in_stock") or "").strip().lower() == "true")
url = sum(1 for r in rows if (r.get("product_url") or "").strip())

cats = set()
for r in rows:
    for c in (r.get("categories") or "").split(","):
        c = c.strip()
        if c:
            cats.add(c)

note_formats = {"Top/Middle/Base": 0, "General": 0, "Empty": 0}
for r in rows:
    fn = (r.get("fragrance_notes") or "").strip()
    if not fn:
        note_formats["Empty"] += 1
    elif any(x in fn for x in ("Top:", "Middle:", "Base:")):
        note_formats["Top/Middle/Base"] += 1
    else:
        note_formats["General"] += 1

print("=" * 60)
print("Full Catalogue CSV Audit")
print("=" * 60)
print(f"Total rows        : {total}")
print(f"With notes        : {notes}")
print(f"With description  : {desc}")
print(f"With sizes        : {sizes}")
print(f"With image        : {img}")
print(f"With product_url  : {url}")
print(f"In stock          : {instock}")
print(f"Popular           : {popular}")
print(f"Unique categories : {len(cats)}")
print(f"Categories        : {sorted(cats)}")
print(f"Note formats      : {note_formats}")
print()

# Sample products with notes
print("=== Products with Top/Middle/Base notes (first 5) ===")
count = 0
for r in rows:
    fn = (r.get("fragrance_notes") or "").strip()
    if fn and "Top:" in fn and count < 5:
        print(f"  {r['name']}")
        print(f"    Notes: {fn[:150]}")
        count += 1

print()
print("=== Products with description (first 3) ===")
count = 0
for r in rows:
    d = (r.get("description") or "").strip()
    if d and count < 3:
        print(f"  {r['name']}")
        print(f"    Desc: {d[:150]}...")
        count += 1

print()
print("=== Products with sizes (first 3) ===")
count = 0
for r in rows:
    s = (r.get("sizes") or "").strip()
    if s and count < 3:
        print(f"  {r['name']}: {s}")
        count += 1

print()
print("=== Non-fragrance products (sample) ===")
non_frag_keywords = ["Bakhoor", "Oud burner", "Air Freshener", "Car Freshener", "Accessories", "Gift Set"]
count = 0
for r in rows:
    cats_str = (r.get("categories") or "").strip()
    name = (r.get("name") or "").strip()
    if any(k.lower() in cats_str.lower() or k.lower() in name.lower() for k in non_frag_keywords) and count < 5:
        print(f"  {name} [{cats_str}]")
        count += 1
