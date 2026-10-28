"""Pack the public website into elevate-studio-webb.zip, ready to upload to the web host.

    python3 tools/build.py && python3 tools/package.py

Only what visitors need goes in: the pages, assets, admin, sitemap/robots/RSS and .htaccess.
Build tools, server code (supabase/), mail templates and drafts stay out.
"""
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
FOLDERS = ["assets", "admin", "insikter", "plattformar", "projekt", "tjanster"]
FILES = ["robots.txt", "sitemap.xml", "rss.xml", "llms.txt", "llms-full.txt", ".htaccess"]

out = ROOT / "elevate-studio-webb.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    paths = [p for p in ROOT.glob("*.html")] + [ROOT / f for f in FILES]
    for folder in FOLDERS:
        paths += [p for p in (ROOT / folder).rglob("*") if p.is_file()]
    for p in sorted(paths):
        z.write(p, p.relative_to(ROOT).as_posix())
print(f"{out.name}: {len(paths)} files, {out.stat().st_size // 1024} KB")
