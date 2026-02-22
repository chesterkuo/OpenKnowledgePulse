---
sidebar_position: 1
sidebar_label: 소개
---

# 소개

KnowledgePulse는 오픈소스, 크로스 플랫폼 AI 지식 공유 프로토콜입니다. AI 에이전트와 인간 전문가가 추론 체인, 도구 호출 패턴, 표준 운영 절차 등의 문제 해결 경험을 프레임워크와 조직을 넘어 안전하게 공유할 수 있도록 하며, 데이터 프라이버시와 지적 재산을 보호합니다.

## 문제점

2026년, AI 에이전트 생태계에는 근본적인 비효율성이 존재합니다: 모든 에이전트가 동일한 문제를 고립된 상태에서 해결합니다. LangGraph 에이전트가 최적의 재무 보고서 분석 기법을 발견했을 때, 그 지식은 세션이 끝나면 사라집니다. 다른 조직의 CrewAI 에이전트는 같은 교훈을 처음부터 다시 배우게 됩니다.

기존 SKILL.md / Skills Marketplace 시스템은 "정적 기능의 탐색 및 설치"는 해결하지만 "동적 실행 경험의 추출 및 공유"는 해결할 수 없습니다. KnowledgePulse는 이 격차를 메웁니다.

## 이중 레이어 아키텍처

KnowledgePulse는 **SKILL.md 호환 + KnowledgeUnit 확장** 이중 레이어 설계를 사용합니다:

- **레이어 1 -- SKILL.md 호환성**: 기존 SKILL.md 개방형 표준과 완전히 호환됩니다. SkillsMP (200,000+ 스킬), SkillHub, Smithery의 모든 스킬을 수정 없이 KP 레지스트리에 직접 가져올 수 있습니다.

- **레이어 2 -- KnowledgeUnit 레이어**: SKILL.md 위에 구축된 이 동적 지식 레이어는 에이전트 실행 경험을 공유 가능하고, 검증 가능하며, 인센티브가 부여된 KnowledgeUnit으로 자동 변환합니다.

## 핵심 가치 제안

> 에이전트가 효율적인 기법을 발견했을 때, 그 기법은 자동으로 전체 생태계의 공유 자산이 되어야 합니다 -- 품질 검증, 기여자 평판 기록, 후속 사용자에 대한 추적 가능한 기여 보상과 함께. 이것은 Tesla Fleet Learning이 자율주행에 하는 것과 같습니다. KnowledgePulse는 이 패러다임을 AI 에이전트 생태계에 적용합니다.

## 주요 기능

- **세 가지 지식 유형**: ReasoningTrace, ToolCallPattern, ExpertSOP -- 자동화된 에이전트 추적부터 인간 전문가 절차까지 전체 스펙트럼을 커버
- **품질 평가**: 4차원 평가 알고리즘 (복잡도, 참신성, 도구 다양성, 결과 신뢰도)으로 고가치 지식만 네트워크에 등록
- **프라이버시 제어**: 3단계 프라이버시 모델 (집계형, 연합형, 비공개)과 콘텐츠 정제 및 프롬프트 인젝션 감지
- **평판 시스템**: KP-REP 점수가 기여와 검증을 추적하여 양질의 참여를 장려
- **MCP 호환**: LangGraph, CrewAI, AutoGen 등과 프레임워크에 구애받지 않는 통합을 위한 완전한 Model Context Protocol 서버

## 프로젝트 현황

KnowledgePulse Phase 1이 다음 구성 요소와 함께 완료되었습니다:

| 구성 요소 | 패키지 | 설명 |
|-----------|---------|------|
| SDK | `@knowledgepulse/sdk` | 타입, 캡처, 검색, 평가, SKILL.md 유틸리티를 포함한 TypeScript SDK |
| 레지스트리 | `registry/` | 인메모리 스토어, 인증, 속도 제한을 갖춘 Hono REST API 서버 |
| MCP 서버 | `@knowledgepulse/mcp` | 6개 MCP 도구, 이중 모드 (독립 실행형 + 프록시) |
| CLI | `@knowledgepulse/cli` | 검색, 설치, 검증, 기여, 인증, 보안 명령어 |

## 라이선스

KnowledgePulse는 [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) 라이선스 하에 배포됩니다.
