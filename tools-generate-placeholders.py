#!/usr/bin/env python3
"""Fill every image slot on the site from a single source photograph.

Point SOURCE at any photo and run this script: it produces a correctly
sized, compressed JPEG for every image slot the site uses, keeping the
filenames the markup expects. Swap slots out one at a time later by
simply replacing an individual file with a real photo of the same name.

    python3 tools-generate-placeholders.py
    python3 tools-generate-placeholders.py path/to/another-photo.jpg

Uses `sips`, which ships with macOS — nothing to install.
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "assets", "img")
SOURCE = os.path.join(OUT, "IMG_7195.JPG.jpeg")

# name -> width. Every slot is rendered with CSS `object-fit: cover`, so only
# the width matters for quality; height follows the source's aspect ratio.
SLOTS = {
    # hero-1..4 are the rotating hero slides. These hold real photography —
    # running this script overwrites them with the placeholder source.
    "hero-1": 900,
    "hero-2": 1100,
    "hero-3": 1100,
    "hero-4": 760,
    "about-founder": 900,
    "about-studio": 900,
    "about-detail": 700,
    "hair-bank": 900,
}

for name in ["wavy", "bouncy", "bonestraight", "deepwave"]:
    SLOTS["collection-" + name] = 760

for name in ["silk-straight", "cascade-curls", "body-wave-luxe", "blunt-bob",
             "closure-classic", "frontal-glam", "deep-wave", "pixie-chic"]:
    for view in range(1, 5):
        SLOTS["product-%s-%d" % (name, view)] = 900

# Both SBS Babes rows use real platform embeds, not image files.

for i in range(1, 6):
    SLOTS["avatar-%d" % i] = 240


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else SOURCE
    if not os.path.exists(source):
        sys.exit("Source photo not found: %s\nPass one as an argument, or drop it in assets/img/." % source)

    for name, width in sorted(SLOTS.items()):
        dest = os.path.join(OUT, name + ".jpg")
        subprocess.run(
            ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "62",
             "--resampleWidth", str(width), source, "--out", dest],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    total = sum(os.path.getsize(os.path.join(OUT, n + ".jpg")) for n in SLOTS)
    print("%d images written to %s (%.1f MB total)" % (len(SLOTS), OUT, total / 1e6))


if __name__ == "__main__":
    main()
