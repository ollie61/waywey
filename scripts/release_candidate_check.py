#!/usr/bin/env python3
"""Static release-candidate invariants for WayWey.

This complements the hospital schema validator and browser-facing unit tests.
It checks packaging/version/cache relationships that are easy to let drift
during a multi-step milestone.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> int:
    errors: list[str] = []

    app = read("app.js")
    sw = read("service-worker.js")
    readme = read("README.md")
    manifest = json.loads(read("manifest.webmanifest"))

    version_match = re.search(r'const APP_VERSION="([^"]+)";', app)
    if not version_match:
        errors.append("app.js: APP_VERSION not found")
        version = None
    else:
        version = version_match.group(1)
        if f"**v{version}**" not in readme:
            errors.append(f"README.md: current milestone v{version} not found")

        milestone = ROOT / "docs" / f"MILESTONE-{version}.md"
        if not milestone.exists():
            errors.append(f"docs/MILESTONE-{version}.md: missing")

    shell_match = re.search(r'const SHELL_ASSETS=\[([\s\S]*?)\];', sw)
    if not shell_match:
        errors.append("service-worker.js: SHELL_ASSETS not found")
        shell_assets: set[str] = set()
    else:
        shell_assets = set(re.findall(r'"(\./[^"]+)"', shell_match.group(1)))
        if any("hospitals/" in item for item in shell_assets):
            errors.append("service-worker.js: hospital data must not be in SHELL_ASSETS")

    for imported in re.findall(r'from "\./(js/[^"]+)";', app):
        asset = "./" + imported
        if asset not in shell_assets:
            errors.append(f"service-worker.js: imported module {asset} missing from SHELL_ASSETS")

    for required in ("./index.html", "./manifest.webmanifest", "./styles.css", "./app.js"):
        if required not in shell_assets:
            errors.append(f"service-worker.js: required shell asset {required} missing")

    icon_paths = [item.get("src") for item in manifest.get("icons", []) if isinstance(item, dict)]
    if not icon_paths:
        errors.append("manifest.webmanifest: no icons declared")
    for icon in icon_paths:
        if isinstance(icon, str) and icon.startswith("./") and not (ROOT / icon[2:]).exists():
            errors.append(f"manifest.webmanifest: icon file missing: {icon}")

    hospital_dirs = sorted(
        p for p in (ROOT / "hospitals").iterdir()
        if p.is_dir() and (p / "config.json").exists()
    )
    if not hospital_dirs:
        errors.append("No hospital packages found")

    for folder in hospital_dirs:
        hospital_id = folder.name
        config = json.loads((folder / "config.json").read_text(encoding="utf-8"))

        clean_page = ROOT / hospital_id / "index.html"
        if not clean_page.exists():
            errors.append(f"{hospital_id}/index.html: clean hospital redirect missing")
        else:
            redirect = clean_page.read_text(encoding="utf-8")
            if f"hospital={hospital_id}" not in redirect:
                errors.append(f"{hospital_id}/index.html: redirect does not select {hospital_id}")
            if "location.search.slice(1)" not in redirect:
                errors.append(f"{hospital_id}/index.html: redirect does not preserve query parameters")

        link_token = f'href="./{hospital_id}/"'
        pos = app.find(link_token)
        if pos < 0:
            errors.append(f"app.js: landing selector missing hospital {hospital_id}")
            continue

        card_end = app.find("</a>", pos)
        card = app[pos:card_end if card_end >= 0 else pos + 1000]
        badge = re.search(r"strengthBadge\((\d+),", card)
        if not badge:
            errors.append(f"app.js: landing selector {hospital_id} has no dataset-strength badge")
        else:
            landing_level = int(badge.group(1))
            config_level = int(config["datasetStrength"]["level"])
            if landing_level != config_level:
                errors.append(
                    f"app.js: landing selector {hospital_id} strength {landing_level} "
                    f"does not match config level {config_level}"
                )

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"Release-candidate check failed: {len(errors)} error(s).", file=sys.stderr)
        return 1

    print(
        f"Release-candidate invariants passed for v{version}: "
        f"{len(hospital_dirs)} hospital package(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
