# Project Definition

Suggest Notes는 Obsidian 플러그인으로, 노트를 작성하는 동안 연결할 노트를 인라인 자동완성으로 제안해 `[[` 입력 후 검색 팝업을 뒤지는 흐름 끊김을 없앤다. 사용자가 지정한 폴더 경로 또는 태그 범위의 노트만 추적하며, 얼마나 자주·최근에 링크했는지에 따라 제안 순위를 매긴다.

# Documentation Guide

"Documentation" refers to standalone docs, inline comments, and docstrings.

## Principles
1. **Code is the Ground Truth**: Write documentation only to explain non-obvious rationale, behaviors, and constraints that cannot be inferred directly from the code.

  ## Comment Enforcement

  Default to no new comments or docstrings.

  A comment/docstring is allowed only when it records a non-obvious:
  - design constraint,
  - external-system,
  - safety/security invariant, or
  - reason a seemingly odd implementation is necessary.

  Do not use comments to narrate code, restate names/types/control flow, provide tutorials, or justify ordinary implementation choices.

## Index & Staleness Management
1. Every agent-managed directory (e.g., `/adr`) must contain `index.md` and `stale.md`.
2. File Naming: `<16-char-hex-id>-<kebab-case-name>.md` (e.g., `3f8a9c12b0e45d67-auth-flow.md`).
3. `index.md` Format: Use the following structure separated by `---` for grep/find compatibility:
   ````
   File: <file-name>
   Summary: <one-line summary>
   Related Files: <comma-separated repo paths>
   Related Symbols: <comma-separated function/class/module names>
   ````
4. `stale.md` Format: append stale files for each line.

## Shared Comment & Docstring Synchronization Rules

Follow these rules when identical docstrings or comments must be maintained across multiple locations:

1.	Generate a synced ID: Generate a 48-bit random hexadecimal ID (12 hex characters, e.g., a1b2c3d4e5f6).
2.	Create the tracking file: Create a file at `synced-comments/<synced_id>.md` with the following structure. `code_hash` fingerprints the participating files' non-comment content (each file's content with comments stripped, concatenated in alphanumeric order of filename, hashed):

````
---
version: 1
count: <number of associated code locations>
code_hash: <hash of participating files' non-comment content>
---

# Content
<Write the shared comment or docstring here>

# Version Log
## v1 Log
- Initial creation.
````
3.	Annotate in code: In all associated code locations, include the synchronization tag: `synced id: <synced_id>, version: <n>, count: <n>`
4. Handle content updates: When the shared comment text or the underlying non-comment code changes, increment the version in the frontmatter (and every code tag), recompute `code_hash` if the code changed, and add a new entry under # Version Log.
5.	Version bump trigger: Any code modification that changes the recomputed `code_hash`, or any edit to the shared comment/docstring text, requires the update in rule 4.
6. Deprecation & Removal: When removing the shared content entirely.
- Remove all corresponding comments/docstrings from every referenced code location.
- Increment the document's version, record the removal reason in the version log, and add obsolete: true to the frontmatter.

## Architecture Decision Record Rule

To write ADR, prompt user with your decision. (Do not write by your decision)

### Checklist for updating ADR

1. The decision is expensive to reverse
2. A concrete alternative was seriously considered and rejected.
3. The reasoning cannot be recovered by reading the code.

### Proposal

- Context
- Decision
- Alternatives: with reason to reject
- Consequences: expected consequences of this decision

# Task Guide

## User Decision

DO NOT arbitrary determine unspecified details of task. Freely talk back to resolve undermined and ambiguous details.

## Implementation + Test Workflow

Fix the interface contract before any code is written: signatures, return types, error type/mechanism, and a table of edge cases with expected results. Both implementation and tests derive from this contract.

1. Contract (main) — signatures, error types, edge-case table.
2. Implementer (subagent) — implementation + tests, run to green.
3. Verifier (`test-verifier`) — given the contract and the tests only.

### Rules for tests

- Expected values are established by running the code, never by estimation.
- Time, randomness, network, and filesystem are injected, not called directly.
- Errors are asserted by type, not by the fact that something threw.
- Every edge case in the contract table has a test.