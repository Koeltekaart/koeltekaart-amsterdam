#!/usr/bin/env python3
"""Shared tabular→CSV rendering for the ingestion step.

fetch_sheet.py turns a list-of-rows from the Google Sheet into the public CSV
the site serves. The allow-list and cell cleaning live here, apart from the
Sheets-API plumbing, so the "what may be published" rule stays readable on its
own and is unit-testable without a network call.
"""
import csv
import io


def clean(v):
    """Collapse embedded CR/LF/whitespace and trim.

    Editors sometimes Alt+Enter inside a cell, leaving embedded CR/LF. Collapsing
    them keeps the output single-line-per-row and byte-stable, so git doesn't see
    a spurious "change" (and redeploy) on every run.
    """
    return " ".join(str(v).replace("\r", " ").replace("\n", " ").split())


def _select_columns(rows, columns):
    """Keep only the allow-listed columns, in the given order. Return None (and
    print a GitHub-Actions ::error::) if any named column is absent from the
    header, so a renamed/removed column stops the run loudly instead of silently
    shipping short rows."""
    header = [clean(c) for c in rows[0]]
    index_of = {}
    for i, name in enumerate(header):
        index_of.setdefault(name, i)  # first occurrence wins on duplicate headers
    missing = [c for c in columns if c not in index_of]
    if missing:
        print(f"::error::allow-listed column(s) not found in header: "
              f"{missing}; available: {header}")
        return None
    picks = [index_of[c] for c in columns]
    out = [list(columns)]  # canonical header = the allow-list, exact names/order
    for r in rows[1:]:
        out.append([clean(r[j]) if j < len(r) else "" for j in picks])
    return out


def to_csv(rows, columns):
    """Render rows as LF-terminated CSV text (byte-stable), padded to a fixed
    width. If `columns` is given it is a PUBLIC-COLUMN ALLOW-LIST: only those
    columns are emitted, in that order, and everything else in the source is
    dropped — the safety boundary that keeps internal columns out of the public
    repo. Returns None if an allow-listed column is missing."""
    if columns:
        out_rows = _select_columns(rows, columns)
        if out_rows is None:
            return None
        width = len(columns)
    else:
        width = max(len(r) for r in rows)
        out_rows = [[clean(c) for c in r] for r in rows]

    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")       # LF, not CRLF
    for r in out_rows:
        w.writerow(r + [""] * (width - len(r)))
    return buf.getvalue()
