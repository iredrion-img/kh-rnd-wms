---
name: wms-component-generator
description: KH_RnD WMS 프로젝트의 표준에 맞춰 React 컴포넌트(UI 및 대시보드 차트)를 생성하거나 수정하는 스킬.
---
# WMS Component Generator Skill

이 스킬은 `KH_RnD` 프로젝트의 프론트엔드 UI 컴포넌트나 대시보드 차트를 새로 만들거나 수정할 때 사용합니다.
에이전트는 프론트엔드 코드를 작성할 때 이 가이드라인을 엄격히 준수해야 합니다.

## 기술 스택 (Tech Stack)
- **Framework**: React 19 (Hooks: `useState`, `useEffect` 등 사용)
- **Styling**: Tailwind CSS (arbitrary values 지양, 기본 Tailwind 유틸리티 우선)
- **Icons**: `lucide-react` (SVG 직접 삽입 대신 Lucide 컴포넌트 활용)
- **Charts**: `recharts` 라이브러리 확보

## 컴포넌트 작성 규칙 (Component Rules)
1. **함수형 컴포넌트**: 화살표 함수 `const ComponentName = ({ props }) => {}` 형태로 선언합니다.
2. **모듈 내보내기**: 파일 맨 하단에 `export default ComponentName;`을 명시합니다.
3. **파일 구조**: `src/components/` 산하의 적절한 도메인 폴더(예: `dashboard`, `layout`, `chat`)에 배치합니다.
4. **가독성과 분리**: 100~150줄이 넘어가는 복잡한 컴포넌트는 반드시 작은 하위 컴포넌트로 분리하세요.

## 차트 및 데이터 안전성 (Safety & Charts)
- 새로운 차트(PieChart, BarChart 등)를 추가할 때는 반드시 `ResponsiveContainer`로 감싸서 브라우저 리사이징 시 반응형 레이아웃이 깨지지 않게 적용하세요.
- 데이터 `prop`은 구조 분해 할당 단계에서 기본값(`data = []`)을 주입하여, 빈 배열이 들어오거나 로딩 지연이 발생해도 에러(화면 멈춤/흰 창)가 나지 않게(Fail-safe) 처리하세요.
