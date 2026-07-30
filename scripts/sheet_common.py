#!/usr/bin/env python3
"""Shared tabular→CSV logic for the ingestion scripts.

Both fetch_sheet.py (Google Sheet source) and fetch_excel.py (Excel source)
turn a list-of-rows into the exact same byte-stable public CSV, so the source
of truth can change without changing what the site sees. Keeping the allow-list
and cleaning in ONE place means the two sources cannot drift apart.
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


def _filter_rows(rows, require):
    """Keep only data rows whose `col` cell equals `value` (case-insensitive) —
    the vetting gate. The source is a live collaborative document, so un-approved
    / half-finished rows are always present; only rows a reviewer has marked
    (e.g. publiceren=ja) may be published. Returns None if the control column is
    absent, so a renamed/removed flag stops the run instead of silently
    publishing everything."""
    col, value = require
    header = [clean(c) for c in rows[0]]
    if col not in header:
        print(f"::error::vetting column {col!r} not found in header; available: {header}")
        return None
    ci = header.index(col)
    want = clean(value).lower()
    return [rows[0]] + [r for r in rows[1:]
                        if ci < len(r) and clean(r[ci]).lower() == want]


def to_csv(rows, columns, require=None):
    """Render rows as LF-terminated CSV text (byte-stable), padded to a fixed
    width. `require=(col, value)` first applies the vetting gate (keep only
    approved rows). If `columns` is given it is a PUBLIC-COLUMN ALLOW-LIST: only
    those columns are emitted, in that order, and everything else in the source
    is dropped — the safety boundary that keeps internal columns out of the
    public repo. Returns None on a missing control/allow-listed column."""
    if require:
        rows = _filter_rows(rows, require)
        if rows is None:
            return None
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
