#!/usr/bin/env python3
import re
import subprocess
import sys
from collections import defaultdict

COMMENT_PATTERN = re.compile(r"(?:^|\s)(?://|/\*|#|'''|\"\"\")")
CODE_EXTENSIONS = {
    ".c", ".cc", ".cpp", ".cs", ".go", ".h", ".hpp", ".java", ".js",
    ".jsx", ".kt", ".php", ".py", ".rb", ".rs", ".sh", ".swift", ".ts",
    ".tsx", ".yaml", ".yml",
}


def changed_lines(base: str, head: str) -> list[tuple[str, int, str]]:
    result = subprocess.run(
        ["git", "diff", "--unified=0", "--no-color", f"{base}...{head}", "--"],
        check=True,
        capture_output=True,
        text=True,
    )
    findings = []
    path = None
    line_number = None
    for line in result.stdout.splitlines():
        if line.startswith("+++ b/"):
            path = line[6:]
            continue
        if line.startswith("@@ "):
            match = re.search(r"\+(\d+)(?:,(\d+))?", line)
            line_number = int(match.group(1)) if match else None
            continue
        if not path or line_number is None or not line.startswith("+"):
            continue
        content = line[1:]
        if path != "/dev/null" and any(path.endswith(ext) for ext in CODE_EXTENSIONS):
            if COMMENT_PATTERN.match(content):
                findings.append((path, line_number, content.strip()))
        line_number += 1
    return findings


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: warn_new_comments.py <base-sha> <head-sha>", file=sys.stderr)
        return 2
    findings = changed_lines(sys.argv[1], sys.argv[2])
    grouped = defaultdict(list)
    for path, line, content in findings:
        grouped[path].append((line, content))
        message = "New comment or docstring: confirm it records non-obvious rationale."
        print(f"::warning file={path},line={line}::{message}")
    if not grouped:
        print("No added comments or docstrings detected.")
        return 0
    print("## Comment review reminders")
    print()
    print("New comments or docstrings were added. Review whether each is necessary.")
    print()
    for path, entries in grouped.items():
        lines = ", ".join(str(line) for line, _ in entries)
        print(f"- `{path}`: line(s) {lines}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
