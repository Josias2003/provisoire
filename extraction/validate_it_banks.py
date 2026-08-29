"""Validate all IT question bank JSON files under data/it/.

Checks per file:
  - valid JSON, must be a list
  - every question has non-empty 'text'
  - every question has exactly 4 options
  - every option has non-empty 'text' and a boolean 'correct'
  - exactly one option per question has correct == True
  - no duplicate 'id' within the file
  - no duplicate question text within the file (normalized, case-insensitive)

Prints a per-file report and a grand total. Exits non-zero if any errors found.
"""
import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "it"


def validate_file(path: Path):
    errors = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return [f"{path.name}: JSON parse error: {e}"], 0

    if not isinstance(data, list):
        return [f"{path.name}: root is not a list"], 0

    seen_ids = set()
    seen_text = set()

    for i, q in enumerate(data):
        loc = f"{path.name}[{i}] (id={q.get('id', '?')})"
        qid = q.get("id")
        if qid is None:
            errors.append(f"{loc}: missing id")
        elif qid in seen_ids:
            errors.append(f"{loc}: duplicate id {qid}")
        else:
            seen_ids.add(qid)

        text = (q.get("text") or "").strip()
        if not text:
            errors.append(f"{loc}: empty question text")
        else:
            norm = " ".join(text.lower().split())
            if norm in seen_text:
                errors.append(f"{loc}: duplicate question text")
            seen_text.add(norm)

        options = q.get("options") or []
        if len(options) != 4:
            errors.append(f"{loc}: expected 4 options, got {len(options)}")

        correct_count = 0
        opt_texts = set()
        for j, opt in enumerate(options):
            otext = (opt.get("text") or "").strip()
            if not otext:
                errors.append(f"{loc} option[{j}]: empty option text")
            norm_o = otext.lower().strip()
            if norm_o in opt_texts:
                errors.append(f"{loc}: duplicate option text within question ('{otext}')")
            opt_texts.add(norm_o)
            if not isinstance(opt.get("correct"), bool):
                errors.append(f"{loc} option[{j}]: 'correct' is not boolean")
            elif opt["correct"]:
                correct_count += 1

        if correct_count != 1:
            errors.append(f"{loc}: expected exactly 1 correct option, found {correct_count}")

    return errors, len(data)


def main():
    files = sorted(DATA_DIR.glob("*.json"))
    if not files:
        print(f"No JSON files found in {DATA_DIR}")
        sys.exit(1)

    grand_total = 0
    all_errors = []
    for f in files:
        errors, count = validate_file(f)
        grand_total += count
        status = "OK" if not errors else f"{len(errors)} ERROR(S)"
        print(f"{f.name:20s} {count:5d} questions   {status}")
        all_errors.extend(errors)

    print("-" * 50)
    print(f"{'TOTAL':20s} {grand_total:5d} questions")

    if all_errors:
        print(f"\n{len(all_errors)} validation error(s):")
        for e in all_errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("\nAll files valid.")


if __name__ == "__main__":
    main()
