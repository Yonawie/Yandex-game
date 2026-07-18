#!/usr/bin/env python3
"""Validate ru_words.json and simulate chain commit rules offline."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def normalize(word: str) -> str:
    w = word.strip().upper().replace("Ё", "Е")
    return "".join(ch for ch in w if "А" <= ch <= "Я" or "A" <= ch <= "Z")


def main() -> int:
    path = Path(__file__).resolve().parents[1] / "Assets/Resources/Words/ru_words.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    words = [normalize(w) for w in data.get("words", [])]
    words = [w for w in words if 3 <= len(w) <= 8]
    unique = sorted(set(words))
    print(f"words raw={len(data.get('words', []))} unique={len(unique)}")

    trie_prefixes: set[str] = set()
    word_set = set(unique)
    for w in unique:
        for i in range(1, len(w) + 1):
            trie_prefixes.add(w[:i])

    # Simulate: eating М,О,Р,Е should complete МОРЕ if present
    chain = ""
    for ch in "МОРЕ":
        nxt = chain + ch
        if nxt not in trie_prefixes:
            print("FAIL: broken on", nxt)
            return 1
        chain = nxt
        if chain in word_set:
            print("OK: completed", chain)
            chain = ""
            break
    else:
        print("FAIL: МОРЕ not completed")
        return 1

    # Broken chain
    chain = "М"
    nxt = chain + "Ъ"
    if nxt in trie_prefixes:
        print("unexpected prefix", nxt)
        return 1
    print("OK: invalid continuation breaks chain")
    print("sample:", ", ".join(unique[:12]), "...")
    return 0


if __name__ == "__main__":
    sys.exit(main())
