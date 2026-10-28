"""WebP copies of the site's photos.

Every JPEG under assets/img (except the brand folder) gets a .webp twin with the same name, and the
start page's hero also gets smaller copies for phones. The build then serves the .webp wherever one
exists. Run after adding or changing a picture:

    python3 tools/images.py
"""
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
HERO_WIDTHS = (800, 1200, 1600)


def main():
    made = 0
    for jpg in sorted((ROOT / "assets/img").rglob("*.jpg")):
        if jpg.parent.name == "brand":
            continue
        im = Image.open(jpg).convert("RGB")
        webp = jpg.with_suffix(".webp")
        im.save(webp, "WEBP", quality=82, method=6)
        if webp.stat().st_size >= jpg.stat().st_size:  # the odd photo compresses better as JPEG
            webp.unlink()
            continue
        made += 1
        if jpg.name == "hero.jpg":
            for w in HERO_WIDTHS:
                small = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
                small.save(jpg.with_name(f"hero-{w}.webp"), "WEBP", quality=82, method=6)
                made += 1
    print(f"{made} WebP files")


if __name__ == "__main__":
    main()
