"""Collect the public website: the folder dist/ (published by Cloudflare Pages) and
elevate-studio-webb.zip (for uploading by hand to a web host such as Loopia).

    python3 tools/build.py && python3 tools/package.py

Only what visitors need goes in: the pages, assets, admin, sitemap/robots/RSS and the server
settings (.htaccess for Apache/Loopia, _redirects and _headers for Cloudflare Pages).
Build tools, server code (supabase/), mail templates and drafts stay out.
"""
import pathlib
import shutil
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
FOLDERS = ["assets", "admin", "insikter", "plattformar", "projekt", "tjanster"]
FILES = ["robots.txt", "sitemap.xml", "rss.xml", "llms.txt", "llms-full.txt", ".htaccess", "_redirects", "_headers"]

paths = [p for p in ROOT.glob("*.html")] + [ROOT / f for f in FILES]
for folder in FOLDERS:
    paths += [p for p in (ROOT / folder).rglob("*") if p.is_file()]
paths.sort()

dist = ROOT / "dist"
shutil.rmtree(dist, ignore_errors=True)
for p in paths:
    target = dist / p.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, target)

out = ROOT / "elevate-studio-webb.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for p in paths:
        z.write(p, p.relative_to(ROOT).as_posix())
print(f"dist/ and {out.name}: {len(paths)} files, {out.stat().st_size // 1024} KB")
