#!/usr/bin/env python3
"""Deterministic checks for the mechanical rules in AGENTS.md.

Covers only rules that can be verified without judgement calls:
  - Index & Staleness Management (file naming, index.md/stale.md presence
    and structure)
  - Shared Comment & Docstring Synchronization (synced id / version / count
    consistency between code and synced-comments/<id>.md, plus checking the
    tracking file's code_hash against participating files' non-comment content)

Exit code is non-zero if any rule is violated.
"""
import hashlib
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

EXCLUDE_DIRS = {".git", "node_modules", ".githooks"}

HEX16 = r"[0-9a-f]{16}"
KEBAB = r"[a-z0-9]+(?:-[a-z0-9]+)*"
MANAGED_FILENAME_RE = re.compile(rf"^{HEX16}-{KEBAB}\.md$")

SYNCED_ID_RE = r"[0-9a-f]{12}"
SYNCED_TAG_RE = re.compile(
    rf"synced id:\s*({SYNCED_ID_RE})\s*,\s*version:\s*(\d+)\s*,\s*count:\s*(\d+)"
)
INDEX_ENTRY_FIELDS = ["File", "Summary", "Related Files", "Related Symbols"]

TEXT_FILE_EXTS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".kt",
    ".c", ".h", ".cpp", ".hpp", ".cc", ".rb", ".php", ".swift", ".md",
    ".sh", ".yaml", ".yml", ".json", ".toml",
}


def iter_files():
    for path in REPO_ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO_ROOT).parts):
            continue
        yield path


def rel(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT))


def check_index_and_staleness(errors: list):
    managed_dirs = {}
    for path in iter_files():
        if MANAGED_FILENAME_RE.match(path.name):
            managed_dirs.setdefault(path.parent, []).append(path)

    for directory, files in managed_dirs.items():
        index_md = directory / "index.md"
        stale_md = directory / "stale.md"

        if not index_md.exists():
            errors.append(f"{rel(directory)}: missing required index.md")
        if not stale_md.exists():
            errors.append(f"{rel(directory)}: missing required stale.md")
        if not index_md.exists():
            continue

        content = index_md.read_text(encoding="utf-8", errors="replace")
        blocks = [b.strip() for b in re.split(r"(?m)^---\s*$", content) if b.strip()]

        listed_files = set()
        for block in blocks:
            entry = {}
            for line in block.splitlines():
                m = re.match(r"^(File|Summary|Related Files|Related Symbols):\s*(.*)$", line)
                if m:
                    entry[m.group(1)] = m.group(2).strip()
            missing_fields = [f for f in INDEX_ENTRY_FIELDS if f not in entry]
            if missing_fields:
                errors.append(
                    f"{rel(index_md)}: entry missing field(s) {missing_fields} in block: {block[:60]!r}"
                )
                continue
            listed_files.add(entry["File"])
            if not (directory / entry["File"]).exists():
                errors.append(
                    f"{rel(index_md)}: entry references nonexistent file {entry['File']!r}"
                )

        actual_files = {f.name for f in files}
        unlisted = actual_files - listed_files
        for name in sorted(unlisted):
            errors.append(f"{rel(directory)}: {name} is not listed in index.md")

        stray = listed_files - actual_files - {"index.md", "stale.md"}
        for name in sorted(stray):
            errors.append(f"{rel(index_md)}: lists {name!r} but no such file exists")


# Line-comment markers by extension, used to strip comments before hashing
# a file's content (AGENTS.md rule 2: code_hash fingerprints the non-comment
# code). Extensions without a known marker are hashed as-is.
HASH_COMMENT_EXTS = {".py", ".sh", ".yaml", ".yml", ".toml", ".rb"}
SLASH_COMMENT_EXTS = {
    ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".kt",
    ".c", ".h", ".cpp", ".hpp", ".cc", ".swift",
}
HASH_AND_SLASH_COMMENT_EXTS = {".php"}


