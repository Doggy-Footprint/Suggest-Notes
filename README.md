# Suggest Notes

> [상태](#상태)를 먼저 읽어주세요!!
> READ [Status](#status) First!!!

[![Demo](https://img.youtube.com/vi/6aFwVIqfgIQ/0.jpg)](https://www.youtube.com/watch?v=6aFwVIqfgIQ)

**[한국어](#한국어) | [English](#english)**

---

## 한국어

[Obsidian](https://obsidian.md)에서 노트를 작성하면서 자동으로 연결할 노트를 제안해주는 플러그인입니다. `[[`를 입력하고 검색 팝업을 뒤지지 않아도 됩니다.

### 왜 만들었나

Obsidian의 기본 링크 기능은 `[[`를 입력하고 직접 검색해야 해서 타이핑 중 흐름이 끊깁니다. Suggest Notes는 사용자가 지정한 폴더/태그 범위의 노트만 추적해서, 타이핑 중 인라인 자동 완성으로 제안하며, 얼마나 자주·최근에 링크했는지에 따라 우선순위를 매깁니다.

### 기능

- **범위 지정 추적** — 전체 볼트가 아니라 폴더 경로 또는 태그로 지정한 노트만 추적
- **사용 빈도 기반 정렬** — 자주·최근에 연결한 노트가 먼저 뜨도록 별도의 스코어링/통계 모듈로 랭킹
- **대소문자 무시, 공백 허용** 매칭으로 부드러운 타이핑 경험
- **문맥 인식 제안** — 자기 자신으로의 링크 제외, 코드 블록 안에서는 제안 비활성화

![User Setting](/images/user_setting.png)
![Tag Setting](/images/tag_example.png)

### 내부 구조

이 프로젝트는 TDD 원칙을 지켜 개발했고, Obisidian 환경에서 테스트가 어려워 별도의 Trie 모듈을 구현했습니다.

- `srcs/trie.ts` — Trie/Node 핵심 구조와, "매칭 점수를 어떻게 매길지"를 검색 구조 자체로부터 분리한 `Statistic` 클래스. 덕분에 `obsidian_srcs/statistic.ts`의 `RecentStatistic` 같은 랭킹 전략을 Trie를 건드리지 않고 교체 가능
- `srcs/__tests__/test_trie.ts` — Obsidian API와 분리된 Trie 단위 테스트로 빠른 로컬 반복 개발 지원
- `.github/workflows/release.yml` — 태그 push 시 빌드하고 `main.js`, `manifest.json`, `styles.css`로 GitHub 릴리즈를 만드는 CI
- `sync_obsidian.mjs` — 릴리즈 시 `manifest.json`/`versions.json`을 `package.json`과 동기화

**기술 스택:** TypeScript, Jest, esbuild

### ADR - 기술 결정

- TDD 원칙과 모듈(Obisidian / Trie)분리
- Obisidian 환경 (Electron)에서 메모리 사용량 추적 (chromium profiling) 및 최적화 - 사무용 노트북에서 구동을 목표로 했습니다.
- Trie vs Levensten Distance - scalability를 위해서 Trie를 골라야 했습니다. 아쉬운 점은 Levenstein Distance는 Fuzzy Search를 지원할 수 있는 점입니다.
    - 다만 사용 경험에서 의도하지 않았는데 튀어나오는 경우보다 의도를 가지고 호출하는 경우가 더 많고, 약 3-5 char에서 식별이 되기 때문에 오타 문제가 크지는 않았습니다.
    - 이 점에서 지금 다시 결정하더라도 Trie 기반 실시간 제안 + Synonym Dictionary 구성 & levenstein distance를 이용한 typo 처리 & semantic DB hybrid search를 통한 일괄 링크 처리를 지원하는 방향으로 갈 것 같습니다.

### 설치

옵시디언 Community Plugin에서 찾을 수 있습니다. 다만, 유지보수가 되지 않으므로 "various-complements-plugin"이나 다른 자동 완성 플러그인을 사용하시기 바랍니다.

### 개발

```bash
npm install
npm run dev     # esbuild watch 빌드
npm test        # Jest 테스트 실행
npm run build    # 타입체크, manifest/versions 동기화, production 빌드
```

### 사용법 안내

1. 커뮤니티 플러그인 중 Suggest Notes를 활성화 해주세요!
2. Suggest Notes를 활성화하면 기어 모양의 설정 아이콘이 보입니다. 클릭해주세요!
3. 이런 설정창이 나오면 빠르게 연결할 노트의 경로나 tag를 설정해주시면 됩니다!

- 예를 들어 여러분이 Study 폴더의 Summary 폴더 아래에 있는 모든 노트를 빠르게 연결하고 싶으시다면 **Path of directories**에 `Study/Summary`를 입력해주시면 됩니다. 여러 폴더를 설정하고 싶으시면 `;`로 구분하셔서 작성하시면 됩니다.
- 혹은 노트의 tag로도 설정할 수 있습니다. 위 경로에 포함되지 않더라도 직접 정한(여기서는 `link-note`) 태그를 노트에 추가하면 빠른 연결을 사용할 수 있습니다.

### 상태

이 프로젝트를 만들면서 자료구조 설계, TDD, Obsidian Plugin API, CI/CD까지 많은 것을 배웠습니다. 다만 앞으로 꾸준히 유지보수하기는 어려울 것 같아, 동일한 목적으로 활발히 관리되고 있는 [Various Complements](https://github.com/tadashi-aikawa/obsidian-various-complements-plugin) 플러그인을 대신 추천드립니다.

### 피드백

버그 리포트나 제안은 khs1903b@gmail.com 으로 보내주세요.

### 관련 글

- [한국어: Obsidian Plugin API 분석기](https://harsh-wavelength-48b.notion.site/Obsidian-Plugin-Obisidian-Plugin-API-35010f228487427192f7dd88bfd95e15?source=copy_link)
- [English: Debugging an Obsidian Plugin — why I don't separate business logic](https://harsh-wavelength-48b.notion.site/Debugging-Obsidian-Plugin-Why-I-don-t-separate-business-logics-742979440a8d47a9808180a09a702d5d?source=copy_link)

---

## English

An [Obsidian](https://obsidian.md) plugin that suggests linkable notes as you type — no more typing `[[` and digging through a search popup to link a note.

### Why

Obsidian's native linking requires `[[` plus a manual search, which breaks the flow while typing. Suggest Notes tracks a user-defined set of notes (by folder or tag) and surfaces them as inline autocomplete suggestions while typing, ranked by how often — and how recently — each note gets linked.

### Features

- **Scoped tracking** — track notes by folder path, by tag, or both, instead of indexing an entire vault.
- **Usage-based ranking** — notes you link often (and recently) surface first, via a dedicated scoring/statistics module.
- **Case-insensitive, whitespace-tolerant matching** for a smoother typing experience.
- **Context-aware suggestions** — skips self-links and suppresses suggestions inside code blocks.

![User Setting](/images/user_setting.png)
![Tag Setting](/images/tag_example.png)

### Under the hood

This project was built following TDD principles, and since testing was hard to do directly against the Obsidian environment, the search logic was pulled out into its own standalone Trie module.

- `srcs/trie.ts` — the Trie/Node core and a `Statistic` class that decouples "how a match scores" from the search structure itself, so ranking strategies (e.g. `RecentStatistic`, in `obsidian_srcs/statistic.ts`) can be swapped in without touching the Trie.
- `srcs/__tests__/test_trie.ts` — unit tests covering the Trie in isolation from the Obsidian API, enabling fast local iteration.
- `.github/workflows/release.yml` — tag-triggered CI that builds the plugin and publishes a GitHub release with `main.js`, `manifest.json`, and `styles.css`.
- `sync_obsidian.mjs` — keeps `manifest.json` / `versions.json` in sync with `package.json` on release.

**Stack:** TypeScript, Jest, esbuild

### ADR - Technical Decisions

- Followed TDD principles, with a clean separation between the Obsidian-facing code and the Trie module.
- Tracked and optimized memory usage in the Obsidian (Electron) environment via Chromium profiling — the goal was smooth operation even on modest office laptops.
- Trie vs. Levenshtein distance — chose Trie for scalability. The tradeoff is that Levenshtein distance would have enabled fuzzy search.
    - In practice this wasn't a big problem: users mostly invoke the suggestion intentionally rather than have it pop up unexpectedly, and typos tend to be identifiable within about 3-5 characters anyway.
    - If I were deciding again today, I'd go with real-time Trie-based suggestions, plus a synonym dictionary, plus Levenshtein-based typo handling, plus a semantic-DB hybrid search for batch linking.

### Installation

You can find and download it from Obsidian Community Plugins - but since it's no longer maintained, I'd recommend "various-complements-plugin" or another actively maintained autocomplete plugin instead.

### Development

```bash
npm install
npm run dev     # watch build via esbuild
npm test        # run Jest test suite
npm run build    # type-check, sync manifest/versions, production build
```

### Status

Building this taught me a lot — data structure design, TDD, the Obsidian Plugin API, CI/CD. That said, I don't expect to keep maintaining it going forward, so I'd instead recommend [Various Complements](https://github.com/tadashi-aikawa/obsidian-various-complements-plugin), an actively maintained plugin that covers the same use case and more.

### Feedback

Bug reports and suggestions: khs1903b@gmail.com

### Related writing

- [한국어: Obsidian Plugin API 분석기](https://harsh-wavelength-48b.notion.site/Obsidian-Plugin-Obisidian-Plugin-API-35010f228487427192f7dd88bfd95e15?source=copy_link)
- [English: Debugging an Obsidian Plugin — why I don't separate business logic](https://harsh-wavelength-48b.notion.site/Debugging-Obsidian-Plugin-Why-I-don-t-separate-business-logics-742979440a8d47a9808180a09a702d5d?source=copy_link)

### License

[MIT](LICENSE)
