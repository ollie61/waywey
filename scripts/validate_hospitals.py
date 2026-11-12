#!/usr/bin/env python3
"""Validate all WayWey hospital data packages.

Schema failures are errors. Cross-file consistency checks are also errors where
WayWey relies on the relationship at runtime. Unmapped destination pavilions are
allowed because WayWey intentionally supports off-site/unmapped destinations.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
HOSPITALS = ROOT / "hospitals"
SCHEMAS = ROOT / "schemas"

FILES = {
    "config.json": "config.schema.json",
    "destinations.json": "destinations.schema.json",
    "routes.json": "routes.schema.json",
    "guide.json": "guide.schema.json",
}


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path.relative_to(ROOT)}: invalid JSON: {exc}") from exc


def path_text(error_path) -> str:
    return "".join(f"[{part!r}]" for part in error_path) or "<root>"


def validate_schema(data, schema, filename: Path, errors: list[str]) -> None:
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    for err in sorted(validator.iter_errors(data), key=lambda e: list(e.absolute_path)):
        errors.append(
            f"{filename.relative_to(ROOT)} {path_text(err.absolute_path)}: {err.message}"
        )


def validate_cross_files(folder: Path, config, destinations, routes, guide, errors, warnings) -> None:
    rel = folder.relative_to(ROOT)
    if config["id"] != folder.name:
        errors.append(f"{rel}/config.json: id {config['id']!r} must match folder name {folder.name!r}")

    app_langs = config["ambassadorLanguages"]
    if config["defaultAppLanguage"] not in app_langs:
        errors.append(f"{rel}/config.json: defaultAppLanguage must be in ambassadorLanguages")

    for lang in app_langs:
        if lang not in guide:
            errors.append(f"{rel}/guide.json: missing ambassador guide for language {lang!r}")

    graph = routes["graph"]
    aliases = config.get("nodeAliases", {})
    known_nodes = set(graph)

    for node, neighbours in graph.items():
        for neighbour in neighbours:
            if neighbour not in known_nodes:
                errors.append(f"{rel}/routes.json: graph node {node!r} points to unknown node {neighbour!r}")

    for entrance in config["entrances"]:
        node = entrance["node"]
        resolved = aliases.get(node, node)
        if resolved not in known_nodes:
            errors.append(
                f"{rel}/config.json: entrance {entrance['id']!r} resolves to unknown routing node {resolved!r}"
            )

    # If the dataset-strength basis begins with an explicit destination count,
    # keep that human-readable count synchronized with the actual dataset.
    basis = config.get("datasetStrength", {}).get("basis", "")
    count_match = __import__("re").match(r"^(\d+)\s+destinations\b", basis)
    if count_match and int(count_match.group(1)) != len(destinations):
        errors.append(
            f"{rel}/config.json: datasetStrength basis destination count "
            f"{count_match.group(1)} does not match {len(destinations)} records"
        )

    # Catch accidental duplicate canonical records without rejecting legitimate
    # same-name departments at different locations.
    seen_ids = set()
    for dest in destinations:
        if dest.get("id") in seen_ids:
            errors.append(f"{rel}/destinations.json: duplicate destination id {dest.get('id')!r}")
        seen_ids.add(dest.get("id"))

    for edge in routes.get("edgeInstructions", {}):
        parts = edge.split(">")
        if len(parts) != 2 or parts[1] not in graph.get(parts[0], []):
            errors.append(f"{rel}/routes.json: instructions for unvalidated edge {edge!r}")

    # Explicit station-to-destination directions must reference real starting
    # stations and canonical destination IDs; unknown records are unsafe.
    entrance_ids = {e["id"] for e in config["entrances"]}
    destination_ids = {d["id"] for d in destinations}
    for key, translations in routes.get("stationDestinationDirections", {}).items():
        station_id, separator, destination_id = key.partition(">")
        if not separator or station_id not in entrance_ids or destination_id not in destination_ids:
            errors.append(f"{rel}/routes.json: invalid station-to-destination key {key!r}")
        for language, steps in translations.items():
            if language not in {"en", "fr", "es", "pt", "he", "ar", "ru", "vi", "sw", "bg"}:
                errors.append(f"{rel}/routes.json: unknown route language {language!r} in {key!r}")
            if not steps or any(not step.strip() for step in steps):
                errors.append(f"{rel}/routes.json: empty instructions for {key!r}/{language}")

    seen = {}
    for i, dest in enumerate(destinations):
        key = (dest["en"].strip().casefold(), dest["p"].strip().casefold(), dest["loc"].strip().casefold())
        if key in seen:
            errors.append(
                f"{rel}/destinations.json: duplicate destination at indexes {seen[key]} and {i}: {dest['en']!r}"
            )
        else:
            seen[key] = i

        if dest["p"]:
            pieces = [p.strip() for p in dest["p"].split("/") if p.strip()]
            mapped = any((aliases.get(p, p) in known_nodes) for p in pieces)
            special = dest["p"] in config.get("specialPavilionLabels", {})
            if not mapped and not special:
                warnings.append(
                    f"{rel}/destinations.json[{i}]: pavilion/node {dest['p']!r} is intentionally unmapped or needs review"
                )


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    schemas = {name: load_json(SCHEMAS / schema_name) for name, schema_name in FILES.items()}

    hospital_dirs = sorted(
        p for p in HOSPITALS.iterdir()
        if p.is_dir() and not p.name.startswith(".")
    )
    if not hospital_dirs:
        errors.append("No hospital data packages found")

    for folder in hospital_dirs:
        loaded = {}
        for filename in FILES:
            path = folder / filename
            if not path.exists():
                errors.append(f"{path.relative_to(ROOT)}: required file is missing")
                continue
            try:
                data = load_json(path)
            except ValueError as exc:
                errors.append(str(exc))
                continue
            loaded[filename] = data
            validate_schema(data, schemas[filename], path, errors)

        if all(name in loaded for name in FILES):
            validate_cross_files(
                folder,
                loaded["config.json"],
                loaded["destinations.json"],
                loaded["routes.json"],
                loaded["guide.json"],
                errors,
                warnings,
            )

    for warning in warnings:
        print(f"WARNING: {warning}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"Validation failed: {len(errors)} error(s), {len(warnings)} warning(s).", file=sys.stderr)
        return 1

    print(f"Validated {len(hospital_dirs)} hospital package(s): 0 errors, {len(warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
