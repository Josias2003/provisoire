"""Helper to append a batch of questions to a data/it/*.json bank.

Usage from a batch script:

    from append_questions import append_questions
    append_questions("networking.json", [
        {"text": "...", "options": ["opt a", "opt b", "opt c", "opt d"], "correct": 2},
        ...
    ])

Each question dict: text (str), options (list of exactly 4 strings), correct (0-3 index).
IDs are auto-assigned starting after the current max id in the file.
Raises if any question has an empty text or does not have exactly 4 options,
or 'correct' out of range.
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "it"
LETTERS = ["a", "b", "c", "d"]


def append_questions(filename: str, questions: list):
    path = DATA_DIR / filename
    existing = json.loads(path.read_text(encoding="utf-8"))
    next_id = (max((q["id"] for q in existing), default=0)) + 1

    new_objs = []
    for q in questions:
        text = q["text"].strip()
        opts = q["options"]
        correct = q["correct"]
        if not text:
            raise ValueError(f"empty question text near id {next_id}")
        if len(opts) != 4:
            raise ValueError(f"question '{text[:50]}' needs exactly 4 options, got {len(opts)}")
        if not (0 <= correct <= 3):
            raise ValueError(f"question '{text[:50]}' correct index out of range: {correct}")
        options = [
            {"letter": LETTERS[i], "text": opts[i].strip(), "correct": i == correct}
            for i in range(4)
        ]
        new_objs.append({"id": next_id, "text": text, "options": options})
        next_id += 1

    combined = existing + new_objs

    lines = ["["]
    for i, obj in enumerate(combined):
        comma = "," if i < len(combined) - 1 else ""
        lines.append(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + comma)
    lines.append("]")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"{filename}: {len(existing)} -> {len(combined)} questions (+{len(new_objs)})")


def create_bank(filename: str, questions: list):
    path = DATA_DIR / filename
    if path.exists():
        raise FileExistsError(f"{path} already exists; use append_questions instead")
    path.write_text("[\n]\n", encoding="utf-8")
    append_questions(filename, questions)
