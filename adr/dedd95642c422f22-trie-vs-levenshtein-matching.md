# 매칭 알고리즘: Trie vs Levenshtein Distance

## Context

타이핑 중 인라인 제안을 위해서는 입력 문자열에 대해 후보 노트 제목을 빠르게 매칭해야 한다. Levenshtein Distance 기반 Fuzzy Search는 오타 허용이 가능하지만, 후보 노트 수가 늘어날수록 계산 비용이 커진다. Trie는 접두사 기반 매칭에서 확장성이 좋지만 오타(typo) 허용이 되지 않는다.

## Decision

확장성(scalability)을 우선해 Trie 기반 접두사 매칭을 채택한다.

## Alternatives

- **Levenshtein Distance 기반 Fuzzy Search**: 오타 허용이 가능하다는 장점이 있으나, 노트 수 증가에 따른 계산 비용 증가로 확장성이 떨어져 기각. 다만 실사용 관찰상 사용자는 의도치 않게 제안이 튀어나오는 경우보다 의도를 가지고 호출하는 경우가 많고, 약 3~5글자 입력 시점에 이미 식별되므로 오타 문제의 체감 영향은 크지 않았다.

## Consequences

- 대량의 노트를 추적해도 제안 계산이 빠르게 유지됨 (확장성 확보)
- 오타가 있으면 제안이 뜨지 않는 한계가 있음 — 실사용에서는 크게 문제되지 않았으나 알려진 트레이드오프로 남음
- 재설계한다면 "Trie 기반 실시간 제안 + Synonym Dictionary + Levenshtein 기반 typo 처리 + semantic DB hybrid search를 통한 일괄 링크 처리"의 하이브리드 방향을 고려할 것 (README 참고)
