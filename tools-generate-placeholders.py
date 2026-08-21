#!/usr/bin/env python3
"""Fill EMPTY image slots from a single source photograph.

Produces a correctly sized, compressed JPEG for every slot the site uses,
keeping the filenames the markup expects.

    python3 tools-generate-placeholders.py                 # fill empty slots only
    python3 tools-generate-placeholders.py photo.jpg       # use a different source
    python3 tools-generate-placeholders.py --force         # overwrite EVERYTHING

**It never overwrites an existing file unless you pass --force.** That
guard exists because it was learned the hard way: an earlier version
regenerated every slot on each run, and running it after real photos had
been dropped in silently replaced four different hero shots with four
copies of the placeholder. The hero looked like a broken slideshow when
it was really rotating four identical pictures.

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
}

for name in ["wavy", "bouncy", "bonestraight", "deepwave", "pixie-curls"]:
    SLOTS["collection-" + name] = 760

for name in ["silk-straight", "cascade-curls", "body-wave-luxe", "blunt-bob",
             "closure-classic", "frontal-glam", "deep-wave", "pixie-chic"]:
    for view in range(1, 5):
        SLOTS["product-%s-%d" % (name, view)] = 900

# Both SBS Babes rows use real platform embeds, not image files.

for i in range(1, 6):
    SLOTS["avatar-%d" % i] = 240


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv[1:]
    source = args[0] if args else SOURCE
    if not os.path.exists(source):
        sys.exit("Source photo not found: %s\nPass one as an argument, or drop it in assets/img/." % source)

    written, kept = 0, []
    for name, width in sorted(SLOTS.items()):
        dest = os.path.join(OUT, name + ".jpg")
        if os.path.exists(dest) and not force:
            kept.append(name)
            continue
        subprocess.run(
            ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "62",
             "--resampleWidth", str(width), source, "--out", dest],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        written += 1

    if written:
        print("Filled %d empty slot(s)." % written)
    else:
        print("Nothing to fill — every slot already has an image.")
    if kept:
        print("Left %d existing image(s) untouched. Use --force to overwrite them,\n"
              "which replaces ALL photography with the source picture." % len(kept))


if __name__ == "__main__":
    main()
