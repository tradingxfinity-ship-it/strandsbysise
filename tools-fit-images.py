#!/usr/bin/env python3
"""Resize and compress photos you've dropped into assets/img/ so they
match the slot they're filling.

Drop your screenshots or photos in using the slot's filename (see the
table in README.md), then run:

    python3 tools-fit-images.py                 # fit every slot that looks oversized
    python3 tools-fit-images.py ig-1 ig-2       # fit just these
    python3 tools-fit-images.py --all           # re-fit everything, oversized or not

A phone screenshot is usually 2-4 MB. The site only ever displays these
at a few hundred pixels wide, so this typically cuts them by 95% with no
visible difference — and keeps the repo small and the page fast.

Files are rewritten in place. Keep your originals somewhere else if you
want to re-crop them later. Uses `sips`, which ships with macOS.
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "assets", "img")

# Import the slot -> width map so the two tools can't drift apart.
sys.path.insert(0, ROOT)
from importlib import import_module

SLOTS = import_module("tools-generate-placeholders").SLOTS

# Anything noticeably bigger than it needs to be is worth fitting.
OVERSIZE_BYTES = 350_000


def dimensions(path):
    out = subprocess.run(["sips", "-g", "pixelWidth", path],
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if "pixelWidth:" in line:
            return int(line.split(":")[1].strip())
    return 0


def fit(name, width):
    path = os.path.join(OUT, name + ".jpg")
    if not os.path.exists(path):
        return None
    before = os.path.getsize(path)
    subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "62",
         "--resampleWidth", str(width), path, "--out", path],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return before, os.path.getsize(path)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--all" in sys.argv[1:]

    if args:
        targets = []
        for a in args:
            name = os.path.basename(a).replace(".jpg", "")
            if name not in SLOTS:
                sys.exit("Not a known image slot: %s\nSee the table in README.md." % name)
            targets.append(name)
    else:
        targets = sorted(SLOTS)

    saved = 0
    touched = 0
    for name in targets:
        path = os.path.join(OUT, name + ".jpg")
        if not os.path.exists(path):
            continue
        width = SLOTS[name]
        if not force and not args:
            # Skip anything already the right size and weight.
            if os.path.getsize(path) <= OVERSIZE_BYTES and dimensions(path) <= width * 1.1:
                continue
        result = fit(name, width)
        if not result:
            continue
        before, after = result
        saved += before - after
        touched += 1
        print("  %-28s %6.1f MB -> %5.0f KB" % (name + ".jpg", before / 1e6, after / 1e3))

    if not touched:
        print("Nothing to fit — every image is already the right size.")
    else:
        print("\nFitted %d image(s), saved %.1f MB." % (touched, saved / 1e6))


if __name__ == "__main__":
    main()
