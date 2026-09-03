# TDD 원칙과 Obsidian/Trie 모듈 분리

## Context

Obsidian 플러그인은 Electron 환경(`app.vault`, `MetadataCache` 등 Obsidian API)에 강하게 결합되어 있어, 플러그인 코드를 TDD로 개발하려 해도 Obsidian API를 모킹하지 않는 한 빠른 로컬 테스트 루프를 돌리기 어렵다. Suggest Notes의 핵심 로직(제안 후보 검색, 랭킹)은 Obsidian 자체와 무관한 순수 자료구조 문제이므로, 이 부분을 어떻게 테스트 가능하게 분리할지 결정이 필요했다.

## Decision

검색/랭킹 핵심 로직을 Obsidian API와 완전히 분리된 독립 모듈로 구현한다.

- `srcs/trie.ts`: Trie/Node 자료구조와, "매칭 점수를 어떻게 매길지"를 검색 구조 자체로부터 분리한 `Statistic` 클래스
- `srcs/__tests__/test_trie.ts`: Obsidian API 없이 Trie만 단위 테스트
- `obsidian_srcs/`: Obsidian API를 사용하는 플러그인 코드(예: `statistic.ts`의 `RecentStatistic` 같은 랭킹 전략)는 별도 디렉토리에 두고, `srcs`의 추상화(Statistic)를 구현/주입하는 방식으로 연결

이 구조 덕분에 랭킹 전략(`RecentStatistic` 등)을 Trie 코드를 건드리지 않고 교체할 수 있다.

## Alternatives

- **Obsidian API를 모킹해서 전체를 통합 테스트**: 초기 설정 비용이 크고, Obsidian API 표면이 넓어 모킹 유지보수 부담이 큼. 핵심 로직 검증에 비해 신호 대비 비용이 낮다고 판단해 기각.
- **테스트를 아예 작성하지 않고 수동 검증**: 반복적인 수동 검증(Obsidian 재시작, 노트 작성)은 피드백 루프가 느려 TDD로 개발 속도를 높이려는 목표와 배치되어 기각.

## Consequences

- 핵심 검색/랭킹 로직은 Obsidian 없이도 빠르게 반복 개발·테스트 가능
- Obsidian API 연동 코드(`obsidian_srcs`)는 상대적으로 얇게 유지되어야 하며, 이 부분의 버그는 여전히 수동 검증에 의존
- 랭킹 전략을 늘리거나 교체할 때 `Statistic` 인터페이스만 구현하면 되므로 확장 비용이 낮음
