#!/usr/bin/env fontforge
"""
Run with:
  fontforge -script scripts/build_with_fontforge.py sources/FennasRoman-Regular build

This script creates an SFD/OTF locally. The kit deliberately does not distribute
compiled font binaries.
"""
import csv, json, os, sys
import fontforge

source_dir = sys.argv[1]
output_dir = sys.argv[2] if len(sys.argv) > 2 else "build"
os.makedirs(output_dir, exist_ok=True)

with open(os.path.join(source_dir, "face.json"), encoding="utf-8") as f:
    meta = json.load(f)

font = fontforge.font()
font.encoding = "UnicodeFull"
font.em = 1000
font.familyname = meta["family"]
font.fullname = f'{meta["family"]} {meta["style"]}'
font.fontname = (meta["family"] + "-" + meta["style"]).replace(" ", "")
font.weight = meta["style"]
font.ascent = 800
font.descent = 200
font.version = "1.000"
font.copyright = "Copyright 2026. Fennas family source kit. See LICENSE-SOURCES.txt."

with open(os.path.join(source_dir, "glyphs.csv"), encoding="utf-8") as f:
    for row in csv.DictReader(f):
        cp = int(row["codepoint"])
        glyph = font.createChar(cp)
        glyph.importOutlines(os.path.join(source_dir, row["filename"]))
        glyph.width = int(row["width"])
        glyph.removeOverlap()
        glyph.correctDirection()
        glyph.simplify(1.0)

font.autoHint()
font.autoInstr()
font.save(os.path.join(output_dir, meta["slug"] + ".sfd"))
font.generate(os.path.join(output_dir, meta["slug"] + ".otf"))
print("Built", meta["slug"])
