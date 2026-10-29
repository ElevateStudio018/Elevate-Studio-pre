"""WebP copies of the site's photos.

Every JPEG under assets/img (except the brand folder) gets a .webp twin with the same name, plus
smaller copies (name-160.webp up to name-1200.webp) that the build offers in srcset; the start page's hero
also gets its own sizes for phones. The build then serves the .webp wherever one
exists. Run after adding or changing a picture:

    python3 tools/images.py
"""
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
HERO_WIDTHS = (800, 1200, 1400, 1600, 1920)
# Smaller copies for cards and phones (name-320.webp etc.), made when the photo is clearly wider
WIDTHS = (160, 240, 320, 400, 480, 640, 720, 800, 960, 1200, 1400, 1600)
# Screenshots of websites keep more detail than photos need
SHARP = ("device-", "alvhem")


def main():
    made = 0
    for jpg in sorted((ROOT / "assets/img").rglob("*.jpg")):
        if jpg.parent.name == "brand":
            continue
        im = Image.open(jpg).convert("RGB")
        webp = jpg.with_suffix(".webp")
        q = 90 if jpg.stem.startswith(SHARP) else 82
        im.save(webp, "WEBP", quality=q, method=6)
        made += 1
        for w in WIDTHS:
            if im.width >= w * 1.1:
                im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(jpg.with_name(f"{jpg.stem}-{w}.webp"), "WEBP", quality=q, method=6)
                made += 1
        if jpg.name == "hero.jpg":
            for w in HERO_WIDTHS:
                small = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
                small.save(jpg.with_name(f"hero-{w}.webp"), "WEBP", quality=82, method=6)
                made += 1
    print(f"{made} WebP files")


if __name__ == "__main__":
    main()
