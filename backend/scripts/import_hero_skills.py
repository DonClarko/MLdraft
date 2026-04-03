"""Import hero skill data from the Mobile Legends Fandom MediaWiki API.

This script resolves each hero page, parses the ability tables under the
"Abilities" section, and stores the result as JSON in Hero.skills.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup, Tag
from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Hero


API_URL = "https://mobile-legends.fandom.com/api.php"
WIKI_BASE_URL = "https://mobile-legends.fandom.com/wiki/"
USER_AGENT = "MLDraftAI/1.0 (+https://mobile-legends.fandom.com/)"
WIKI_URL_SAFE_CHARS = ":_()-!.'"

ABILITY_SLOT_BY_ID = {
    "Passive": "passive",
    "Skill_1": "skill_1",
    "Skill_2": "skill_2",
    "Skill_3": "skill_3",
    "Skill_4": "skill_4",
    "Ultimate": "ultimate",
}

TITLE_ALIASES = {
    "Popol and Kupa": "Popol and Kupa",
    "Yi Sun-shin": "Yi Sun-shin",
    "X.Borg": "X.Borg",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import hero skills into the local database.")
    parser.add_argument("--hero", help="Import a single hero by name.")
    parser.add_argument("--limit", type=int, help="Only process the first N matched heroes.")
    parser.add_argument("--only-missing", action="store_true", help="Skip heroes that already have skills.")
    parser.add_argument("--dry-run", action="store_true", help="Parse data without writing to the database.")
    parser.add_argument("--verbose", action="store_true", help="Print extra progress details.")
    return parser.parse_args()


def normalize_title(value: str) -> str:
    normalized = value.lower()
    normalized = normalized.replace("&", "and")
    normalized = re.sub(r"[^a-z0-9]+", "", normalized)
    return normalized


def clean_text(value: str) -> str:
    value = value.replace("\xa0", " ")
    value = value.replace("�", "-")
    value = value.replace("–", "-")
    value = value.replace("—", "-")
    value = value.replace("â€“", "-")
    value = value.replace("â€”", "-")
    value = value.replace("’", "'")
    value = re.sub(r"\s+", " ", value)
    value = value.replace(" .", ".")
    value = value.replace(" ,", ",")
    value = value.replace(" )", ")")
    value = value.replace("( ", "(")
    value = value.replace(" | ", " | ")
    return value.strip()


def build_wiki_url(title: str) -> str:
    slug = quote(title.replace(" ", "_"), safe=WIKI_URL_SAFE_CHARS)
    return f"{WIKI_BASE_URL}{slug}"


def fetch_parse_response(client: httpx.Client, page_title: str) -> dict[str, Any] | None:
    response = client.get(
        API_URL,
        params={
            "action": "parse",
            "page": page_title,
            "prop": "text",
            "format": "json",
            "redirects": 1,
            "disableeditsection": 1,
            "disablelimitreport": 1,
        },
    )
    response.raise_for_status()
    payload = response.json()
    if "parse" not in payload:
        return None
    return payload["parse"]


def search_page_title(client: httpx.Client, hero_name: str) -> str | None:
    response = client.get(
        API_URL,
        params={
            "action": "query",
            "list": "search",
            "srsearch": hero_name,
            "srlimit": 10,
            "srnamespace": 0,
            "format": "json",
        },
    )
    response.raise_for_status()
    results = response.json().get("query", {}).get("search", [])
    if not results:
        return None

    expected = normalize_title(hero_name)
    best_title = None
    best_score = -1

    for result in results:
        title = result.get("title", "")
        if "/" in title:
            continue
        candidate = normalize_title(title)
        score = 0
        if candidate == expected:
            score += 100
        if expected in candidate or candidate in expected:
            score += 20
        score -= abs(len(candidate) - len(expected))
        if score > best_score:
            best_score = score
            best_title = title

    return best_title


def resolve_page_title(client: httpx.Client, hero_name: str) -> tuple[str | None, dict[str, Any] | None]:
    candidates = [TITLE_ALIASES.get(hero_name, hero_name)]
    if candidates[0] != hero_name:
        candidates.append(hero_name)

    tried = set()
    for candidate in candidates:
        if candidate in tried:
            continue
        tried.add(candidate)
        parsed = fetch_parse_response(client, candidate)
        if parsed:
            return parsed.get("title", candidate), parsed

    searched_title = search_page_title(client, hero_name)
    if not searched_title:
        return None, None

    parsed = fetch_parse_response(client, searched_title)
    if not parsed:
        return None, None
    return parsed.get("title", searched_title), parsed


def extract_label_line(content_cell: Tag) -> list[str]:
    blocks = content_cell.find_all("div", recursive=False)
    if len(blocks) < 2:
        return []
    labels = clean_text(blocks[1].get_text(" ", strip=True))
    return [part.strip() for part in labels.split("|") if part.strip()]


def extract_description(content_cell: Tag) -> str:
    description_parts: list[str] = []
    hr_count = 0

    for child in content_cell.children:
        if isinstance(child, Tag) and child.name == "hr":
            hr_count += 1
            if hr_count >= 2:
                break
            continue

        if hr_count == 0:
            continue

        if isinstance(child, Tag):
            text = clean_text(child.get_text(" ", strip=True))
            if child.name == "b" and text.lower().startswith("skill terms"):
                break
            if "mw-collapsible" in (child.get("class") or []):
                break
        else:
            text = clean_text(str(child))

        if text:
            description_parts.append(text)

    return clean_text(" ".join(description_parts))


def extract_ability_from_heading(heading: Tag) -> dict[str, Any] | None:
    headline = heading.select_one("span.mw-headline")
    if not headline:
        return None

    table = heading.find_next("table", class_="wikitable")
    if not table:
        return None

    first_row = table.find("tr")
    if not first_row:
        return None

    cells = first_row.find_all("td", recursive=False)
    if len(cells) < 2:
        return None

    content_cell = cells[1]
    name_tag = content_cell.find("b")
    name = clean_text(name_tag.get_text(" ", strip=True)) if name_tag else clean_text(headline.get_text(" ", strip=True))
    description = extract_description(content_cell)
    if not description:
        return None

    return {
        "slot": ABILITY_SLOT_BY_ID.get(headline.get("id", ""), normalize_title(headline.get_text(" ", strip=True))),
        "section": clean_text(headline.get_text(" ", strip=True)),
        "name": name,
        "labels": extract_label_line(content_cell),
        "description": description,
    }


def parse_abilities(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    abilities_anchor = soup.select_one("span.mw-headline#Abilities")
    if not abilities_anchor:
        return []

    abilities_heading = abilities_anchor.find_parent(["h2", "h3", "h4"])
    if not abilities_heading:
        return []

    abilities: list[dict[str, Any]] = []
    current = abilities_heading.find_next_sibling()
    while current:
        if isinstance(current, Tag) and current.name == "h2":
            break
        if isinstance(current, Tag) and current.name in {"h3", "h4"}:
            ability = extract_ability_from_heading(current)
            if ability:
                abilities.append(ability)
        current = current.find_next_sibling()

    return abilities


def build_skills_payload(hero_name: str, page_title: str, abilities: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "hero": hero_name,
        "source": "mobile-legends.fandom.com",
        "page_title": page_title,
        "source_url": build_wiki_url(page_title),
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "abilities": abilities,
    }


def iter_heroes(args: argparse.Namespace) -> list[Hero]:
    db = SessionLocal()
    try:
        query = select(Hero).order_by(Hero.name.asc())
        if args.hero:
            query = query.where(Hero.name == args.hero)
        heroes = list(db.scalars(query))
        if args.only_missing:
            heroes = [hero for hero in heroes if not hero.skills]
        if args.limit is not None:
            heroes = heroes[: args.limit]
        return heroes
    finally:
        db.close()


def import_skills(args: argparse.Namespace) -> int:
    heroes = iter_heroes(args)
    if not heroes:
        print("No heroes matched the requested filters.")
        return 1

    updated = 0
    failed: list[str] = []

    db = SessionLocal()
    try:
        persisted_heroes = {
            hero.name: hero
            for hero in db.scalars(
                select(Hero).where(Hero.name.in_([hero.name for hero in heroes]))
            )
        }

        with httpx.Client(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            timeout=30.0,
        ) as client:
            for index, hero in enumerate(heroes, start=1):
                print(f"[{index}/{len(heroes)}] {hero.name}")
                try:
                    page_title, parsed = resolve_page_title(client, hero.name)
                    if not page_title or not parsed:
                        raise ValueError("page not found")

                    abilities = parse_abilities(parsed["text"]["*"])
                    if not abilities:
                        raise ValueError("no abilities section found")

                    payload = build_skills_payload(hero.name, page_title, abilities)
                    if args.verbose:
                        print(f"  page={page_title} abilities={len(abilities)}")

                    if not args.dry_run:
                        persisted_heroes[hero.name].skills = json.dumps(payload, ensure_ascii=False)
                    updated += 1
                except Exception as error:  # noqa: BLE001
                    failed.append(f"{hero.name}: {error}")
                    print(f"  failed: {error}")

                time.sleep(0.2)

        if args.dry_run:
            db.rollback()
        else:
            db.commit()
    finally:
        db.close()

    print(f"Imported skills for {updated} hero(es).")
    if failed:
        print("Failures:")
        for item in failed:
            print(f"- {item}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(import_skills(parse_args()))