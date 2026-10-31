#!/usr/bin/env python3
"""AI-200 問題集のビルドと検証。

questions/*.yml を読み込み、形式・正解・出題範囲の網羅を検証して
サイトが読み込む JSON（既定: site/data/questions.json）を出力する。

    python3 scripts/build_questions.py            # 検証して JSON を出力
    python3 scripts/build_questions.py --check    # 検証だけ（出力しない）

検証エラーがあれば終了コード 1。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS_DIR = ROOT / "questions"
DEFAULT_OUT = ROOT / "site" / "data" / "questions.json"

TYPES = {"single", "multiple", "yesno", "order", "match", "dropdown"}
LETTERS = "ABCDEFGHIJ"
ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")


class Errors(list):
    def add(self, where: str, msg: str) -> None:
        self.append(f"{where}: {msg}")


def load_yaml(path: Path):
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def letters_to_indexes(value, n_options: int, where: str, errors: Errors) -> list[int]:
    items = value if isinstance(value, list) else [value]
    result = []
    for item in items:
        if not isinstance(item, str) or len(item) != 1 or item not in LETTERS[:n_options]:
            errors.add(where, f"answer '{item}' is not one of {LETTERS[:n_options]}")
            continue
        result.append(LETTERS.index(item))
    if len(set(result)) != len(result):
        errors.add(where, "answer contains duplicates")
    return sorted(result)


def validate_question(q: dict, objectives: dict, cases: dict, errors: Errors) -> dict | None:
    qid = q.get("id", "<no id>")
    where = f"question {qid}"
    missing = [key for key in ("id", "objective", "type", "question", "explanation") if not q.get(key)]
    for key in missing:
        errors.add(where, f"missing '{key}'")
    if missing:
        return None
    if not ID_RE.match(qid):
        errors.add(where, "id must be lowercase letters, digits and hyphens")
    if q["objective"] not in objectives:
        errors.add(where, f"unknown objective '{q['objective']}'")
    qtype = q["type"]
    if qtype not in TYPES:
        errors.add(where, f"unknown type '{qtype}'")
        return None
    if q.get("difficulty", 2) not in (1, 2, 3):
        errors.add(where, "difficulty must be 1, 2 or 3")
    if q.get("case") and q["case"] not in cases:
        errors.add(where, f"unknown case '{q['case']}'")
    refs = q.get("refs") or []
    if not refs:
        errors.add(where, "at least one reference URL is required in 'refs'")
    for ref in refs:
        if not str(ref).startswith("https://"):
            errors.add(where, f"ref must be an https URL: {ref}")

    out = {
        "id": qid,
        "objective": q["objective"],
        "domain": objectives.get(q["objective"], {}).get("domain"),
        "type": qtype,
        "difficulty": q.get("difficulty", 2),
        "tags": q.get("tags", []),
        "case": q.get("case"),
        "question": q["question"].strip(),
        "explanation": q["explanation"].strip(),
        "refs": refs,
    }

    if qtype in ("single", "multiple"):
        options = q.get("options") or []
        if not 2 <= len(options) <= len(LETTERS):
            errors.add(where, f"needs 2-{len(LETTERS)} options")
            return None
        answer = letters_to_indexes(q.get("answer"), len(options), where, errors)
        if qtype == "single" and len(answer) != 1:
            errors.add(where, "single needs exactly one answer")
        if qtype == "multiple" and len(answer) < 2:
            errors.add(where, "multiple needs two or more answers")
        out.update(options=[str(o) for o in options], answer=answer,
                   shuffle=q.get("shuffle", True))
    elif qtype == "yesno":
        statements = q.get("statements") or []
        if len(statements) < 2:
            errors.add(where, "yesno needs two or more statements")
        for i, s in enumerate(statements):
            if not isinstance(s.get("answer"), bool) or not s.get("text"):
                errors.add(where, f"statement {i + 1} needs 'text' and boolean 'answer'")
        out["statements"] = [{"text": s.get("text", ""), "answer": s.get("answer")} for s in statements]
    elif qtype == "order":
        items = q.get("items") or []
        if len(items) < 3:
            errors.add(where, "order needs three or more items")
        distractors = q.get("distractors") or []
        if len(set(items + distractors)) != len(items) + len(distractors):
            errors.add(where, "order items and distractors must be unique")
        out.update(items=items, distractors=distractors)
    elif qtype == "match":
        pairs = q.get("pairs") or []
        if len(pairs) < 2:
            errors.add(where, "match needs two or more pairs")
        for i, p in enumerate(pairs):
            if not p.get("left") or not p.get("right"):
                errors.add(where, f"pair {i + 1} needs 'left' and 'right'")
        out.update(pairs=pairs, distractors=q.get("distractors") or [])
    elif qtype == "dropdown":
        template = q.get("template") or ""
        blanks = {str(k): v for k, v in (q.get("blanks") or {}).items()}
        found = PLACEHOLDER_RE.findall(template)
        if not found:
            errors.add(where, "dropdown template needs {{n}} placeholders")
        if sorted(set(found)) != sorted(blanks):
            errors.add(where, f"placeholders {sorted(set(found))} do not match blanks {sorted(blanks)}")
        for key, blank in blanks.items():
            options = blank.get("options") or []
            if blank.get("answer") not in options:
                errors.add(where, f"blank {key}: answer must be one of its options")
        out.update(template=template.rstrip("\n"), language=q.get("language", ""), blanks=blanks)
    return out


def repo_blob_base() -> str:
    repo = os.environ.get("GITHUB_REPOSITORY", "tono55/AI-200")
    ref = os.environ.get("GITHUB_REF_NAME")
    if not ref:
        try:
            ref = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=ROOT,
                                 capture_output=True, text=True, check=True).stdout.strip()
        except (OSError, subprocess.CalledProcessError):
            ref = "main"
    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    return f"{server}/{repo}/blob/{ref}/"


def build(out_path: Path | None) -> int:
    errors = Errors()
    meta = load_yaml(QUESTIONS_DIR / "objectives.yml")
    min_questions = meta.get("min_questions", 3)
    domains = meta["domains"]
    objectives = {o["id"]: o for o in meta["objectives"]}
    cases = {c["id"]: c for c in (load_yaml(QUESTIONS_DIR / "cases.yml") or [])}

    questions, seen = [], set()
    for path in sorted(QUESTIONS_DIR.glob("domain-*.yml")):
        data = load_yaml(path) or []
        for raw in data:
            q = validate_question(raw, objectives, cases, errors)
            if q is None:
                continue
            if q["id"] in seen:
                errors.add(f"question {q['id']}", f"duplicate id (in {path.name})")
            seen.add(q["id"])
            q["source_file"] = f"questions/{path.name}"
            questions.append(q)

    counts = {oid: 0 for oid in objectives}
    for q in questions:
        if q["objective"] in counts:
            counts[q["objective"]] += 1
    for oid, n in counts.items():
        if n < min_questions:
            errors.add(f"objective {oid}", f"only {n} question(s); at least {min_questions} required")

    type_counts: dict[str, int] = {}
    for q in questions:
        type_counts[q["type"]] = type_counts.get(q["type"], 0) + 1
    print(f"questions: {len(questions)}  objectives covered: "
          f"{sum(1 for n in counts.values() if n)}/{len(counts)}  types: {type_counts}")
    domain_counts: dict[str, int] = {}
    for q in questions:
        d = str(q["objective"]).split(".")[0]
        domain_counts[d] = domain_counts.get(d, 0) + 1
    if questions:
        shares = "  ".join(f"{d}: {n} ({n * 100 / len(questions):.1f}%)"
                           for d, n in sorted(domain_counts.items()))
        print(f"domains: {shares}")

    if errors:
        print(f"\n{len(errors)} error(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    if out_path:
        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "skills_version": "2026-10-07",
            "min_questions": min_questions,
            "repo_blob_base": repo_blob_base(),
            "domains": domains,
            "objectives": list(objectives.values()),
            "cases": list(cases.values()),
            "questions": questions,
        }
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"wrote {out_path.relative_to(ROOT) if out_path.is_relative_to(ROOT) else out_path}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="validate only")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output JSON path")
    args = parser.parse_args()
    sys.exit(build(None if args.check else args.out.resolve()))


if __name__ == "__main__":
    main()
