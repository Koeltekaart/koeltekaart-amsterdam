#!/usr/bin/env python3
"""Add type column to koelteplekken.csv"""
import csv
from pathlib import Path

csv_path = Path("data/koelteplekken.csv")

# Inferred types based on name and domain
type_mapping = {
    "AH Osdorpplein XL": "supermarket",
    "Stadsboerderij Osdorp": "urban_farm",
    "Kerk de Opgang": "church",
    "OBA Slotermeer": "library",
    "OBA Postjesweg": "library",
    "OBA Geuzenveld": "library",
    "Kerk de Ark": "church",
}

# Read the CSV
with csv_path.open('r', encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    fieldnames = reader.fieldnames or []

# Add type column if not present
if 'type' not in fieldnames:
    fieldnames.insert(2, 'type')  # Insert after name and stadsdeel

# Add type to each row
for row in rows:
    if 'type' not in row:
        name = row.get('name', '')
        row['type'] = type_mapping.get(name, '')

# Write back
with csv_path.open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"✓ Added type column to {csv_path}")
print(f"  Processed {len(rows)} rows")
for row in rows:
    if row.get('name'):
        print(f"  - {row['name']}: {row.get('type')}")
