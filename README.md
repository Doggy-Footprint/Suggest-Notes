# Suggest Notes

[![Demo](https://img.youtube.com/vi/6aFwVIqfgIQ/0.jpg)](https://www.youtube.com/watch?v=6aFwVIqfgIQ)

**[한국어](#한국어) | [English](#english)**

> Obsidian에서 문장을 작성하다가 연결할 노트를 바로 찾아 링크로 바꾸는 인라인 자동완성 플러그인입니다.

---

## 한국어

### 문제와 해결

Obsidian의 기본 내부 링크는 `[[`를 입력한 뒤 검색 팝업에서 노트를 찾아야 합니다. 노트를 쓰는 흐름 안에서 이미 떠올린 개념을 연결하기에는 이 전환이 불필요하다고 느꼈습니다.

Suggest Notes는 현재 입력 중인 단어를 접두사로 검색해, 설정한 범위의 노트를 인라인으로 제안합니다. 항목을 선택하면 입력한 단어가 `[[노트 경로|입력한 키워드]]` 링크로 교체됩니다. 사용자는 폴더 경로와 태그로 제안 대상을 좁혀, 큰 vault에서도 의도한 노트만 빠르게 연결할 수 있습니다.

### 사용자 경험

- 공백 또는 탭으로 구분된 단어를 두 글자 이상 입력하면 제안을 표시합니다.
- 노트 제목과 frontmatter `aliases`를 모두 검색합니다.
- 최근 사용한 항목과 누적 사용 빈도를 반영해 최대 8개를 정렬합니다.
- 대소문자를 구분하지 않으며, 현재 노트 자신과 코드 블록에서는 제안하지 않습니다.

![폴더 기반 설정](images/user_setting.png)
![태그 기반 설정](images/tag_example.png)

### 설계와 기술적 판단

| 과제 | 선택 | 이유와 트레이드오프 |
| --- | --- | --- |
| 타이핑 중 검색 지연 | 접두사 Trie | 각 노드에 하위 후보의 정렬된 목록을 유지해 조회를 빠르게 만들었습니다. 대신 노트·메타데이터 변경 시 경로를 따라 후보 목록을 갱신하는 비용과 메모리를 감수했습니다. |
| 추천 기준의 변경 가능성 | 검색 구조와 통계 정책 분리 | Trie는 `Statistic` 인터페이스만 사용하고, Obsidian 영역의 `RecentStatistic`이 최근성·빈도를 정합니다. 검색 자료구조를 수정하지 않고 랭킹 정책을 교체할 수 있습니다. |
| 불완전한 Plugin API와 테스트 난이도 | 순수 TypeScript 도메인 모듈 분리 | Obsidian API에 의존하는 이벤트·UI 계층과 Trie를 분리해 Jest 단위 테스트와 빠른 디버깅 반복을 가능하게 했습니다. |
| 모호한 API 동작 확인 | API 실험과 DevTools 디버깅 | `EditorSuggest`, vault/metadata 이벤트를 실제로 검증하고, Electron DevTools·소스맵·hot reload로 런타임 동작을 추적했습니다. |
| Fuzzy 매칭 허용 여부 | 접두사 매칭(Trie) | Levenshtein distance는 오타를 허용하지만 노트 수가 늘수록 계산 비용이 커집니다. 노트 수 증가에도 안정적인 확장성을 우선해 Trie를 선택했고, 오타 입력 시 제안하지 않는 한계는 감수했습니다. |

Trie는 제목·alias의 접두사에 해당하는 노드를 찾은 뒤 사전 정렬된 후보를 읽습니다. 삽입·삭제·이름 변경은 vault와 metadata 이벤트를 통해 인메모리 인덱스에 반영합니다. 의도하지 않은 제안보다 명시적으로 입력한 접두사 검색을 우선해, fuzzy matching 대신 예측 가능한 실시간 응답을 선택했습니다.

### 성능과 저사양 환경 대응

Obsidian은 Electron(Chromium) 기반이며 다수 사용자가 사무용 노트북처럼 리소스가 제한된 환경에서 실행합니다. 이 전제를 [ADR](adr/739c040a74bae30b-electron-memory-latency-profiling.md)로 명시하고, Node.js 벤치마크 대신 Chromium 프로파일링 도구로 Electron 렌더러 프로세스에서 직접 측정했습니다. 실사용 vault(565개 파일, 1,310개 키워드)를 복사한 테스트셋을, 개발 모드에서만 활성화되는 [`srcs/profiling.ts`](srcs/profiling.ts)의 계측 유틸(production 빌드에서는 no-op)로 측정했습니다.

| 구분 | 작업 | 수치 |
| --- | --- | --- |
| I/O bound (Vault/MetadataCache API) | 초기 로딩(`vault.getFiles()` + Trie 구성, 565파일) | 12.9 ms |
| I/O bound | 파일 변경/삭제 이벤트 처리 | 1 μs 이하 ~ 10 μs |
| CPU bound (Trie 인메모리 연산) | 검색(prefix 매칭) | 1 μs 이하 ~ 10 μs |
| CPU bound | 삽입/수정 | 1 μs 이하 ~ 10 μs |
| CPU bound | 삭제(다중 keyword 노트일수록 편차 증가) | 1 μs 이하 ~ 40 μs |

초기 로딩은 노트 1개당 O(h)(h = 키워드 길이)로 증가합니다. 노트 수가 20배(약 11,300개)로 늘어도 12.9 ms × 20 ≈ 258 ms로 추정돼 체감 불가능한 수준이라 판단하고, 추가 최적화는 후순위로 미뤘습니다. 1,000 ~ 50,000개 노트로 극단 규모도 확인했습니다(노트당 keyword 4개):

| 샘플 수 | Trie 구성 (ms) | 검색 (ms) | 갱신 (ms) |
| --- | --- | --- | --- |
| 1,000 | 56.36 | 0.276 | 1.208 |
| 5,000 | 495.62 | 0.167 | 3.975 |
| 10,000 | 1,684.61 | 0.206 | 2.691 |
| 20,000 | 7,212.56 | 0.160 | 6.400 |
| 50,000 | 62,611.70 | 0.195 | 43.078 |

검색 시간은 시간복잡도가 O(query 길이)이지 O(n)이 아니라서 샘플 수와 무관하게 유지됩니다. 반면 Trie 구성 시간은 샘플이 50배 늘 때 약 1,111배로 초선형 증가하지만, 실사용 규모(수백~수천 노트) 밖의 문제로 명시적으로 선을 긋고 갱신 시간(5만 개에서도 43 ms)에 집중했습니다. 갱신 로직은 SortedArray로 시간복잡도를 O(h × n log n)에서 O(h × log n)으로 낮췄고, 조상 노드로의 전파 중 변화가 없으면 즉시 중단(`if (!deleted) break;`)합니다.

같은 연산에서도 0 μs와 10 μs의 배수가 번갈아 관측되는 이상 현상을 발견해, cache locality·OS scheduling 가설을 세우고 `1+1` 같은 무의미한 연산으로 대조군을 측정해 검증을 시도했습니다. 확정적 결론은 아니었지만, 측정치를 그대로 믿기보다 원인을 추적하는 태도로 접근한 사례입니다.

이를 바탕으로 저사양 환경을 위해 오타 허용(Levenshtein) 대신 노트 수 증가에도 계산 비용이 안정적인 Trie를 선택했고(위 설계 표), 2글자 미만 입력은 트리거하지 않아 불필요한 연산을 피했으며, 제안 목록을 8개로 제한해 렌더링 비용을 낮췄습니다. 각 노드가 정렬된 후보를 캐싱해 조회 비용을 삽입/삭제 시점으로 옮기는 메모리·응답성 트레이드오프도 의도적으로 감수했습니다.

### 개발 중 겪은 어려움과 해결

| 문제 | 해결 |
| --- | --- |
| `EditorSuggest` 핵심 메소드 절반이 공식 문서에 설명 없음 | Discord와 1,800여 개 공개 플러그인 소스 참고, 별도 [API 테스트 프로젝트](https://github.com/Doggy-Footprint/Obsidian-API-Tester)로 직접 검증 |
| Obsidian API 의존으로 신뢰할 수 있는 단위 테스트 불가 | 검색 로직(`srcs/`)을 API와 완전히 분리, 통합 계층(`obsidian_srcs/`)만 의존하도록 재구성 ([ADR](adr/132a373562451935-tdd-module-separation.md)) |
| 번들된 JS는 breakpoint가 무의미하고, reload 시 디버깅 정보 소실 | inline source map + hot-reload 조합으로 TypeScript 원본 기준 디버깅 환경 구축 |
| PrefixTree가 root 노드를 중복 저장(`apple` → `a-a-p-p-l-e`)했지만 삽입·검색이 대칭적으로 오염돼 모든 테스트 통과 | 우연히 발견 후 회귀 테스트 추가 — TDD가 만능은 아니라는 것을 실감 |
| 프로파일링 함수가 콜백을 이중 실행해 Trie 상태를 오염시키고, μs 환산식도 잘못됨(×100→×1000) | 최근 커밋([`611c6ac`](https://github.com/Doggy-Footprint/Suggest-Notes/commit/611c6ac))에서 발견해 수정 — 측정 도구도 검증 대상이라는 교훈 |

### 구현 구성

- [`srcs/trie.ts`](srcs/trie.ts) — 대소문자 비구분 Trie, 후보 정렬·전파, 통계 추상화
- [`obsidian_srcs/main.ts`](obsidian_srcs/main.ts) — `EditorSuggest`, 링크 삽입, vault·metadata 이벤트 동기화
- [`obsidian_srcs/statistic.ts`](obsidian_srcs/statistic.ts) — 최근 사용과 사용 횟수 기반 랭킹 정책
- [`srcs/__tests__/test_trie.ts`](srcs/__tests__/test_trie.ts) — Obsidian과 독립적으로 실행되는 Trie 단위 테스트
- [`.github/workflows/release.yml`](.github/workflows/release.yml) — 태그 push 시 빌드하고 배포 산출물을 포함한 GitHub Release 초안 생성

**기술 스택:** TypeScript, Obsidian Plugin API, Jest, esbuild, GitHub Actions

### 실행 및 개발

```bash
npm install
npm run dev    # esbuild watch 모드
npm test       # Jest 단위 테스트
npm run build  # 타입 검사, manifest/versions 동기화, production build
```

개발 빌드는 소스맵을 포함합니다. Obsidian의 DevTools와 hot-reload를 함께 사용하면 번들된 JavaScript 대신 TypeScript 기준으로 브레이크포인트와 호출 흐름을 확인할 수 있습니다.

### 프로젝트 상태

이 프로젝트는 자료구조 기반의 실시간 추천, 외부 API 경계 분리, TDD, Electron 환경의 프로파일링과 CI/CD를 경험하기 위해 만든 개인 프로젝트입니다. 현재는 기능을 적극적으로 확장하거나 유지보수하지 않습니다. 일반 사용 목적이라면 [Various Complements](https://github.com/tadashi-aikawa/obsidian-various-complements-plugin)처럼 활발히 관리되는 대안을 권합니다.

### 관련 글

- [Suggest Notes Plugin 개요 및 주요 아이디어](https://harsh-wavelength-48b.notion.site/Suggest-Notes-Plugin-e1b270542fd54e30b59cf9366c1328d9?source=copy_link)
- [Obsidian Plugin 개발 가이드 — Obsidian Plugin API의 보완 및 디버깅 중심](https://harsh-wavelength-48b.notion.site/Obsidian-Plugin-Obisidian-Plugin-API-35010f228487427192f7dd88bfd95e15?source=copy_link)
- [Debugging an Obsidian Plugin — why I don't separate business logic](https://harsh-wavelength-48b.notion.site/Debugging-Obsidian-Plugin-Why-I-don-t-separate-business-logics-742979440a8d47a9808180a09a702d5d?source=copy_link)

### Feedback

Bug reports and suggestions: khs1903b@gmail.com

---

## English

### Problem and solution

Obsidian's native internal linking requires typing `[[` and then finding a note in a search popup. That context switch is unnecessary when a related concept is already in mind while writing.

Suggest Notes searches the word currently being typed as a prefix and presents inline suggestions from a user-defined scope. Selecting an item replaces that word with a `[[note path|typed keyword]]` link. Folder paths and tags let users restrict suggestions to the notes that matter, even in large vaults.

### Experience

- Shows suggestions after two or more characters in a space- or tab-delimited word.
- Searches both note titles and frontmatter `aliases`.
- Ranks up to eight results by recent use and cumulative link frequency.
- Matches case-insensitively and suppresses self-links and suggestions inside code blocks.

![Folder-based setting](images/user_setting.png)
![Tag-based setting](images/tag_example.png)

### Design decisions

| Challenge | Choice | Rationale and trade-off |
| --- | --- | --- |
| Search latency while typing | Prefix Trie | Each node keeps an ordered list of descendant candidates for fast reads. This trades memory and update work on the path for responsive suggestions. |
| Evolvable ranking | Separate search structure and statistics policy | The Trie depends only on `Statistic`; Obsidian-side `RecentStatistic` supplies recency and frequency ranking. Policies can change without modifying the data structure. |
| Incomplete Plugin API and hard-to-test runtime | Isolated pure TypeScript domain module | Keeping the Trie separate from Obsidian event and UI code makes Jest unit tests and fast debug iterations practical. |
| Unclear API behavior | API experiments and DevTools debugging | I validated `EditorSuggest` and vault/metadata events in the runtime, then used Electron DevTools, source maps, and hot reload to trace behavior. |
| Whether to allow fuzzy matches | Prefix matching (Trie) | Levenshtein distance tolerates typos, but its cost grows with note count. I prioritized stable scalability as the vault grows and accepted that a typo yields no suggestion. |

The plugin finds the Trie node for a title or alias prefix, then reads its pre-sorted candidates. Vault and metadata events keep the in-memory index current for additions, edits, deletions, and renames. I deliberately chose predictable prefix matching over fuzzy matching for intentional, real-time invocation.

### Performance and designing for low-spec machines

Obsidian runs on Electron (Chromium), and many users run it on resource-constrained machines like office laptops. I stated that assumption explicitly in an [ADR](adr/739c040a74bae30b-electron-memory-latency-profiling.md) and measured directly in the Electron renderer process with Chromium's profiling tools instead of relying on Node.js benchmarks. The numbers below come from a copy of my real vault (565 files, 1,310 search keywords), instrumented with [`srcs/profiling.ts`](srcs/profiling.ts) (active only in development mode; a no-op in production).

| Category | Operation | Measurement |
| --- | --- | --- |
| I/O-bound (Vault/MetadataCache API) | Initial load (`vault.getFiles()` + Trie build, 565 files) | 12.9 ms |
| I/O-bound | File change/delete event handling | under 1 μs – 10 μs |
| CPU-bound (in-memory Trie) | Search (prefix match) | under 1 μs – 10 μs |
| CPU-bound | Insert/update | under 1 μs – 10 μs |
| CPU-bound | Delete (variance grows with multi-keyword notes) | under 1 μs – 40 μs |

Initial-load time grows by O(h) (h = keyword length) per note. Even at 20x the note count (~11,300 notes), the estimate is 12.9 ms × 20 ≈ 258 ms — imperceptible in practice — so I deprioritized further optimization here. I also profiled extreme scale, from 1,000 to 50,000 samples (4 keywords per note):

| Samples | Trie setup (ms) | Search (ms) | Update (ms) |
| --- | --- | --- | --- |
| 1,000 | 56.36 | 0.276 | 1.208 |
| 5,000 | 495.62 | 0.167 | 3.975 |
| 10,000 | 1,684.61 | 0.206 | 2.691 |
| 20,000 | 7,212.56 | 0.160 | 6.400 |
| 50,000 | 62,611.70 | 0.195 | 43.078 |

Search time stays flat regardless of sample count — its complexity is O(query length), not O(n). Trie setup, however, grows super-linearly, about 1,111x for a 50x increase in samples. I drew an explicit line here: this falls outside realistic vault sizes (hundreds to low thousands of notes), so I focused on update time instead, which stays fast even at 50,000 notes (43 ms). The update path uses a SortedArray to bring complexity down from O(h × n log n) to O(h × log n), and propagation toward the root stops early once a node reports no change (`if (!deleted) break;`).

I also noticed the same operation alternating between 0 μs and multiples of 10 μs. I hypothesized cache locality or OS scheduling and tried to isolate it by timing a trivial `1+1` operation as a control. The result wasn't conclusive, but it reflects an approach of tracing causes rather than taking measurements at face value.

Building on this, I chose Trie over typo-tolerant Levenshtein distance for stable cost as the vault grows (see the design table above), skip triggering suggestions below two characters to avoid unnecessary work, and cap the suggestion list at 8 items to limit rendering cost. I also accepted a deliberate memory-for-responsiveness trade-off: each node caches a pre-sorted list of candidates, moving lookup cost onto insert/delete.

### Challenges during development and how I resolved them

| Problem | Resolution |
| --- | --- |
| Half of `EditorSuggest`'s core methods had no official documentation | Consulted the Discord community and 1,800+ published plugin sources; built a dedicated [API test project](https://github.com/Doggy-Footprint/Obsidian-API-Tester) to verify behavior directly |
| Mocking couldn't produce reliable unit tests against the Obsidian API | Separated core search logic (`srcs/`) entirely from the API, leaving only the integration layer (`obsidian_srcs/`) dependent on it ([ADR](adr/132a373562451935-tdd-module-separation.md)) |
| Bundled JS made breakpoints useless, and reload cleared debugging info | Combined inline source maps with hot-reload to debug against the original TypeScript |
| PrefixTree silently duplicated its root node (`apple` → `a-a-p-p-l-e`), but insertion and search were corrupted the same way, so every test passed | Found by chance, then added a regression test — a reminder that TDD isn't a silver bullet |
| The profiling function invoked its callback twice, corrupting Trie state, and its μs conversion was wrong (×100 instead of ×1000) | Found and fixed in a recent commit ([`611c6ac`](https://github.com/Doggy-Footprint/Suggest-Notes/commit/611c6ac)) — a reminder that measurement tooling needs verification too |

### Implementation map

- [`srcs/trie.ts`](srcs/trie.ts) — case-insensitive Trie, ordered candidate propagation, and the statistics abstraction
- [`obsidian_srcs/main.ts`](obsidian_srcs/main.ts) — `EditorSuggest`, link insertion, and vault/metadata event synchronization
- [`obsidian_srcs/statistic.ts`](obsidian_srcs/statistic.ts) — recency- and frequency-based ranking
- [`srcs/__tests__/test_trie.ts`](srcs/__tests__/test_trie.ts) — Trie unit tests isolated from Obsidian
- [`.github/workflows/release.yml`](.github/workflows/release.yml) — creates a GitHub Release draft with build artifacts when a tag is pushed

**Stack:** TypeScript, Obsidian Plugin API, Jest, esbuild, GitHub Actions

### Run and develop

```bash
npm install
npm run dev    # esbuild watch mode
npm test       # Jest unit tests
npm run build  # type-check, sync manifest/versions, production build
```

Development builds include source maps. With Obsidian DevTools and hot reload, breakpoints and call flows can be inspected against TypeScript rather than the bundled JavaScript.

### Project status

This personal project was built to explore real-time recommendation with data structures, external-API boundaries, TDD, Electron profiling, and CI/CD. It is not actively maintained or expanded. For everyday use, consider the actively maintained [Various Complements](https://github.com/tadashi-aikawa/obsidian-various-complements-plugin).

### Writing

- [Korean: Suggest Notes Plugin overview and core ideas](https://harsh-wavelength-48b.notion.site/Suggest-Notes-Plugin-e1b270542fd54e30b59cf9366c1328d9?source=copy_link)
- [Korean: Obsidian Plugin development guide — API gaps and debugging](https://harsh-wavelength-48b.notion.site/Obsidian-Plugin-Obisidian-Plugin-API-35010f228487427192f7dd88bfd95e15?source=copy_link)
- [English: Debugging an Obsidian Plugin — why I don't separate business logic](https://harsh-wavelength-48b.notion.site/Debugging-Obsidian-Plugin-Why-I-don-t-separate-business-logics-742979440a8d47a9808180a09a702d5d?source=copy_link)

### License

[MIT](LICENSE)