def strip_comments(path: Path, text: str) -> str:
    if path.suffix in HASH_COMMENT_EXTS:
        markers = ("#",)
    elif path.suffix in SLASH_COMMENT_EXTS:
        markers = ("//",)
    elif path.suffix in HASH_AND_SLASH_COMMENT_EXTS:
        markers = ("#", "//")
    else:
        return text
    return "\n".join(
        line for line in text.splitlines() if not line.strip().startswith(markers)
    )


def compute_code_hash(paths: list) -> str:
    ordered = sorted(paths, key=lambda p: p.name)
    combined = "".join(
        strip_comments(p, p.read_text(encoding="utf-8", errors="replace"))
        for p in ordered
    )
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()[:12]


def parse_synced_frontmatter(text: str):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return None
    fm = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^(\w+):\s*(.*)$", line.strip())
        if kv:
            fm[kv.group(1)] = kv.group(2).strip()
    return fm


def check_synced_comments(errors: list):
    occurrences = {}  # id -> list[(file, version, count)]
    for path in iter_files():
        if path.suffix not in TEXT_FILE_EXTS:
            continue
        if rel(path).startswith("synced-comments/"):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for m in SYNCED_TAG_RE.finditer(text):
            sid, version, count = m.group(1), int(m.group(2)), int(m.group(3))
            occurrences.setdefault(sid, []).append((rel(path), version, count))

    synced_dir = REPO_ROOT / "synced-comments"

    for sid, locs in occurrences.items():
        tracking_file = synced_dir / f"{sid}.md"
        if not tracking_file.exists():
            errors.append(
                f"synced id {sid}: referenced in {[l[0] for l in locs]} but "
                f"synced-comments/{sid}.md does not exist"
            )
            continue

        fm = parse_synced_frontmatter(
            tracking_file.read_text(encoding="utf-8", errors="replace")
        )
        if fm is None or "version" not in fm or "count" not in fm or "code_hash" not in fm:
            errors.append(
                f"synced-comments/{sid}.md: missing/invalid frontmatter "
                f"(version, count, code_hash)"
            )
            continue

        fm_version = int(fm["version"])
        fm_count = int(fm["count"])
        is_obsolete = fm.get("obsolete", "false").lower() == "true"

        if is_obsolete and locs:
            errors.append(
                f"synced id {sid}: marked obsolete in synced-comments/{sid}.md "
                f"but still referenced in {[l[0] for l in locs]}"
            )
        elif not is_obsolete:
            participant_paths = [REPO_ROOT / file_name for file_name, _, _ in locs]
            expected_hash = compute_code_hash(participant_paths)
            if expected_hash != fm["code_hash"]:
                errors.append(
                    f"synced id {sid}: underlying (non-comment) code in "
                    f"{[l[0] for l in locs]} no longer matches code_hash "
                    f"{fm['code_hash']} in synced-comments/{sid}.md (recomputed "
                    f"{expected_hash}); bump the version and update code_hash "
                    f"per AGENTS.md rule 4"
                )

        actual_count = len(locs)
        for file_name, version, tagged_count in locs:
            if version != fm_version:
                errors.append(
                    f"{file_name}: synced id {sid} has version {version}, "
                    f"expected {fm_version} (from synced-comments/{sid}.md)"
                )
            if tagged_count != fm_count:
                errors.append(
                    f"{file_name}: synced id {sid} tag has count {tagged_count}, "
                    f"expected {fm_count} (from synced-comments/{sid}.md)"
                )
        if fm_count != actual_count:
            errors.append(
                f"synced-comments/{sid}.md: declares count {fm_count} but "
                f"{actual_count} code location(s) actually reference it "
                f"({[l[0] for l in locs]})"
            )


def main() -> int:
    errors: list = []
    check_index_and_staleness(errors)
    check_synced_comments(errors)

    if errors:
        print("AGENTS.md rule violations found:\n", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        print(f"\n{len(errors)} violation(s). Commit blocked.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
