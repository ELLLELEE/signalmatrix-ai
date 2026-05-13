# Skills.md — Alpha Signal Dashboard v3

## ML 기반 범용 투자 데이터 분석 시스템

> 이 시스템은 Skills.md에 정의된 규칙을 기반으로 데이터 분석 파이프라인과 UI 구성이 자동화되도록 설계되었다.
> 즉, 개발자는 개별 로직을 직접 구현하는 대신 Skills.md 규칙을 코드로 변환하여 시스템을 구성한다.
> CSV 한 장이 들어오는 순간, Skills.md 규칙이 파싱 → 분석 → UI 결정까지 전부 처리한다.

---

### 🎯 Alpha Score 중심 판단 계층

이 대시보드의 모든 요소는 **Alpha Score라는 하나의 결론**을 향해 수렴한다.
나머지 구성요소는 점수를 설명하거나, 보정하거나, 검증하는 하위 역할이다.

```
Alpha Score  ← 최종 결론. 이 숫자가 "사야 하냐 말아야 하냐"를 답한다.
    │
    ├── 레짐 (Regime)     ← 시장 배경. 점수의 신뢰도를 결정하는 맥락
    ├── 피처 (Features)   ← 점수의 근거. "왜 이 점수인가"를 설명
    ├── 신호 검증          ← 점수의 신뢰도. 각 피처가 실제로 유효한가
    ├── 신호 충돌          ← 점수의 보정. 상충 신호가 있으면 강등
    ├── 리스크             ← 실행 조건. 점수가 높아도 손절/진입 기준 필요
    ├── 백테스트           ← 보조 근거. 과거에 이 점수가 유효했는가
    └── 시뮬레이터         ← 탐색 기능. "만약에?" 가설 검증
```

> **규칙:** Alpha Score가 없으면 레짐도, 리스크도, 인사이트도 표시하지 않는다.
> 모든 요소는 Alpha Score를 중심으로 종속 관계를 유지한다.

---

> **핵심 철학 — 3탭, 3가지 질문:**
> Tab 1 — "지금 이 종목, 사야 해?" → Alpha Score + 최종 판단
> Tab 2 — "왜 그 점수야? 근거가 뭐야?" → 피처 기여도 + 신호 검증 + 백테스트
> Tab 3 — "만약에 이렇게 되면 점수가 어떻게 바뀌어?" → What-if 시뮬레이터
>
> **모든 분석은 Skills.md 규칙에 의해 자동 생성된다.**
> 사람이 코드를 작성하는 것이 아니라, Skills.md 규칙이 코드를 생성한다.

---

## 목차

**[Part 0 — 판단 엔진]** ← NEW
0. 최종 판단 출력 명세
0-A. 판단 엔진 블록 — 우선순위 기반 순차 보정
0-B. 최종 출력 포맷

**[Part 1 — 데이터 처리 기준]**
1. 지원 데이터 형식 및 입력 방법
1-Z. "어떤 CSV든 가능"의 범위와 한계
2. 컬럼 자동 인식 — 3단계 정규화
3. 데이터 유형 자동 감지 — 신뢰도 기반 분류
4. 결측치·이상치·품질 진단
5. 데이터 부족 시 단계별 폴백 규칙
6. 전처리 후 파이프라인 진입 조건

**[Part 2 — 분석 엔진]**
7. 피처 엔지니어링 — 6개 신호
8. ML — K-Means 시장 레짐 판단
9. ML — Ridge 회귀 Alpha Score
10. 신호 검증 — Rolling 상관계수
11. 리스크 관리 — ATR + Kelly Criterion
12. 백테스트 — Walk-forward
13. 신호 충돌 감지

**[Part 3 — 3탭 대시보드 설계]**
13-B. UI 자동 생성 규칙 (데이터 조건 → UI 컴포넌트 매핑)
13-B-V. UI 자동 생성 검증 흐름 ← NEW
14. Tab 1 — 시장 분석 ("지금 사야 해?")
15. Tab 2 — 신호 분석 ("왜 이 점수야?")
16. Tab 3 — 시뮬레이터 ("만약에?")
17. 탭 간 데이터 흐름 및 공유 상태
18. 인사이트 생성 규칙
19. MA 추세 + TP 신호 시스템
20. What-if 시뮬레이터 민감도 설계
21. 비교 분석 모드

---

# Part 0 — 판단 엔진

> 💡 **이 규칙은 Skills.md의 핵심 역할이다**
> 여러 신호가 동시에 충돌할 때 최종 판단이 흔들리지 않도록,
> Skills.md는 아래 4단계 우선순위 규칙을 자동으로 적용한다.
> **판단 엔진은 모든 분석의 마지막 관문이다.**

※ 이 판단 엔진은 단순 점수 기반이 아니라, "데이터 품질 → 시장 환경 → 신호 충돌"을 반영하는 최종 의사결정 로직이며, 본 시스템의 핵심 차별 요소이다.

---

## 0-A. 판단 엔진 블록 — 우선순위 기반 순차 보정

```
[판단 우선순위 — 이 순서대로 순차 적용]

1순위: 데이터 품질 (최우선)
   └─ 품질점수 < 40  → 전체 판단 블록: "분석 제한 — 데이터 보강 필요"
                        Alpha Score 표시하되 신뢰 불가 경고 오버레이
   └─ 품질점수 40~59 → 최종 판단에 "⚠️ 낮은 신뢰도" 배지 추가
   └─ 품질점수 60+   → 정상 판단 진행

2순위: Alpha Score (기본 판단)
   └─ 80+ → "Strong Buy"
   └─ 60+ → "Buy"
   └─ 40+ → "Neutral"
   └─ 20+ → "Caution"
   └─  0+ → "Avoid"
   → 이것이 "기본 판단"이다. 아직 최종 판단이 아니다.

3순위: Regime 보정 (시장 배경 반영)
   └─ 기본 판단이 "Buy" 이상이고 현재 레짐이 약세(0)
       → 판단을 한 단계 강등: "Buy" → "Neutral"
       → 보정 사유에 "약세 레짐 감지" 기록
   └─ 기본 판단이 "Neutral" 이하이고 레짐이 강세(2)
       → 판단을 한 단계 상향 고려 (단, 품질 70+ 조건)
       → 상향 시 "강세 레짐 보정" 기록

4순위: Conflict 보정 (리스크 조정)
   └─ HIGH 충돌 1건+  → 판단을 한 단계 추가 강등
       → 보정 사유에 충돌 유형과 내용 기록
   └─ MEDIUM 충돌 2건+ → 동일하게 한 단계 강등
   └─ LOW 충돌만 있음 → 강등 없음, 경고 배지만 추가
```

**규칙: 강등은 누적 가능하다.**
레짐 보정으로 1단계, 충돌 보정으로 1단계 → 총 2단계 강등.
단, "Avoid" 이하로는 강등하지 않는다.

**규칙: 상향은 단 1단계만 가능하다.**
어떤 조건이 충족되더라도 Alpha Score 기본 판단보다 2단계 이상 올리지 않는다.

---

## 0-B. 최종 판단 출력 포맷

> 이 포맷이 Tab 1 판단 패널에 표시되는 전부다.
> **Skills.md 판단 엔진이 자동으로 이 텍스트를 생성한다.**

```
┌─────────────────────────────────────────────┐
│  최종 판단:  Neutral                        │  ← 4단계 보정 후 확정값
│  Alpha Score: 68점                          │  ← computeAlphaScore() 마지막 유효값
│  기본 판단:  Buy                            │  ← Alpha Score만 기준
│                                             │
│  보정 사유:                                 │
│  - 현재 약세 레짐 → Buy → Neutral 하향      │  ← 3순위 레짐 보정
│  - RSI 과매수 충돌 감지 (TYPE-3, HIGH)      │  ← 4순위 충돌 보정 (이미 Neutral이라 유지)
│  - 데이터 품질 72점 — 신뢰도 보통           │  ← 1순위 품질 메시지
│                                             │
│  권장 해석:                                 │
│  지금은 즉시 매수보다 관망 또는 분할 진입이  │
│  적절합니다. 레짐 전환 확인 후 재진입 고려.  │
│                                             │
│  ※ 과거 성과가 미래 수익을 보장하지 않습니다. │
└─────────────────────────────────────────────┘
```

**출력 필드 명세:**

| 필드 | 내용 | 생성 규칙 |
|---|---|---|
| 최종 판단 | 4순위 보정 후 확정 액션 | 판단 엔진 0-A 적용 결과 |
| Alpha Score | 0~100 점수 | `computeAlphaScore().scores` 마지막 유효값 |
| 기본 판단 | Score 기준 원래 판단 | 2순위 Alpha Score 변환 |
| 보정 사유 | 적용된 보정 이유 목록 | 3·4순위 보정 시 자동 기록 |
| 권장 해석 | 1~2문장 행동 가이드 | 최종 판단 + 레짐 조합으로 자동 생성 |

---

## 0-C. 판단 추론 로그 (Reasoning Trace)

> 🔑 시스템은 최종 액션(Buy / Neutral / Avoid)을 단순 출력하지 않는다.
> 어떤 신호와 보정 규칙이 현재 판단에 영향을 주었는지 추론 과정을 함께 기록한다.
>
> 판단 추론 로그는 다음 항목을 순서대로 요약하여 사용자에게 설명한다.
>
> - Alpha Score 계산 결과
> - 레짐 보정
> - 충돌 감지 결과
> - 데이터 품질 보정
> - Lite 모델 여부
>
> 예시:
>
> ```text
> [판단 추론 로그]
>
> 1. Alpha Score 72 → 기본 액션 Buy
> 2. Bull Regime 감지 → 유지
> 3. RSI 과매수 충돌 감지 → 1단계 강등
> 4. 데이터 품질 MEDIUM → 신뢰도 보정
>
> 최종 액션: Neutral
> ```
>
> Lite Alpha Score 사용 시:
>
> ```text
> [판단 추론 로그]
>
> 1. 정식 Ridge 계산 불가
> 2. Lite Alpha Score 58 적용
> 3. 거래량 데이터 없음
> 4. 단기 변동성 높음 → 신뢰도 LOW
>
> 최종 액션: Neutral
> ```
>
> 추론 로그는 다음 위치에 공통 사용된다.
>
> - Alpha Score 카드 하단
> - 상세 분석 탭
> - 리포트 export
>
> 시스템 규칙:
>
> ```text
> 시스템은 결과만 출력하지 않는다.
> 사용자가 현재 판단의 생성 과정을 이해할 수 있어야 한다.
> ```

**권장 해석 자동 생성 규칙:**

```python
INTERPRETATION_MAP = {
    ("Strong Buy", 2): "강세 레짐 확인. 즉시 진입 또는 적극 매수 고려.",
    ("Strong Buy", 1): "모멘텀 강함. 추세 지속 여부 확인 후 진입.",
    ("Strong Buy", 0): "점수는 높으나 약세 장. 소량 분할 진입 후 관망.",
    ("Buy",        2): "긍정적 신호. 손절선 설정 후 진입 고려.",
    ("Buy",        1): "중립 장세에서 매수 신호. 분할 진입 적절.",
    ("Buy",        0): "약세 레짐 주의. 레짐 전환 확인 후 진입 권고.",
    ("Neutral",    2): "강세장이나 점수 중립. 관망 또는 소량 진입.",
    ("Neutral",    1): "뚜렷한 방향 없음. 관망이 적절.",
    ("Neutral",    0): "약세 레짐 + 중립 점수. 현금 보유 권고.",
    ("Caution",    2): "강세장이나 신호 약함. 진입 시 소량 분할.",
    ("Caution",    1): "신호 불명확. 추가 확인 후 판단 권고.",
    ("Caution",    0): "약세 레짐 + 부정적 신호. 진입 비권고.",
    ("Avoid",      2): "점수 매우 낮음. 강세장이라도 신중.",
    ("Avoid",      1): "진입 비권고. 데이터 재확인 권고.",
    ("Avoid",      0): "강한 매도 신호. 보유 포지션 정리 고려.",
}
```

---

# Part 1 — 데이터 처리 기준

> 💡 **이 규칙은 Skills.md의 핵심 역할이다**
> CSV 파일 하나가 업로드되는 순간, 아래 5단계 파이프라인이 **Skills.md 규칙에 의해 자동으로 실행**된다.
> 사용자는 컬럼명을 지정하거나 데이터 형식을 고를 필요가 없다.

어떤 CSV가 들어와도 분석이 가능하도록 입력 → 정규화 → 유형 감지 → 품질 평가 → 폴백 결정의 5단계를 거친다. 각 단계는 독립적으로 실패할 수 있으며, 실패 시 다음 단계로 넘어가기 전에 대체 경로를 먼저 시도한다.

---

## 1. 지원 데이터 형식 및 입력 방법

### 1-1. 지원 파일 형식

```
CSV (.csv)  : 구분자 자동 감지 (쉼표·탭·세미콜론·파이프)
              인코딩 자동 감지: UTF-8 → EUC-KR → CP949 순 시도
XLSX (.xlsx): 첫 번째 시트 자동 선택, 헤더 행 자동 탐지
JSON (.json): 배열 형태 [{...}, {...}] 또는 {"data": [...]} 지원
종목코드    : yfinance API 직접 호출 (예: "005930.KS", "AAPL")
```

### 1-2. CSV 구분자 자동 감지

단순히 쉼표만 지원하면 한국 증권사 데이터(탭 구분)나 유럽 데이터(세미콜론 구분)를 처리하지 못한다. 아래 순서로 구분자를 자동으로 탐지한다.

```python
import csv, chardet, io

def detect_delimiter(text: str) -> str:
    """
    첫 5행을 분석해 가장 일관된 구분자를 반환한다.
    일관성 기준: 각 행에서 후보 구분자의 등장 횟수가 동일한 것.
    """
    candidates = [',', '\t', ';', '|']
    sample     = '\n'.join(text.splitlines()[:5])
    counts     = {}
    for delim in candidates:
        per_line = [line.count(delim) for line in sample.splitlines() if line.strip()]
        if per_line and len(set(per_line)) == 1 and per_line[0] > 0:
            counts[delim] = per_line[0]
    if not counts:
        return ','
    return max(counts, key=counts.get)

def detect_encoding(raw_bytes: bytes) -> str:
    """
    chardet으로 인코딩 감지 후 신뢰도 0.7 미만이면
    UTF-8 → EUC-KR → CP949 순으로 강제 시도.
    """
    result = chardet.detect(raw_bytes)
    if result['confidence'] >= 0.7:
        return result['encoding']
    for enc in ['utf-8', 'euc-kr', 'cp949']:
        try:
            raw_bytes.decode(enc)
            return enc
        except UnicodeDecodeError:
            continue
    return 'utf-8'

def parse_csv(raw_bytes: bytes) -> pd.DataFrame:
    """
    인코딩·구분자를 자동 감지해 DataFrame으로 파싱한다.
    헤더가 없는 파일은 첫 행이 숫자인지 확인 후 자동으로 헤더 없음 처리.
    """
    enc  = detect_encoding(raw_bytes)
    text = raw_bytes.decode(enc, errors='replace')
    delim= detect_delimiter(text)

    df = pd.read_csv(io.StringIO(text), sep=delim, thousands=',',
                     engine='python', on_bad_lines='skip')

    # 헤더 없는 파일 감지: 첫 행 컬럼명이 전부 숫자이면 헤더 없음으로 재파싱
    if all(str(c).replace('.','').isdigit() for c in df.columns):
        df = pd.read_csv(io.StringIO(text), sep=delim, header=None,
                         thousands=',', engine='python', on_bad_lines='skip')
        df.columns = [f'col_{i}' for i in range(len(df.columns))]

    return df
```

### 1-3. 날짜 컬럼 자동 파싱

날짜 형식은 데이터 출처마다 다르다. 한국 증권사: `2024.01.15`, 미국: `01/15/2024`, ISO: `2024-01-15`, 타임스탬프: `1705276800`. 아래 함수가 순서대로 시도한다.

```python
DATE_FORMATS = [
    '%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d',
    '%d-%m-%Y', '%d/%m/%Y', '%d.%m.%Y',
    '%m-%d-%Y', '%m/%d/%Y', '%m.%d.%Y',
    '%Y%m%d',   '%Y-%m-%d %H:%M:%S',
    '%Y/%m/%d %H:%M:%S',
]

def parse_date_column(series: pd.Series) -> pd.Series:
    """
    다양한 날짜 형식을 자동으로 파싱한다.
    숫자형 타임스탬프는 자릿수로 초/밀리초 구분 후 변환.
    모든 시도 실패 시 원본 반환 + 경고 로그.
    """
    # 타임스탬프 (숫자)
    if pd.api.types.is_numeric_dtype(series):
        s = series.dropna().iloc[0] if not series.dropna().empty else 0
        unit = 'ms' if s > 1e12 else 's'
        try:
            return pd.to_datetime(series, unit=unit)
        except Exception:
            pass

    # 문자열 날짜
    for fmt in DATE_FORMATS:
        try:
            parsed = pd.to_datetime(series, format=fmt, errors='raise')
            if parsed.notna().sum() / len(series) > 0.8:
                return parsed
        except Exception:
            continue

    # pandas 자동 감지 (마지막 시도)
    try:
        return pd.to_datetime(series, infer_datetime_format=True, errors='coerce')
    except Exception:
        print(f"[경고] 날짜 파싱 실패: {series.name}")
        return series

def set_date_index(df: pd.DataFrame) -> pd.DataFrame:
    """
    날짜 컬럼을 찾아 인덱스로 설정한다.
    후보: 'date' 정규화된 컬럼 → 'datetime' 포함 컬럼 → 첫 번째 object 컬럼.
    인덱스 설정 후 오름차순 정렬 (과거 → 최근 순서 보장).
    """
    date_col = None
    if 'date' in df.columns:
        date_col = 'date'
    else:
        for col in df.columns:
            if 'date' in str(col).lower() or 'time' in str(col).lower():
                date_col = col
                break
    if date_col is None:
        for col in df.columns:
            if df[col].dtype == 'object':
                sample = df[col].dropna().head(5)
                if sample.apply(lambda x: bool(pd.to_datetime(x, errors='coerce'))).all():
                    date_col = col
                    break

    if date_col:
        df[date_col] = parse_date_column(df[date_col])
        df = df.set_index(date_col).sort_index()

    return df
```

### 1-4. 숫자 컬럼 정제

한국 데이터는 1,000 단위 쉼표, 단위 접미사(억원, 천주)를 포함하는 경우가 많다.

```python
UNIT_MAP = {
    '억': 1e8, '억원': 1e8,
    '천': 1e3, '천원': 1e3, '천주': 1e3,
    '만': 1e4, '만원': 1e4, '만주': 1e4,
    'k': 1e3, 'm': 1e6, 'b': 1e9,
}

def clean_numeric(series: pd.Series) -> pd.Series:
    """
    쉼표·단위 접미사·퍼센트 기호를 제거하고 float으로 변환한다.
    '-'만 있는 값(결측 표시)은 NaN으로 처리.
    """
    s = series.astype(str).str.strip()
    s = s.replace({'—': None, '-': None, 'N/A': None, 'n/a': None, '': None})
    mult = pd.Series(1.0, index=s.index)
    for suffix, factor in UNIT_MAP.items():
        mask = s.str.lower().str.endswith(suffix, na=False)
        if mask.any():
            s[mask] = s[mask].str[:-len(suffix)]
            mult[mask] = factor
    pct_mask = s.str.endswith('%', na=False)
    if pct_mask.any():
        s[pct_mask] = s[pct_mask].str[:-1]
        mult[pct_mask] = 0.01
    s = s.str.replace(',', '', regex=False)
    return pd.to_numeric(s, errors='coerce') * mult
```

---

## 1-5. 엣지케이스 전처리 — 실제 데이터에서 자주 발생하는 10가지 예외 처리

> 🔑 **이 규칙은 Skills.md의 핵심 안정성 장치다**
> `parse_csv` → `normalize_columns` → `handle_missing` 파이프라인은 정형 데이터를 전제한다.
> 하지만 실제 증권사·Bloomberg·Yahoo 데이터는 아래 10가지 예외 패턴을 포함한다.
> `sanitize_dataframe()`은 파이프라인 진입 직전에 이 모든 예외를 한 번에 걸러낸다.

```python
import numpy as np
import pandas as pd

# ─────────────────────────────────────────────
# 문자열 NaN 표현 전체 목록 (clean_numeric 보완)
# ─────────────────────────────────────────────
NULL_STRINGS = {
    "nan", "null", "none", "na", "n/a", "n.a.", "#n/a", "#na",
    "-", "--", "---", "?", ".", " ", "",
    "결측", "누락", "없음", "해당없음",
}

def sanitize_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    파이프라인 진입 직전 10가지 엣지케이스를 순서대로 처리한다.

    처리 순서:
      1. 멀티 헤더 / 병합 셀 감지 → 단일 헤더로 평탄화
      2. 단일 행 / 단일 컬럼 guard → 조기 종료
      3. 전체가 문자열 NaN인 컬럼 → 즉시 제거
      4. 상수 컬럼 (unique=1) → 분석 불가 컬럼 제거
      5. 중복 날짜 행 → 집계(mean) 후 중복 제거
      6. timezone 혼재 → UTC 통일 후 tz-naive 변환
      7. 장기 gap (30일+ 연속 NaN) → ffill 차단, 경고만
      8. int32 오버플로우 위험 컬럼 → int64 / float64 캐스팅
      9. XLSX 멀티 시트 / 메타데이터 시트 → 올바른 데이터 시트 선택
     10. 중첩 JSON 구조 → 재귀 평탄화

    반환:
      (처리된 DataFrame, 처리 로그 dict)
    """
    log = {"steps": [], "warnings": [], "dropped_cols": [], "rows_before": len(df)}
    df = df.copy()

    # ── 1. 멀티 헤더 감지 및 평탄화 ──────────────────────────────────
    # 증권사 엑셀은 컬럼명이 "Unnamed: 0", "Unnamed: 1" 등으로 들어오거나
    # 첫 1~2행이 헤더 설명 텍스트인 경우가 많다.
    if isinstance(df.columns, pd.MultiIndex):
        # 멀티인덱스 → 레벨 조합으로 단일 문자열 컬럼명 생성
        df.columns = [
            "_".join(str(c) for c in col if str(c) != "Unnamed").strip("_")
            for col in df.columns
        ]
        log["steps"].append("멀티 헤더 평탄화 적용")

    # 첫 행이 숫자 0개 + 문자열 다수 → 헤더 행일 가능성
    if len(df) > 1:
        first_row_str_ratio = df.iloc[0].apply(
            lambda x: isinstance(x, str) and not _is_numeric_str(x)
        ).mean()
        if first_row_str_ratio > 0.7:
            # 첫 행을 헤더로 승격
            df.columns = df.iloc[0].astype(str).tolist()
            df = df.iloc[1:].reset_index(drop=True)
            log["steps"].append("첫 행이 헤더로 감지 → 승격 처리")

    # ── 2. 단일 행 / 단일 컬럼 guard ────────────────────────────────
    if len(df) < 2:
        log["warnings"].append("CRITICAL: 행이 1개 이하 — 분석 불가")
        return df, log
    if len(df.columns) < 1:
        log["warnings"].append("CRITICAL: 컬럼이 없음 — 분석 불가")
        return df, log

    # ── 3. 전체 문자열 NaN 컬럼 제거 ────────────────────────────────
    # clean_numeric의 NULL_STRINGS 외에도 "nan", "null" 등 다양한 표현 처리
    cols_to_drop = []
    for col in df.columns:
        str_vals = df[col].astype(str).str.strip().str.lower()
        null_ratio = str_vals.isin(NULL_STRINGS).mean()
        if null_ratio >= 1.0:
            cols_to_drop.append(col)
    if cols_to_drop:
        df = df.drop(columns=cols_to_drop)
        log["dropped_cols"].extend(cols_to_drop)
        log["steps"].append(f"전체 NaN 컬럼 제거: {cols_to_drop}")

    # clean_numeric 확장: 다양한 null 표현 → NaN 통일
    for col in df.select_dtypes(include="object").columns:
        mask = df[col].astype(str).str.strip().str.lower().isin(NULL_STRINGS)
        df.loc[mask, col] = np.nan

    # ── 4. 상수 컬럼 제거 (unique=1, 분산=0) ────────────────────────
    # 피처 계산 시 division by zero / NaN 폭발 방지
    const_cols = []
    for col in df.columns:
        try:
            numeric = pd.to_numeric(df[col], errors="coerce")
            if numeric.dropna().nunique() <= 1:
                const_cols.append(col)
        except Exception:
            pass
    if const_cols:
        df = df.drop(columns=const_cols)
        log["dropped_cols"].extend(const_cols)
        log["steps"].append(f"상수 컬럼 제거: {const_cols}")

    # ── 5. 중복 날짜 행 처리 ────────────────────────────────────────
    # 동일 날짜 행이 여러 개일 때 숫자 컬럼은 mean, 나머지는 first
    if isinstance(df.index, pd.DatetimeIndex) and df.index.duplicated().any():
        dup_count = int(df.index.duplicated().sum())
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        other_cols   = [c for c in df.columns if c not in numeric_cols]
        agg_dict = {c: "mean" for c in numeric_cols}
        agg_dict.update({c: "first" for c in other_cols})
        df = df.groupby(df.index).agg(agg_dict)
        log["steps"].append(f"중복 날짜 {dup_count}건 → mean 집계로 병합")
        log["warnings"].append(f"중복 날짜 감지: {dup_count}행 병합됨")
    elif "date" in df.columns and df["date"].duplicated().any():
        dup_count = int(df["date"].duplicated().sum())
        df = df.groupby("date").first().reset_index()
        log["steps"].append(f"중복 date 컬럼 {dup_count}건 → first로 병합")

    # ── 6. timezone 혼재 처리 ──────────────────────────────────────
    # UTC/KST 혼재 → UTC 통일 → tz-naive 변환 (pandas 인덱스 충돌 방지)
    if isinstance(df.index, pd.DatetimeIndex):
        if df.index.tz is not None:
            df.index = df.index.tz_convert("UTC").tz_localize(None)
            log["steps"].append("timezone → UTC 통일 후 tz-naive 변환")
    for col in df.columns:
        if pd.api.types.is_datetime64tz_dtype(df[col]):
            df[col] = df[col].dt.tz_convert("UTC").dt.tz_localize(None)

    # ── 7. 장기 gap 감지 (연속 NaN 30일+) ─────────────────────────
    # ffill이 30일 이상 전파되면 데이터를 꾸며내는 것과 같으므로 경고만 남긴다
    if "close" in df.columns:
        close_null = df["close"].isnull()
        max_consec = _max_consecutive_true(close_null)
        if max_consec >= 30:
            log["warnings"].append(
                f"⚠️ close 컬럼에 연속 {max_consec}일 결측 구간 존재 — "
                "ffill 미적용, 해당 구간 NaN 유지"
            )
            # 30일 이상 gap은 ffill 차단 (handle_missing의 ffill limit 재정의)
            df["_close_long_gap"] = _mark_long_gap(close_null, threshold=30)

    # ── 8. 정수 오버플로우 방지 ────────────────────────────────────
    # int32 컬럼(거래량 등)이 2^31 근처 값을 가지면 연산 중 overflow 발생
    for col in df.select_dtypes(include=["int32", "int16", "int8"]).columns:
        df[col] = df[col].astype("int64")
        log["steps"].append(f"{col}: int→int64 업캐스팅")
    for col in df.select_dtypes(include=["float32"]).columns:
        df[col] = df[col].astype("float64")

    # ── 9. XLSX 메타데이터 시트 건너뛰기 ──────────────────────────
    # parse_csv 단계에서 이미 처리되지만, 첫 몇 행이 메타 정보인 경우를 재확인
    # "날짜", "일자" 같은 값이 있는 행을 헤더로 재지정
    if len(df) > 3:
        for check_row in range(min(5, len(df))):
            row_vals = df.iloc[check_row].astype(str).str.lower()
            date_hit  = row_vals.str.contains("날짜|일자|date|time", regex=True).any()
            price_hit = row_vals.str.contains("종가|close|price", regex=True).any()
            if date_hit and price_hit:
                df.columns = df.iloc[check_row].astype(str).tolist()
                df = df.iloc[check_row + 1:].reset_index(drop=True)
                log["steps"].append(f"행 {check_row}을 헤더로 재지정 (메타 행 건너뜀)")
                break

    # ── 10. 중첩 JSON 평탄화 ──────────────────────────────────────
    # 컬럼 값이 dict/list인 경우 (JSON 파싱 후 중첩 구조)
    for col in df.columns:
        if df[col].apply(lambda x: isinstance(x, (dict, list))).any():
            try:
                expanded = pd.json_normalize(df[col].dropna().tolist())
                if not expanded.empty:
                    expanded.index = df[col].dropna().index
                    df = df.drop(columns=[col]).join(expanded, how="left")
                    log["steps"].append(f"{col}: 중첩 JSON 평탄화")
            except Exception as e:
                log["warnings"].append(f"{col}: JSON 평탄화 실패 — {e}")

    log["rows_after"] = len(df)
    return df, log


# ── 내부 헬퍼 함수 ────────────────────────────────────────────────

def _is_numeric_str(s: str) -> bool:
    """문자열이 숫자로 변환 가능한지 확인한다."""
    try:
        float(s.replace(",", "").replace("%", ""))
        return True
    except ValueError:
        return False

def _max_consecutive_true(series: pd.Series) -> int:
    """Boolean 시리즈에서 연속 True의 최대 길이를 반환한다."""
    max_run, cur = 0, 0
    for val in series:
        if val:
            cur += 1
            max_run = max(max_run, cur)
        else:
            cur = 0
    return max_run

def _mark_long_gap(null_mask: pd.Series, threshold: int = 30) -> pd.Series:
    """threshold 이상 연속된 NaN 구간을 True로 마킹한다."""
    result = pd.Series(False, index=null_mask.index)
    run_start, cur = None, 0
    for i, val in enumerate(null_mask):
        if val:
            if cur == 0:
                run_start = i
            cur += 1
        else:
            if cur >= threshold:
                result.iloc[run_start:i] = True
            cur = 0
    if cur >= threshold:
        result.iloc[run_start:] = True
    return result
```

이 함수는 `parse_csv()` 직후, `normalize_columns()` 직전에 반드시 호출한다.

```python
# 파이프라인 진입 순서 (handle_missing 업데이트 포함)
raw_df, _ = parse_csv(raw_bytes)           # Step 1: 파싱
df, san_log = sanitize_dataframe(raw_df)   # Step 2: 엣지케이스 정제  ← NEW
df, col_map = normalize_columns(df)        # Step 3: 컬럼 정규화
df, miss_log = handle_missing(             # Step 4: 결측치 처리
    df,
    long_gap_col=san_log.get("_close_long_gap")  # 장기 gap은 ffill 제외
)
```

`handle_missing()`도 장기 gap 컬럼을 인식하도록 한 줄 추가한다.

```python
def handle_missing(df: pd.DataFrame,
                   long_gap_col: pd.Series | None = None) -> tuple[pd.DataFrame, dict]:
    # ... (기존 코드 동일) ...

    # 장기 gap 구간은 ffill 적용 제외 (30일+ 연속 결측은 NaN 유지)
    if long_gap_col is not None and "close" in df.columns:
        # gap 구간을 ffill로 채운 뒤 원래 NaN으로 복원
        df.loc[long_gap_col == True, "close"] = np.nan
        log["long_gap_preserved"] = int((long_gap_col == True).sum())

    # _close_long_gap 헬퍼 컬럼은 파이프라인에 노출하지 않음
    if "_close_long_gap" in df.columns:
        df = df.drop(columns=["_close_long_gap"])

    return df, log
```

### 1-5-A. 엣지케이스별 처리 결과 매핑

| 엣지케이스 | 감지 방법 | 처리 | UI 표시 |
|---|---|---|---|
| 멀티 헤더 (병합 셀) | `MultiIndex` 또는 첫 행 문자열 비율 >0.7 | 레벨 결합 → 단일 헤더 | "⚠️ 헤더 자동 평탄화" |
| 단일 행/컬럼 | `len(df) < 2` | 파이프라인 즉시 중단 | "데이터 부족 — 최소 2행 필요" |
| 전체 NaN 컬럼 | null 비율 100% | 컬럼 제거 | dropped_cols 목록 표시 |
| 상수 컬럼 | `nunique() <= 1` | 컬럼 제거 | "XX 컬럼 제거 — 값이 단일" |
| 중복 날짜 | `index.duplicated()` | 숫자 mean, 나머지 first | "중복 N건 병합됨" |
| timezone 혼재 | `index.tz is not None` | UTC → tz-naive | 로그만, UI 표시 없음 |
| 장기 gap (30일+) | 연속 NaN ≥ 30 | ffill 차단, NaN 유지 | "⚠️ N일 연속 결측 구간" |
| int32 오버플로우 | dtype int32/16/8 | int64 업캐스팅 | 로그만 |
| XLSX 메타 시트 행 | 날짜·가격 키워드 탐지 | 해당 행 → 헤더 승격 | "메타 행 N건 건너뜀" |
| 중첩 JSON | 컬럼 값이 dict/list | `json_normalize` 평탄화 | "중첩 JSON 평탄화" |

### 1-5-B. sanitize_dataframe 품질 감점 규칙

`sanitize_dataframe()`이 감지한 예외는 품질 점수(`quality_score()`)에 자동 반영된다.

```python
SANITIZE_PENALTY = {
    "멀티 헤더 평탄화":     5,   # 헤더 구조 불명확
    "상수 컬럼 제거":        3,   # 컬럼당 -3점
    "중복 날짜 병합":        8,   # 데이터 신뢰성 저하
    "장기 gap 30일+":       12,  # 연속 결측 구간
    "int32 업캐스팅":        0,   # 기술적 문제, 감점 없음
    "중첩 JSON 평탄화":      5,   # 구조 불명확
}
# quality_score() 호출 시 san_log를 함께 전달해 총 감점 합산
```

---

## 1-Z. "어떤 CSV든 가능"의 범위와 한계

> 이 규칙은 Skills.md의 핵심 역할이다 — 자동화의 범위를 정직하게 명시한다.
> "어떤 CSV든"이라는 말은 무한한 가능성이 아니라, **아래 조건 안에서의 자동 대응**을 의미한다.

### ✅ 자동 처리 가능한 경우

| 상황 | 처리 방식 |
|---|---|
| 컬럼명이 영어/한국어 혼재 | 3단계 정규화로 자동 매핑 |
| 구분자가 탭·세미콜론·파이프 | `detect_delimiter()`로 자동 감지 |
| 인코딩이 EUC-KR / CP949 | `detect_encoding()`으로 자동 감지 |
| 날짜 형식이 `2024.01.15` / `01/15/2024` 등 | `DATE_FORMATS` 순차 시도 |
| 단위 접미사 `억원`, `천주` 포함 | `clean_numeric()`으로 제거 후 변환 |
| 컬럼명이 `col_0`, `A` 같은 무의미한 이름 | 값 분포 패턴으로 의미 추론 (3단계) |
| 결측치가 20% 미만 | ffill / 선형보간으로 자동 처리 |
| OHLC 없이 종가만 있음 | 라인차트 + 2σ 손절로 자동 대체 |
| volume / foreign 없음 | 해당 피처 = 0.5 중립 고정 |
| 데이터가 14일 미만 | 차트만 표시 + "분석 제한" 안내 |
| Ridge R² 전체 음수 | 피처 가중 합산으로 폴백 |
| 멀티 헤더 / 병합 셀 (증권사 엑셀) | `sanitize_dataframe()` 평탄화 |
| 상수 컬럼 (값이 모두 동일) | 자동 제거 후 경고 |
| 중복 날짜 행 | 숫자 컬럼 mean 집계 후 병합 |
| timezone 혼재 (UTC vs KST) | UTC 통일 → tz-naive 변환 |
| 연속 NaN 30일 미만 gap | ffill로 채움 |
| int32 오버플로우 위험 컬럼 | int64 자동 업캐스팅 |
| XLSX 메타데이터 행 포함 | 키워드 탐지 후 헤더 재지정 |
| 중첩 JSON 구조 | `json_normalize()` 재귀 평탄화 |
| `"nan"`, `"null"`, `"-"` 등 문자열 NaN 변형 | NULL_STRINGS 목록으로 일괄 → NaN 변환 |

### ❌ 자동 처리 불가 — 분석 중단 또는 수동 확인 필요

| 상황 | 결과 | 사용자 안내 |
|---|---|---|
| 종가(close) 추론 완전 실패 | 강제 복구 시도 후 실패하면 최소 분석 불가 | "가격 후보 컬럼을 찾을 수 없습니다" |
| 날짜 컬럼 부재 (시계열 불가) | 시계열 분석 불가, 정적 테이블만 표시 | "날짜 컬럼이 없어 시계열 분석이 제한됩니다" |
| 결측치 20%+ 컬럼 | 해당 컬럼 제거 | "XX 컬럼이 20% 이상 결측으로 제거됩니다" |
| 파일 크기 50MB+ | 파싱 중단 | "파일이 너무 큽니다. 기간을 줄여 재업로드해주세요" |
| 비정형 데이터 (이미지·PDF 임베딩 CSV) | 파싱 실패 | "지원하지 않는 형식입니다" |
| 동일 의미 컬럼이 3개 이상 중복 | 첫 번째만 사용, 나머지 경고 | "중복 컬럼 감지: close_1, close_2는 무시됩니다" |
| 연속 NaN 30일+ gap (close) | ffill 차단, 해당 구간 NaN 유지 | "⚠️ N일 연속 결측 — 해당 구간 신뢰도 낮음" |
| JSON 평탄화 후 컬럼 수 50개+ | 상위 관련도 컬럼만 선택, 나머지 경고 | "JSON 평탄화 결과 컬럼 과다 — 상위 N개만 사용" |

### ⚠️ 처리는 되지만 신뢰도가 낮아지는 경우

| 상황 | 영향 | 표시 방식 |
|---|---|---|
| 30~59일 데이터 | K-Means 신뢰도 낮음 | 레짐 카드에 "⚠️ 짧은 기간, 참고 수준" |
| 14~29일 데이터 | Alpha Score 폴백 적용 | 게이지 색상 → 주황, "폴백 추정값" 배지 |
| 컬럼 신뢰도 0.65 미만 (3단계 추론) | 매핑 오류 가능성 | 헤더에 "⚠️ 컬럼 자동 추론됨" 배지 |
| 이상치 5%+ | 품질점수 급락 → 전반적 신뢰도 저하 | 헤더 배지 🔴 "분석 제한" |

> **요약:**
> Skills.md 자동화는 **"최선을 다해 처리하되, 한계는 사용자에게 명확히 알린다"** 원칙을 따른다.
> 실패를 숨기거나 무리하게 추측하지 않는다. 불확실하면 경고를 보여주고, 불가능하면 멈춘다.

---

## 2. 컬럼 자동 인식 — 3단계 정규화

> 🔑 **이 규칙은 Skills.md의 핵심 역할이다**
> `종가`, `Close`, `adj close`, `종가(원)` — 이름이 달라도 Skills.md의 3단계 정규화가 자동으로 동일한 컬럼으로 인식한다.
> **모든 컬럼 매핑은 Skills.md 규칙에 의해 자동 생성된다.**

입력 CSV의 컬럼명은 데이터 출처마다 제각각이다. 동일한 "종가" 데이터가 `Close`, `종가`, `adj close`, `Adj. Close`, `close_price`, `종가(원)` 등 수십 가지 이름으로 들어온다. 3단계 정규화가 이 문제를 해결한다.

### 2-1. 1단계 — 완전 일치 매핑

```python
EXACT_MAP = {
    # 가격
    "종가": "close", "close": "close", "adj close": "close",
    "adjusted close": "close", "adjusted_close": "close",
    "종가(원)": "close", "close_price": "close", "closing price": "close",
    "시가": "open",  "open": "open",   "opening price": "open",
    "고가": "high",  "high": "high",   "high price": "high",
    "저가": "low",   "low": "low",     "low price": "low",

    # 거래량
    "거래량": "volume", "volume": "volume", "vol": "volume",
    "거래량(주)": "volume", "trading volume": "volume",
    "shares traded": "volume",

    # 날짜
    "date": "date", "날짜": "date", "일자": "date",
    "기준일": "date", "거래일": "date", "trade date": "date",
    "datetime": "date", "time": "date",

    # 수급
    "외국인": "foreign", "외국인합계": "foreign", "foreigner": "foreign",
    "외국인순매수": "foreign", "foreign net": "foreign",
    "기관": "institution", "기관합계": "institution",
    "기관순매수": "institution", "institution net": "institution",
    "개인": "individual", "개인순매수": "individual", "retail": "individual",

    # 가치지표
    "per": "per", "p/e": "per", "p/e ratio": "per", "주가수익비율": "per",
    "pbr": "pbr", "p/b": "pbr", "p/b ratio": "pbr", "주가순자산비율": "pbr",
    "roe": "roe", "eps": "eps", "bps": "bps",
    "ev/ebitda": "ev_ebitda", "psr": "psr",

    # 매크로
    "vix": "vix", "공포지수": "vix", "cboe vix": "vix",
    "금리": "rate", "us10y": "rate", "10yr": "rate", "10y yield": "rate",
    "기준금리": "rate", "treasury": "rate",
    "환율": "fx", "usdkrw": "fx", "달러원": "fx",
    "달러인덱스": "dxy", "dxy": "dxy", "usd index": "dxy",

    # 재무
    "매출": "revenue", "revenue": "revenue", "매출액": "revenue",
    "영업이익": "op_income", "operating income": "op_income",
    "operating profit": "op_income",
    "순이익": "net_income", "net income": "net_income",
    "net profit": "net_income",

    # 포트폴리오
    "종목코드": "ticker", "ticker": "ticker", "symbol": "ticker",
    "종목명": "name",    "name": "name", "stock name": "name",
    "보유수량": "qty",   "quantity": "qty", "shares": "qty",
    "매수가": "buy_price", "purchase price": "buy_price",
    "평균단가": "avg_price", "average price": "avg_price",
    "평가금액": "mkt_value", "market value": "mkt_value",
    "수익률": "return_pct", "return": "return_pct", "profit rate": "return_pct",
}
```

### 2-2. 2단계 — 정규식 부분 일치

1단계에서 매핑되지 않은 컬럼을 정규식으로 추가 처리한다.

```python
import re

PARTIAL_PATTERNS = [
    # 가격 계열
    (r"clos|종가|close",          "close"),
    (r"open|시가|opening",        "open"),
    (r"high|고가|최고",           "high"),
    (r"low|저가|최저",            "low"),
    (r"vol|거래량|volume",        "volume"),
    (r"adj.*clos|수정.*종가",     "close"),  # 수정 종가 우선

    # 수급 계열
    (r"foreign|외국|foreigner|외인", "foreign"),
    (r"instit|기관|institution",     "institution"),
    (r"individ|개인|retail",         "individual"),

    # 가치지표
    (r"p.?e|per\b|price.?earn",   "per"),
    (r"p.?b|pbr\b|price.?book",   "pbr"),
    (r"\broe\b|return.?equit",     "roe"),
    (r"\beps\b|earn.?share",       "eps"),

    # 매크로
    (r"vix|fear|공포",            "vix"),
    (r"rate|yield|금리|이자",     "rate"),
    (r"usd.*krw|달러.*원|환율",   "fx"),
    (r"dxy|dollar.?index|달러인덱스", "dxy"),

    # 재무
    (r"revenue|매출|sales",       "revenue"),
    (r"operat|영업이익|op.?income","op_income"),
    (r"net.*income|순이익|net.*profit","net_income"),

    # 날짜
    (r"date|날짜|일자|time|기준",  "date"),

    # 포트폴리오
    (r"ticker|symbol|종목코드",    "ticker"),
    (r"\bqty\b|quantity|보유|수량","qty"),
    (r"buy.?price|매수가|purchase","buy_price"),
]

def _match_partial(col: str) -> str | None:
    col_lower = col.lower()
    for pattern, std_name in PARTIAL_PATTERNS:
        if re.search(pattern, col_lower):
            return std_name
    return None
```

### 2-3. 3단계 — 값 패턴으로 의미 추론

컬럼명으로 판단이 불가능한 경우, 실제 값의 분포·크기·범위를 보고 의미를 추론한다. 이 단계는 컬럼명이 `col_0`, `A`, `1` 같은 무의미한 이름일 때 특히 유용하다.

```python
def _infer_from_values(series: pd.Series) -> str | None:
    """
    값 분포 패턴으로 컬럼 의미를 추론한다.
    확신도가 낮으면 None을 반환해 사용자 확인을 요청한다.

    추론 기준:
      close  : 양수, 변동성 낮음(CV<0.5), 큰 값(mean>100)
      volume : 양수, 정수 중심, 매우 큰 값(mean>1e6)
      foreign: 음수 포함, 큰 절대값(mean>1e8)
      vix    : 0~80 범위, 평균 15~25 수준
      rate   : 0~20 범위, 소수점 포함, 평균 1~8
      per    : 5~100 범위, 평균 10~30
      pbr    : 0.1~20 범위, 평균 1~5
      roe    : -50~100 범위, 퍼센트 수준
    """
    s = series.dropna()
    if len(s) < 5:
        return None
    if not pd.api.types.is_numeric_dtype(s):
        return None

    mean_v = float(s.mean())
    std_v  = float(s.std())
    min_v  = float(s.min())
    max_v  = float(s.max())
    cv     = std_v / (abs(mean_v) + 1e-10)
    has_neg= min_v < 0
    is_int = (s == s.round()).mean() > 0.95

    # 거래량: 양수 정수, 매우 큰 값
    if not has_neg and is_int and mean_v > 1e6:
        return "volume"

    # 수급(외국인/기관): 음수 포함, 큰 절대값
    if has_neg and abs(mean_v) > 1e7:
        return "foreign"

    # 종가/가격: 양수, 중간~큰 값, 낮은 변동성
    if not has_neg and mean_v > 1000 and cv < 0.5:
        return "close"

    # VIX: 0~80, 평균 10~35
    if not has_neg and 0 <= min_v and max_v <= 80 and 10 <= mean_v <= 35:
        return "vix"

    # 금리: 0~20, 소수점, 평균 1~10
    if not has_neg and 0 <= min_v and max_v <= 20 and 1 <= mean_v <= 10 and not is_int:
        return "rate"

    # PER: 양수, 5~100, 평균 10~30
    if not has_neg and 5 <= min_v and max_v <= 200 and 10 <= mean_v <= 50:
        return "per"

    # PBR: 양수, 0~20, 평균 0.5~5
    if not has_neg and max_v <= 20 and 0.5 <= mean_v <= 5 and not is_int:
        return "pbr"

    # ROE: -50~100 범위, 퍼센트 수준
    if -50 <= min_v and max_v <= 100 and abs(mean_v) <= 30:
        return "roe"

    return None

def normalize_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    3단계 정규화를 순차 적용한다.
    반환값: (정규화된 DataFrame, 매핑 결과 딕셔너리)
    매핑 결과: {원본컬럼명: {std_name, method, confidence}}
    """
    df   = df.copy()
    cols = [str(c).strip().lower().replace(' ','_') for c in df.columns]
    df.columns = cols

    mapping: dict[str, dict] = {}
    new_cols: dict[str, str] = {}

    for col in cols:
        # 1단계: 완전 일치
        if col in EXACT_MAP:
            std = EXACT_MAP[col]
            mapping[col] = {"std_name": std, "method": "exact_match", "confidence": 1.0}

        # 2단계: 정규식 부분 일치
        elif (std := _match_partial(col)):
            mapping[col] = {"std_name": std, "method": "partial_match", "confidence": 0.85}

        # 3단계: 값 패턴 추론
        elif (std := _infer_from_values(df[col])):
            mapping[col] = {"std_name": std, "method": "value_inference", "confidence": 0.65}

        # 실패: 원본 유지 + 수동 확인 필요 플래그
        else:
            mapping[col] = {"std_name": col, "method": "unresolved", "confidence": 0.0}

        new_cols[col] = mapping[col]["std_name"]

    # 중복 컬럼 처리: 같은 std_name으로 매핑된 경우 신뢰도 높은 것 우선, 나머지 뒤에 _2, _3 접미사
    seen: dict[str, int] = {}
    final_cols: dict[str, str] = {}
    for orig, std in new_cols.items():
        if std not in seen:
            seen[std] = 1
            final_cols[orig] = std
        else:
            seen[std] += 1
            final_cols[orig] = f"{std}_{seen[std]}"

    df = df.rename(columns=final_cols)
    return df, mapping
```

### 2-4. 정규화 결과 검증 및 사용자 확인 요청

```python
def validate_normalization(mapping: dict, df: pd.DataFrame) -> dict:
    """
    정규화 결과를 검증하고, 수동 확인이 필요한 항목을 분류한다.

    반환:
      has_close    : 최소 분석 가능 여부
      unresolved   : confidence=0인 컬럼 목록 (사용자 확인 필요)
      low_conf     : confidence<0.7 컬럼 목록 (경고 표시)
      needs_manual : 사용자 수동 선택이 필요한 경우 True
      suggestions  : 미해결 컬럼에 대한 후보 매핑 제안
    """
    has_close  = 'close' in df.columns
    unresolved = [c for c, m in mapping.items() if m['confidence'] == 0.0]
    low_conf   = [c for c, m in mapping.items() if 0 < m['confidence'] < 0.7]

    # 미해결 컬럼에 대해 후보 제안 (값 범위 기반)
    suggestions = {}
    for col in unresolved:
        if col in df.columns:
            s = df[col].dropna()
            if not s.empty and pd.api.types.is_numeric_dtype(s):
                candidates = []
                if s.mean() > 1000 and s.min() > 0:
                    candidates.append("close (가격?)")
                if s.mean() > 1e6 and (s == s.round()).mean() > 0.9:
                    candidates.append("volume (거래량?)")
                if s.min() < 0:
                    candidates.append("foreign (수급?)")
                suggestions[col] = candidates if candidates else ["미분류"]

    return {
        "has_close":    has_close,
        "unresolved":   unresolved,
        "low_conf":     low_conf,
        "needs_manual": len(unresolved) > 0 or not has_close,
        "suggestions":  suggestions,
    }
```

> **[규칙] 컬럼 정규화가 이 시스템의 첫 번째 핵심이다.**
> 사용자가 어떤 증권사 데이터를 가져오든 — 키움, 신한, 미래에셋, Bloomberg, Yahoo Finance —
> 이 3단계 정규화가 컬럼명을 자동으로 표준화한다.
> `confidence=0`인 컬럼이 있으면 사용자에게 후보를 제안하고, 무리하게 추측하지 않는다.
> **컬럼 매핑 결과는 `window._appData.columnMapping`에 저장되어 UI에서 확인 가능하다.**

---

## 2-5. 강제 컬럼 복구 시스템 — Forced Recovery Layer

> 컬럼 정규화(alias mapping + fuzzy matching) 이후에도 핵심 분석 컬럼(date, close, volume, OHLC 등)을 찾지 못한 경우, 시스템은 즉시 분석을 중단하지 않는다.
>
> 대신 숫자형 컬럼의 분포, 변동성, 연속성, 결측률, 시계열 특성을 기반으로 가장 가능성 높은 컬럼을 강제 추론한다.
>
> 단, 강제 복구가 적용된 경우 데이터 품질 점수는 감점되며, UI에는 `"⚠️ Forced Recovery Applied"` 배지를 표시한다.

```python
def force_recover_columns(df: pd.DataFrame, mapping: dict) -> tuple[pd.DataFrame, dict]:
    """
    정규화 실패 후 최소 분석을 가능하게 하기 위한 강제 복구 레이어.

    목표:
      1. close 컬럼이 없을 때 가장 가능성 높은 가격 컬럼을 찾는다.
      2. date 컬럼이 없을 때 날짜형 컬럼을 재탐색한다.
      3. volume 후보가 있으면 보조 복구한다.
      4. 복구 내역을 recovery_log에 저장해 UI 경고와 품질점수 감점에 사용한다.
    """
    df = df.copy()
    recovery_log = {
        "applied": False,
        "recovered": {},
        "warnings": [],
        "quality_penalty": 0,
    }

    # 1. 날짜 컬럼 복구
    if "date" not in df.columns and not isinstance(df.index, pd.DatetimeIndex):
        for col in df.columns:
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().mean() >= 0.8:
                df[col] = parsed
                df = df.set_index(col).sort_index()
                recovery_log["applied"] = True
                recovery_log["recovered"]["date"] = col
                recovery_log["warnings"].append(f"날짜 컬럼을 '{col}'에서 강제 추론")
                recovery_log["quality_penalty"] += 5
                break

    # 2. close 컬럼 복구
    if "close" not in df.columns:
        candidates = []

        for col in df.columns:
            if col == "date":
                continue

            s = clean_numeric(df[col]) if df[col].dtype == "object" else df[col]
            s = pd.to_numeric(s, errors="coerce")
            valid_rate = s.notna().mean()

            if valid_rate < 0.6:
                continue

            s_valid = s.dropna()
            if len(s_valid) < 10:
                continue

            mean_v = float(s_valid.mean())
            std_v = float(s_valid.std())
            min_v = float(s_valid.min())
            max_v = float(s_valid.max())
            cv = std_v / (abs(mean_v) + 1e-10)
            unique_ratio = s_valid.nunique() / len(s_valid)
            continuity = s_valid.pct_change().replace([np.inf, -np.inf], np.nan).dropna().abs()
            stable_move_rate = (continuity < 0.3).mean() if len(continuity) > 0 else 0

            score = 0

            # 가격 후보 조건
            if min_v > 0:
                score += 20
            if mean_v > 100:
                score += 15
            if 0.005 <= cv <= 1.0:
                score += 20
            if unique_ratio > 0.5:
                score += 15
            if stable_move_rate > 0.8:
                score += 20
            if valid_rate > 0.9:
                score += 10

            # 거래량처럼 너무 큰 정수 반복 데이터는 감점
            is_integer_like = (s_valid == s_valid.round()).mean() > 0.95
            if is_integer_like and mean_v > 1e6:
                score -= 30

            candidates.append({
                "column": col,
                "score": score,
                "mean": mean_v,
                "cv": cv,
                "valid_rate": valid_rate,
            })

        candidates = sorted(candidates, key=lambda x: -x["score"])

        if candidates and candidates[0]["score"] >= 50:
            close_col = candidates[0]["column"]
            df["close"] = clean_numeric(df[close_col]) if df[close_col].dtype == "object" else pd.to_numeric(df[close_col], errors="coerce")

            recovery_log["applied"] = True
            recovery_log["recovered"]["close"] = close_col
            recovery_log["warnings"].append(
                f"종가 컬럼을 '{close_col}'에서 강제 추론"
            )
            recovery_log["quality_penalty"] += 15

            mapping[close_col] = {
                "std_name": "close",
                "method": "forced_recovery",
                "confidence": 0.55,
            }
        else:
            recovery_log["warnings"].append("close 강제 복구 실패 — 최소 분석 불가")
            recovery_log["quality_penalty"] += 30

    # 3. volume 컬럼 보조 복구
    if "volume" not in df.columns:
        volume_candidates = []

        for col in df.columns:
            if col in ["close", "date"]:
                continue

            s = clean_numeric(df[col]) if df[col].dtype == "object" else df[col]
            s = pd.to_numeric(s, errors="coerce")
            s_valid = s.dropna()

            if len(s_valid) < 10:
                continue

            mean_v = float(s_valid.mean())
            min_v = float(s_valid.min())
            is_integer_like = (s_valid == s_valid.round()).mean() > 0.95

            score = 0
            if min_v >= 0:
                score += 20
            if mean_v > 1e5:
                score += 25
            if is_integer_like:
                score += 25
            if s_valid.nunique() / len(s_valid) > 0.5:
                score += 10

            volume_candidates.append({
                "column": col,
                "score": score,
            })

        volume_candidates = sorted(volume_candidates, key=lambda x: -x["score"])

        if volume_candidates and volume_candidates[0]["score"] >= 50:
            vol_col = volume_candidates[0]["column"]
            df["volume"] = clean_numeric(df[vol_col]) if df[vol_col].dtype == "object" else pd.to_numeric(df[vol_col], errors="coerce")

            recovery_log["applied"] = True
            recovery_log["recovered"]["volume"] = vol_col
            recovery_log["warnings"].append(
                f"거래량 컬럼을 '{vol_col}'에서 강제 추론"
            )
            recovery_log["quality_penalty"] += 8

            mapping[vol_col] = {
                "std_name": "volume",
                "method": "forced_recovery",
                "confidence": 0.50,
            }

    return df, {
        "mapping": mapping,
        "recovery_log": recovery_log,
    }
```

---

## 3. 데이터 유형 자동 감지 — 신뢰도 기반 분류

컬럼 구성으로 데이터 성격을 자동으로 분류한다. 7가지 유형을 동시에 평가하고, 각각 0~1 신뢰도를 계산해 가장 높은 것을 primary type으로 사용한다.

### 3-A. 데이터 유형별 자동 분석 전략

시스템은 입력 데이터의 컬럼 구성과 기간, 품질 점수를 기준으로 데이터 유형을 자동 분류하고, 각 유형에 맞는 분석 파이프라인을 선택한다. 모든 데이터에 동일한 분석을 강제로 적용하는 대신, 데이터가 제공하는 정보 수준에 맞춰 분석 깊이와 UI 구성을 자동 조정한다.

구체적으로, 시스템은 먼저 데이터가 가격 중심인지, 거래량을 포함한 OHLCV 구조인지, 수급 데이터인지, 매크로 지표인지, 재무·가치평가 데이터인지, 포트폴리오 데이터인지를 판단한다. 이후 각 유형별로 사용 가능한 피처, 리스크 계산 방식, 시각화 방식, 인사이트 문구를 다르게 적용한다. 이 규칙을 통해 서로 다른 구조의 투자 데이터도 하나의 일관된 대시보드 시스템 안에서 해석할 수 있다.

#### 유형 1. OHLCV 기반 주가 데이터

OHLCV 데이터는 `open`, `high`, `low`, `close`, `volume` 컬럼을 모두 포함한 가장 완전한 가격 데이터다. 이 경우 시스템은 전체 분석 엔진을 활성화한다. 캔들차트, 거래량 서브패널, ATR 기반 리스크 계산, K-Means 레짐 판단, Ridge 기반 Alpha Score, Walk-forward 백테스트, TP 신호 감지까지 모두 실행한다.

분석 방식은 다음과 같다.

- 가격 흐름은 캔들스틱 차트로 표시한다.
- `close`를 기준으로 momentum, trend, RSI, low_vol 피처를 계산한다.
- `volume`을 기준으로 volume_signal을 계산한다.
- OHLC 구조를 활용해 ATR 손절가와 목표가를 산출한다.
- 60일 이상이면 Ridge Alpha Score를 계산한다.
- 252일 이상이면 Walk-forward 백테스트를 실행한다.
- MA50 추세와 RSI, ATR을 결합해 TP 신호를 감지한다.

이 유형은 가장 높은 분석 신뢰도를 가지며, 데이터 품질 점수가 충분할 경우 Confidence HIGH까지 허용한다.

#### 유형 2. Close-only 가격 시계열 데이터

Close-only 데이터는 `date`, `close`만 존재하거나 OHLC·volume 없이 종가만 제공되는 데이터다. 이 경우 시스템은 분석을 중단하지 않고 가격 기반 경량 분석을 수행한다.

분석 방식은 다음과 같다.

- 캔들차트 대신 라인차트를 사용한다.
- momentum은 5일·10일·20일 수익률을 기준으로 계산한다.
- trend는 MA20 또는 MA50 대비 괴리율과 기울기로 판단한다.
- RSI는 close 기반으로 계산한다.
- 거래량, 수급 피처는 0.5 중립값으로 고정한다.
- ATR 계산이 불가능하므로 rolling std 기반 2σ 손절을 사용한다.
- 60일 미만이면 Lite Alpha Score를 적용한다.
- 레짐은 Lite Regime Engine을 사용해 MA slope 기반으로 Bullish / Sideways / Bearish를 판단한다.

이 유형은 가격 방향성 판단은 가능하지만 거래량·수급 검증이 없기 때문에 Confidence는 최대 MEDIUM까지만 허용한다.

#### 유형 3. 거래량 없는 ETF·지수 데이터

ETF, 지수, 일부 펀드 데이터는 가격 정보는 충분하지만 거래량 또는 수급 컬럼이 없을 수 있다. 이 경우 시스템은 거래량 기반 신호를 제외하고 가격 기반 분석 중심으로 작동한다.

분석 방식은 다음과 같다.

- OHLC가 있으면 캔들차트를 사용하고, close만 있으면 라인차트를 사용한다.
- momentum, trend, RSI, low_vol 피처를 중심으로 Alpha Score를 계산한다.
- volume_signal은 0.5 중립값으로 고정한다.
- supply_signal 역시 0.5 중립값으로 고정한다.
- 리스크는 OHLC가 있으면 ATR, 없으면 rolling std 기반으로 계산한다.
- 백테스트는 252일 이상일 때만 실행한다.
- 인사이트에는 `"거래량 데이터 없음 — 가격 기반 분석"` 문구를 추가한다.

이 유형은 방향성 판단에는 적합하지만 거래 강도 검증이 제한되므로, volume 기반 충돌 감지는 비활성화한다.

#### 유형 4. 수급 데이터 중심 데이터

수급 데이터는 `foreign`, `institution`, `individual` 같은 투자 주체별 순매수 데이터를 포함한다. 가격 데이터와 함께 제공되면 Alpha Score 보조 신호로 사용하고, 가격 없이 수급만 존재하면 수급 분석 전용 모드로 전환한다.

분석 방식은 다음과 같다.

- `foreign` 5일 누적값을 rolling rank로 변환해 supply_signal을 계산한다.
- 기관·개인 데이터가 있으면 보조 수급 흐름으로 표시한다.
- 가격 데이터가 있으면 Alpha Score의 수급 피처로 반영한다.
- 가격 데이터가 없으면 Alpha Score는 생성하지 않고 수급 방향성 리포트만 출력한다.
- 외국인·기관 동반 순매수는 긍정 신호로 표시한다.
- 외국인 매도 + 개인 매수 조합은 리스크 경고로 표시한다.

이 유형은 "스마트머니 방향성"을 설명하는 데 강점이 있으며, 단독으로는 최종 매수 판단이 아니라 보조 판단 근거로 사용한다.

#### 유형 5. 매크로 지표 데이터

매크로 데이터는 `vix`, `rate`, `fx`, `dxy`, CPI, 환율, 금리 등 시장 환경을 설명하는 지표다. 이 데이터는 개별 종목의 Alpha Score를 직접 계산하기보다 시장 레짐과 리스크 보정에 사용한다.

분석 방식은 다음과 같다.

- 지표별 변화율과 이동평균 기울기를 계산한다.
- VIX 상승은 위험 회피 레짐으로 해석한다.
- 금리 상승은 성장주·고밸류 자산에 부정적 보정으로 사용한다.
- 환율 급등은 외국인 수급 리스크 경고로 연결한다.
- DXY 상승은 글로벌 위험자산 약세 가능성으로 표시한다.
- 단일 매크로 지표만 있는 경우 Alpha Score 대신 Macro Risk Score를 출력한다.
- 가격 데이터와 함께 있으면 Regime 보정과 Confidence 조정에 사용한다.

이 유형은 직접적인 매수·매도 판단보다 "시장 환경이 현재 신호를 지지하는가"를 판단하는 보조 레이어로 사용한다.

#### 유형 6. 재무·가치평가 데이터

재무·가치평가 데이터는 `per`, `pbr`, `roe`, `eps`, `revenue`, `op_income`, `net_income` 등을 포함한다. 이 데이터는 단기 매매 신호보다 기업의 밸류에이션과 펀더멘털 상태를 평가하는 데 사용한다.

분석 방식은 다음과 같다.

- PER, PBR은 동일 데이터 내 분위수 기준으로 저평가·고평가를 판단한다.
- ROE, 영업이익률, 순이익 성장률은 펀더멘털 강도 지표로 사용한다.
- 매출·영업이익·순이익이 모두 증가하면 성장 안정성 신호로 표시한다.
- 가격 데이터가 함께 있으면 Alpha Score의 보조 신뢰도에 반영한다.
- 가격 데이터가 없으면 Valuation Summary Card만 생성한다.
- 단기 매수 판단 대신 `"가치평가 참고"` 또는 `"펀더멘털 보조 분석"`으로 표시한다.

이 유형은 트레이딩 신호가 아니라 장기 투자 판단의 보조 근거로 사용한다.

#### 유형 7. 포트폴리오 데이터

포트폴리오 데이터는 `ticker`, `qty`, `buy_price`, `avg_price`, `mkt_value`, `return_pct` 등을 포함한다. 이 경우 개별 종목 분석보다 보유 자산의 구조와 리스크를 분석한다.

분석 방식은 다음과 같다.

- 종목별 평가금액 비중을 계산한다.
- 종목별 수익률과 전체 포트폴리오 수익률을 계산한다.
- 특정 종목 쏠림 비중이 높으면 집중 리스크 경고를 표시한다.
- 손실 종목과 수익 종목을 분리해 기여도 차트를 생성한다.
- 종목코드가 있으면 각 종목별 Alpha Score를 별도 계산할 수 있다.
- 포트폴리오 전체에는 Portfolio Health Score를 출력한다.

이 유형은 "지금 이 종목을 살까?"보다 "내 포트폴리오가 균형적인가?"에 답하는 분석 모드다.

#### 유형 8. 비교 분석 데이터

두 개 이상의 CSV가 업로드되거나 여러 종목이 포함된 경우 시스템은 비교 분석 모드로 전환한다. 이때 모든 대상은 동일한 파이프라인을 통과해야 하며, 분석 기준은 동일하게 유지된다.

분석 방식은 다음과 같다.

- 각 데이터에 대해 동일한 Alpha Score 계산 로직을 적용한다.
- 품질 점수, Alpha Score, 변동성, Sharpe, MDD, 백테스트 승률을 비교한다.
- 데이터 기간이 서로 다르면 기간 차이 경고를 표시한다.
- 한쪽만 백테스트 가능할 경우 백테스트 기준은 비교에서 제외한다.
- 최종적으로 기준별 승자를 계산하고 종합 우세 대상을 표시한다.

이 유형은 데이터별 조건이 달라도 동일 기준으로 비교 가능한 구조를 만드는 데 목적이 있다.

#### 공통 규칙

모든 데이터 유형은 다음 공통 규칙을 따른다.

- `close`가 있으면 최소 가격 분석을 수행한다.
- `date`가 있으면 시계열 분석을 우선 적용한다.
- OHLC가 없으면 캔들차트를 포기하고 라인차트를 사용한다.
- volume이 없으면 거래량 피처를 0.5 중립값으로 고정한다.
- foreign이 없으면 수급 피처를 0.5 중립값으로 고정한다.
- 60일 미만이면 Ridge Alpha 대신 Lite Alpha를 사용한다.
- 252일 미만이면 Walk-forward 백테스트를 비활성화한다.
- 데이터 품질이 낮으면 결과는 유지하되 Confidence를 낮춘다.
- 분석 불가 조건은 숨기지 않고 UI 경고로 표시한다.

#### 시스템 규칙

데이터 유형이 달라져도 시스템의 최종 처리 구조는 유지된다.

입력 데이터 → 데이터 유형 감지 → 유형별 분석 전략 선택 → 사용 가능한 피처 계산 → Alpha Score 또는 대체 Score 산출 → Regime / Risk / Confidence 보정 → UI 자동 구성 → 인사이트 생성

### 3-1. 유형별 감지 규칙

```python
def detect_types_with_confidence(df: pd.DataFrame) -> dict:
    """
    7개 유형의 신뢰도를 독립적으로 계산한다.
    필수 컬럼 충족률(70%) + 선택 컬럼 충족률(30%) × boost 계수.

    반환:
      detected       : {type → confidence} 전체
      primary        : 가장 높은 신뢰도 유형
      all_types      : 신뢰도 0.5 이상인 모든 유형
      is_composite   : 2개 이상 유형 혼재 여부
      analysis_level : 가능한 분석 수준 요약
    """
    cols = set(df.columns)
    n    = len(df)

    TYPE_RULES = {
        # 가격 데이터 — 종가만 있어도 기본 분석 가능
        "price": {
            "required": {"close"},
            "optional": {"open", "high", "low", "volume"},
            "boost":    1.0,
        },
        # OHLCV — 완전한 캔들 분석 가능
        "ohlcv": {
            "required": {"close", "open", "high", "low"},
            "optional": {"volume"},
            "boost":    1.2,
        },
        # 수급 데이터 — 외국인 포함 여부가 핵심
        "supply": {
            "required": {"foreign"},
            "optional": {"institution", "individual"},
            "boost":    1.0,
        },
        # 매크로 지표 — 단일 지표만 있어도 부분 분석
        "macro": {
            "required": set(),
            "optional": {"vix", "rate", "fx", "dxy"},
            "boost":    0.8,
        },
        # 가치평가 지표
        "valuation": {
            "required": set(),
            "optional": {"per", "pbr", "roe", "eps", "ev_ebitda"},
            "boost":    0.9,
        },
        # 재무제표
        "financial": {
            "required": {"revenue"},
            "optional": {"op_income", "net_income"},
            "boost":    1.1,
        },
        # 포트폴리오 — 다종목 구성
        "portfolio": {
            "required": {"ticker", "qty"},
            "optional": {"buy_price", "avg_price", "mkt_value", "return_pct"},
            "boost":    1.3,
        },
    }

    results = {}
    for dtype, rule in TYPE_RULES.items():
        req_score = (
            len(rule["required"] & cols) / len(rule["required"])
            if rule["required"] else 1.0
        )
        opt_score = (
            len(rule["optional"] & cols) / len(rule["optional"])
            if rule["optional"] else 0.0
        )
        conf = min((req_score * 0.7 + opt_score * 0.3) * rule["boost"], 1.0)
        if conf > 0.3:
            results[dtype] = round(conf, 2)

    # 기간 충분성 보너스: 252일+ OHLCV는 신뢰도 +0.1
    if "ohlcv" in results and n >= 252:
        results["ohlcv"] = min(results["ohlcv"] + 0.1, 1.0)

    sorted_types   = dict(sorted(results.items(), key=lambda x: -x[1]))
    high_conf      = [t for t, c in sorted_types.items() if c >= 0.5]
    primary        = list(sorted_types.keys())[0] if sorted_types else "unknown"
    is_composite   = len(high_conf) >= 2
    has_price      = any(t in high_conf for t in ["price", "ohlcv"])
    has_context    = any(t in high_conf for t in ["supply", "macro"])

    # 분석 수준 요약
    if primary == "ohlcv" and n >= 252 and is_composite:
        level = "전체 분석 가능 (캔들+피처+레짐+백테스트+수급)"
    elif primary in ("ohlcv", "price") and n >= 60:
        level = "핵심 분석 가능 (캔들+피처+레짐)"
    elif primary in ("ohlcv", "price") and n >= 14:
        level = "기본 분석 가능 (차트+MA+RSI)"
    elif primary == "supply":
        level = "수급 분석 전용"
    elif primary == "macro":
        level = "매크로 분석 전용"
    else:
        level = "제한적 분석"

    return {
        "detected":     sorted_types,
        "primary":      primary,
        "all_types":    high_conf,
        "is_composite": is_composite,
        "has_price":    has_price,
        "has_context":  has_context,
        "needs_manual": not sorted_types or max(sorted_types.values(), default=0) < 0.5,
        "analysis_level": level,
    }
```

---

## 4. 결측치·이상치·품질 진단

### 4-1. 결측치 처리 — 결측률에 따른 3단계 전략

```python
def handle_missing(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    컬럼별 결측률에 따라 다른 처리 전략을 적용한다.

    전략:
      결측률  5% 미만 → 선형 보간 (짧은 공백, 주말·공휴일 대응)
      결측률 20% 미만 → 전진 채움(ffill) (긴 공백, 데이터 지연 대응)
      결측률 20% 이상 → 컬럼 제거 (신뢰할 수 없는 데이터)

    특수 처리:
      거래량(volume)이 0인 행 → 제거 (휴장일, 데이터 오류)
      종가(close)가 NaN인 행 → 제거 (분석 불가)
      음수 가격 → NaN으로 대체 후 보간

    반환:
      (처리된 DataFrame, 처리 내역 dict)
    """
    log = {}
    df  = df.copy()

    # 음수 가격 처리
    for col in ["close", "open", "high", "low"]:
        if col in df.columns:
            neg_count = (df[col] < 0).sum()
            if neg_count > 0:
                df.loc[df[col] < 0, col] = None
                log[f"{col}_neg_replaced"] = int(neg_count)

    # 컬럼별 결측 처리
    dropped_cols = []
    for col in df.columns:
        rate = df[col].isnull().mean()
        if rate == 0:
            continue
        elif rate < 0.05:
            df[col] = df[col].interpolate(method='linear', limit_direction='both')
            log[f"{col}_interpolated"] = f"{rate:.1%}"
        elif rate < 0.20:
            df[col] = df[col].ffill().bfill()
            log[f"{col}_ffilled"] = f"{rate:.1%}"
        else:
            dropped_cols.append(col)
            log[f"{col}_dropped"] = f"{rate:.1%} 결측"

    if dropped_cols:
        df = df.drop(columns=dropped_cols)

    # 거래량 0인 행 제거 (휴장일)
    if "volume" in df.columns:
        before = len(df)
        df = df[df["volume"] > 0]
        removed = before - len(df)
        if removed > 0:
            log["volume_zero_rows_removed"] = removed

    # 종가 NaN 행 제거
    if "close" in df.columns:
        before = len(df)
        df = df.dropna(subset=["close"])
        removed = before - len(df)
        if removed > 0:
            log["close_nan_rows_removed"] = removed

    return df, log
```

### 4-2. 이상치 감지 — IQR + 도메인 지식 결합

```python
def detect_outliers(df: pd.DataFrame) -> dict:
    """
    수익률 기반 IQR(3σ 확장) 이상치 감지 + 도메인 지식 기반 추가 규칙.

    IQR 규칙: Q1 - 3*(Q3-Q1) ~ Q3 + 3*(Q3-Q1) 범위 이탈 → 이상치
    도메인 규칙:
      일간 수익률 ±30% 초과 → 서킷브레이커 또는 데이터 오류 의심
      거래량이 20일 평균의 10배 초과 → 이벤트성 거래 (정보로 활용, 제거 안 함)
      고가 < 저가 → 데이터 오류 (해당 행 NaN 처리)

    반환:
      {컬럼명: {count, pct, dates, action}}
      action: "flagged"(플래그만) / "replaced"(NaN 대체) / "kept"(이벤트로 보존)
    """
    result = {}

    if "close" in df.columns:
        ret = df["close"].pct_change().dropna()
        q1, q3 = ret.quantile(0.25), ret.quantile(0.75)
        iqr = q3 - q1
        outlier_mask = (ret < q1 - 3*iqr) | (ret > q3 + 3*iqr)
        extreme_mask = ret.abs() > 0.30

        result["return_outlier"] = {
            "count":  int(outlier_mask.sum()),
            "pct":    round(float(outlier_mask.mean()) * 100, 2),
            "dates":  df.index[outlier_mask].tolist(),
            "action": "flagged",
        }
        result["extreme_move"] = {
            "count":  int(extreme_mask.sum()),
            "dates":  df.index[extreme_mask].tolist(),
            "action": "flagged",  # 실제 이벤트일 수 있어 제거하지 않음
        }

    # 고가 < 저가 오류
    if all(c in df.columns for c in ["high", "low"]):
        error_mask = df["high"] < df["low"]
        if error_mask.any():
            df.loc[error_mask, ["high", "low", "open", "close"]] = None
            result["hloc_error"] = {
                "count":  int(error_mask.sum()),
                "dates":  df.index[error_mask].tolist(),
                "action": "replaced",
            }

    # 거래량 급등 (이벤트 정보로 보존)
    if "volume" in df.columns:
        vol_ma20 = df["volume"].rolling(20).mean()
        surge    = df["volume"] > vol_ma20 * 10
        result["volume_surge"] = {
            "count":  int(surge.sum()),
            "dates":  df.index[surge].tolist(),
            "action": "kept",  # 패닉셀·기관 대량매매 → 분석에 활용
        }

    return result
```

### 4-3. 품질 점수 — 3축 평가

```python
import math

def quality_score(df: pd.DataFrame, detected: dict) -> dict:
    """
    3개 축으로 독립 평가해 합산 (100점 만점).

    축 1 — 완전성 (0~40점):
      전체 결측률이 낮을수록 높은 점수.
      결측률 0%: 40점 / 5%: 30점 / 10%: 20점 / 20%+: 0점

    축 2 — 기간 충분성 (0~30점):
      로그 스케일 적용 (짧은 데이터와 긴 데이터의 점수 차이를 완화).
      14일: 8점 / 60일: 18점 / 252일: 25점 / 500일+: 30점

    축 3 — 이상치 비율 (0~30점):
      수익률 이상치(IQR 3σ) 비율이 낮을수록 높은 점수.
      0%: 30점 / 1%: 25점 / 3%: 15점 / 5%+: 0점
    """
    # 축 1: 완전성
    missing_rate = float(df.isnull().mean().mean())
    if missing_rate < 0.01:   completeness = 40
    elif missing_rate < 0.05: completeness = int(40 * (1 - missing_rate * 10))
    elif missing_rate < 0.20: completeness = int(40 * (1 - missing_rate * 5))
    else:                     completeness = 0

    # 축 2: 기간 충분성 (로그 스케일)
    n       = max(len(df), 1)
    min_n   = 14
    ref_n   = 252
    if n < min_n:
        period_score = 0
    else:
        period_score = min(30, int(30 * math.log(n / min_n) / math.log(ref_n / min_n)))

    # 축 3: 이상치 비율
    outlier_score = 30
    if "close" in df.columns:
        ret  = df["close"].pct_change().dropna()
        q1, q3 = ret.quantile(0.25), ret.quantile(0.75)
        iqr  = q3 - q1
        rate = float(((ret < q1 - 3*iqr) | (ret > q3 + 3*iqr)).mean())
        if rate < 0.01:   outlier_score = 30
        elif rate < 0.03: outlier_score = int(30 * (1 - rate * 20))
        elif rate < 0.05: outlier_score = int(30 * (1 - rate * 10))
        else:             outlier_score = 0

    total = completeness + period_score + outlier_score

    # 등급
    grade  = ("🟢 신뢰 높음" if total >= 80 else
              "🟡 보통"     if total >= 60 else
              "🟠 낮음"     if total >= 40 else
              "🔴 분석 제한")

    return {
        "total":        total,
        "completeness": completeness,
        "period":       period_score,
        "outlier":      outlier_score,
        "grade":        grade,
        "n_rows":       n,
    }
```

### 4-4. 품질 진단 체크리스트

```python
DIAGNOSIS_CHECKS = [
    {
        "id":      "has_close",
        "name":    "종가 데이터",
        "test":    lambda df, _: "close" in df.columns,
        "impact":  "없으면 모든 분석 불가",
        "fallback":"종가 없음 → 수치 최대 분산 컬럼 자동 선택 시도",
    },
    {
        "id":      "has_ohlc",
        "name":    "OHLC 전체",
        "test":    lambda df, _: all(c in df.columns for c in ["open","high","low","close"]),
        "impact":  "캔들차트 불가 → 라인차트 대체",
        "fallback":"종가 단독 라인차트 + 볼린저밴드",
    },
    {
        "id":      "has_volume",
        "name":    "거래량",
        "test":    lambda df, _: "volume" in df.columns,
        "impact":  "패닉셀 감지·거래량 신호 불가",
        "fallback":"volume_signal 피처 = 0.5 중립 고정",
    },
    {
        "id":      "has_supply",
        "name":    "외국인 수급",
        "test":    lambda df, _: "foreign" in df.columns,
        "impact":  "스마트머니 추적 불가",
        "fallback":"supply_signal 피처 = 0.5 중립 고정",
    },
    {
        "id":      "has_macro",
        "name":    "매크로 (VIX/금리)",
        "test":    lambda df, _: any(c in df.columns for c in ["vix","rate"]),
        "impact":  "레짐 판단 정확도 소폭 저하",
        "fallback":"수익률·변동성만으로 레짐 판단",
    },
    {
        "id":      "period_60",
        "name":    "60일+ 기간",
        "test":    lambda df, _: len(df) >= 60,
        "impact":  "Ridge 모델·RSI 신뢰도 저하",
        "fallback":"단순 상관계수 테이블만 표시",
    },
    {
        "id":      "period_252",
        "name":    "252일+ 기간 (백테스트)",
        "test":    lambda df, _: len(df) >= 252,
        "impact":  "Walk-forward 백테스트 불가",
        "fallback":"백테스트 패널 비활성화",
    },
    {
        "id":      "low_missing",
        "name":    "결측치 20% 미만",
        "test":    lambda df, _: df.isnull().mean().mean() < 0.20,
        "impact":  "일부 피처 신뢰도 저하",
        "fallback":"결측 컬럼 제거 후 가용 피처만 사용",
    },
]

def run_quality_diagnosis(df: pd.DataFrame, detected: dict) -> dict:
    """전체 진단 체크리스트를 실행하고 분석 수준을 자동 판정한다."""
    checks = []
    for c in DIAGNOSIS_CHECKS:
        passed = c["test"](df, detected)
        checks.append({
            "id":       c["id"],
            "name":     c["name"],
            "passed":   passed,
            "impact":   c["impact"] if not passed else None,
            "fallback": c["fallback"] if not passed else None,
        })

    passed_count  = sum(1 for c in checks if c["passed"])
    critical_fail = not any(c["passed"] for c in checks if c["id"] == "has_close")

    if critical_fail:
        level = "분석 불가"
    elif passed_count == 8:
        level = "완전"
    elif passed_count >= 6:
        level = "대부분 가능"
    elif passed_count >= 4:
        level = "부분적"
    else:
        level = "제한적"

    return {
        "checks":        checks,
        "passed_count":  passed_count,
        "total_count":   len(checks),
        "analysis_level": level,
        "critical_fail": critical_fail,
        "active_fallbacks": [c["fallback"] for c in checks if not c["passed"] and c["fallback"]],
    }
```

---

## 5. 데이터 부족 시 단계별 폴백 규칙

입력 데이터의 양·질에 따라 분석 가능한 범위가 달라진다. 아래 폴백 트리는 어떤 데이터가 들어와도 최소한의 분석 결과를 반환하도록 설계됐다.

```
[입력 데이터 수신]
    ↓
종가(close) 있는가?
  ├── 없음 → 수치 최대 분산 컬럼을 close로 자동 지정
  │          "자동 지정 컬럼 사용 중" 경고 표시
  │          ATR 불가 → 2σ 손절 사용
  │
  └── 있음 ↓
            │
데이터 기간?
  ├── 14일 미만 → 라인차트만 표시
  │              "최소 14일 데이터 필요" 안내
  │              피처·레짐·Alpha Score 전부 불가
  │
  ├── 14~29일  → 라인차트 + MA + RSI
  │              피처 계산 불가 (rolling 60일 필요)
  │              레짐: MA 기울기 단순 판단 (bull/bear/sideways)
  │              Alpha Score: 단일 피처(RSI 역수) 기반 단순 추정
  │
  ├── 30~59일  → 캔들차트(OHLC 있을 때) + MA + RSI + ATR
  │              K-Means 레짐 가능 (단 신뢰도 낮음)
  │              Alpha Score: 부분 피처 (rolling 창 축소 적용)
  │              백테스트 불가
  │
  ├── 60~251일 → 전체 피처 계산 가능
  │              K-Means 레짐 정상 동작
  │              Ridge Alpha Score 정상 (단 CV 폴드 수 축소)
  │              백테스트 불가 (252일 미만)
  │              TP 신호 감지 가능
  │
  └── 252일+  → 전체 분석 가능
                 Walk-forward 백테스트 정상
                 모든 패널 활성화

[OHLC 없이 종가만 있을 때]
  - 캔들 → 라인차트로 대체
  - ATR 계산 불가 → 2σ 손절 (close.rolling(20).std() × 2)
  - 해당 부분 UI에 "OHLC 없음 — 라인차트 및 2σ 손절 적용 중" 안내

[수급(foreign) 없을 때]
  - supply_signal 피처 = 0.5 (중립) 고정
  - "수급 데이터 없음 — 스마트머니 추적 불가" 안내
  - 스마트머니 차트 비활성화

[거래량(volume) 없을 때]
  - volume_signal 피처 = 0.5 (중립) 고정
  - 거래량 서브패널 비활성화
  - 패닉셀 마커 비활성화

[Ridge CV R² 전체 음수일 때]
  - Ridge 모델 결과 대신 피처 단순 가중 합산으로 대체
  - "모델 예측력 낮음 — 신호 강도 기반 추정" 경고 표시
  - Alpha Score 색상: 정상(파란색) → 경고(주황색)
```

---

## 6. 전처리 후 파이프라인 진입 조건

전처리가 완료된 DataFrame이 분석 파이프라인에 진입하기 전 최종 검증을 수행한다. 이 단계를 통과하지 못하면 에러가 아닌 "제한 분석 모드"로 전환된다.

```python
def prepare_for_pipeline(df: pd.DataFrame) -> dict:
    """
    전처리 완료된 DataFrame을 파이프라인에 맞게 최종 정리하고,
    각 분석 단계의 실행 가능 여부를 판정한다.

    반환:
      df              : 최종 정리된 DataFrame
      can_feature     : 피처 계산 가능 (60일+, close 있음)
      can_regime      : 레짐 판단 가능 (30일+)
      can_alpha       : Alpha Score 계산 가능 (60일+, 피처 가능)
      can_backtest    : 백테스트 가능 (252일+)
      can_tp          : TP 신호 감지 가능 (OHLCV, 60일+)
      can_supply_panel: 수급 패널 활성화 가능
      mode            : "full" / "partial" / "minimal" / "chart_only"
    """
    n       = len(df)
    has_c   = "close" in df.columns
    has_ohlc= all(c in df.columns for c in ["open","high","low","close"])
    has_vol = "volume" in df.columns
    has_sup = "foreign" in df.columns

    can_feature     = has_c and n >= 60
    can_regime      = has_c and n >= 30
    can_alpha       = can_feature
    can_backtest    = has_c and n >= 252
    can_tp          = has_ohlc and n >= 60
    can_supply_panel= has_sup

    if can_backtest and can_feature and has_ohlc:
        mode = "full"
    elif can_alpha and has_c:
        mode = "partial"
    elif can_regime and has_c:
        mode = "minimal"
    else:
        mode = "chart_only"

    # 수치형 컬럼 최종 정리
    for col in df.select_dtypes(include='object').columns:
        df[col] = clean_numeric(df[col])

    # 인덱스가 DatetimeIndex인지 확인, 아니면 date 컬럼으로 재설정
    if not isinstance(df.index, pd.DatetimeIndex):
        df = set_date_index(df)

    return {
        "df":               df,
        "can_feature":      can_feature,
        "can_regime":       can_regime,
        "can_alpha":        can_alpha,
        "can_backtest":     can_backtest,
        "can_tp":           can_tp,
        "can_supply_panel": can_supply_panel,
        "mode":             mode,
        "n_rows":           n,
        "has_ohlc":         has_ohlc,
        "has_volume":       has_vol,
        "has_supply":       has_sup,
    }
```

---

# Part 2 — 분석 엔진

> 💡 **이 규칙은 Skills.md의 핵심 역할이다**
> 피처 계산부터 ML 레짐 판단, Alpha Score, 백테스트까지 — **모든 분석은 Skills.md 규칙에 의해 자동 생성된다.**
> 사람이 수동으로 파라미터를 조정하거나 모델을 선택하지 않는다. 데이터가 들어오면 Skills.md가 알아서 판단한다.

---

## 7. 피처 엔지니어링 — 6개 신호

> 🔑 **이 규칙은 Skills.md의 핵심 역할이다**
> 6개 신호의 계산 방식, rolling 창 크기, 정규화 방법이 모두 Skills.md에 정의되어 있다.
> CSV가 바뀌어도 동일한 피처 로직이 자동 적용된다.

모든 피처는 rolling 계산으로 Look-ahead bias를 차단한다. 미래 데이터가 현재 시점 계산에 절대 개입하지 않는다. 각 피처는 0~1로 정규화되어 레짐 가중치와 Ridge 계수에 직접 곱해진다.

```python
def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    6개 피처를 계산한다.
    데이터 부족 시 계산 가능한 피처만 반환하고 나머지는 0.5(중립) 고정.

    피처 설명:
      momentum      : 20일 수익률의 60일 분위수 — 최근 가격 모멘텀 강도
      trend         : (close - MA20) / MA20 클리핑 후 정규화 — MA 기준 추세 위치
      rsi_norm      : RSI14 / 100 — 과매수/과매도 정도
      volume_signal : (vol/MA20_vol)의 60일 분위수 — 거래량 이상 강도
      supply_signal : 외국인 5일 누적의 60일 분위수 — 스마트머니 방향
      low_vol       : 20일 변동성의 60일 분위수 역순 — 저변동성 환경
    """
    closes  = df["close"].values
    n       = len(closes)
    volumes = df["volume"].values if "volume" in df.columns else None
    foreign = df["foreign"].values if "foreign" in df.columns else None

    # 1. 모멘텀: 20일 수익률 60일 rolling rank
    ret20    = _pct_change(closes, 20)
    momentum = _rolling_rank_pct(ret20, 60)

    # 2. 추세강도: MA20 괴리율 [-0.1, 0.1] clip → [0, 1]
    ma20  = _rolling_mean(closes, 20)
    trend = np.where(
        ma20 > 0,
        np.clip((closes - ma20) / (ma20 + 1e-10), -0.1, 0.1) / 0.1 * 0.5 + 0.5,
        np.nan
    )

    # 3. RSI 정규화: RSI14 / 100
    rsi14     = _compute_rsi(closes, 14)
    rsi_norm  = rsi14 / 100

    # 4. 거래량 신호: (vol/vol_MA20)의 60일 rolling rank
    if volumes is not None:
        vol_ma20   = _rolling_mean(volumes, 20)
        vol_ratio  = np.where(vol_ma20 > 0, volumes / (vol_ma20 + 1e-10), np.nan)
        vol_signal = _rolling_rank_pct(vol_ratio, 60)
    else:
        vol_signal = np.full(n, 0.5)

    # 5. 수급 신호: 외국인 5일 누적의 60일 rolling rank
    if foreign is not None:
        for5       = _rolling_sum(foreign, 5)
        sup_signal = _rolling_rank_pct(for5, 60)
    else:
        sup_signal = np.full(n, 0.5)

    # 6. 저변동성: 20일 수익률 표준편차의 60일 rank 역순
    ret1    = _pct_change(closes, 1)
    vol20   = _rolling_std(ret1, 20)
    low_vol = 1 - _rolling_rank_pct(vol20, 60)

    return pd.DataFrame({
        "momentum":      momentum,
        "trend":         trend,
        "rsi_norm":      rsi_norm,
        "volume_signal": vol_signal,
        "supply_signal": sup_signal,
        "low_vol":       low_vol,
    }, index=df.index)
```

> **[규칙] 6개 피처는 Alpha Score의 '근거'다 — Alpha Score의 하위 요소다.**
>
> | 피처 | Alpha Score에서의 역할 |
> |---|---|
> | momentum | 가격이 오르는 추세인가? → 점수의 방향성 |
> | trend | MA 대비 현재 위치 → 점수의 강도 |
> | rsi_norm | 과매수/과매도 → 점수의 타이밍 조정 (direction=-0.5) |
> | volume_signal | 거래량 이상 → 점수의 신뢰도 강화 |
> | supply_signal | 외국인 자금 방향 → 스마트머니 방향 |
> | low_vol | 변동성 낮음 → 안정적 진입 환경 |
>
> **피처가 없으면 Alpha Score를 만들 수 없다. 피처는 점수의 원재료다.**
> volume/foreign 없을 때 0.5 중립을 고정하는 것은, 없는 데이터를 꾸며내지 않겠다는 규칙이다.

---

## 8. ML — K-Means 시장 레짐 판단

```python
REGIME_FEATURE_WEIGHTS = {
    0: {"momentum":0.6,"trend":0.8,"rsi_norm":1.2,"volume_signal":0.8,"supply_signal":1.0,"low_vol":1.4},
    1: {"momentum":1.0,"trend":1.0,"rsi_norm":1.0,"volume_signal":1.0,"supply_signal":1.0,"low_vol":1.0},
    2: {"momentum":1.4,"trend":1.2,"rsi_norm":0.8,"volume_signal":1.2,"supply_signal":1.4,"low_vol":0.6},
}

def fit_regime(df: pd.DataFrame) -> dict:
    """
    수익률·변동성 2차원 K-Means(k=3)으로 레짐을 판정한다.
    최근 20봉에 3배 가중치를 부여해 현재 시장 환경 반영.
    30일 미만이면 MA50 기울기 기반 단순 레짐으로 폴백.
    """
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    ret20 = df["close"].pct_change(20).dropna()
    if len(ret20) < 30:
        # 폴백: MA 기울기 기반
        ma50   = df["close"].rolling(50).mean()
        slope  = ma50.diff(5).iloc[-1]
        current= 2 if slope > 0.002 else 0 if slope < -0.002 else 1
        return {"current": current, "label": {0:"약세",1:"횡보",2:"강세"}[current],
                "fallback": True}

    vol20  = df["close"].pct_change().rolling(20).std().dropna()
    common = ret20.index.intersection(vol20.index)
    X      = np.column_stack([ret20.loc[common], vol20.loc[common]])

    # 최근 20봉 가중치 3배
    weights = np.ones(len(X))
    weights[-20:] = 3.0

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    km = KMeans(n_clusters=3, random_state=42, n_init=10)
    km.fit(X_scaled, sample_weight=weights)
    labels = km.labels_

    # 클러스터 평균 수익률 기준 재정렬: 낮은→0(약세), 중간→1(횡보), 높은→2(강세)
    means   = [X[labels == i, 0].mean() for i in range(3)]
    order   = np.argsort(means)
    remap   = {order[0]: 0, order[1]: 1, order[2]: 2}
    labels  = np.array([remap[l] for l in labels])
    current = remap[km.predict(scaler.transform(X_scaled[-1:]))[0]]

    regime_labels = {0: "약세 (Bearish)", 1: "횡보 (Sideways)", 2: "강세 (Bullish)"}
    stats = {}
    for r in range(3):
        mask = labels == r
        stats[r] = {
            "avg_return":   float(X[mask, 0].mean()) if mask.any() else 0,
            "avg_vol":      float(X[mask, 1].mean()) if mask.any() else 0,
            "frequency":    float(mask.mean()),
        }

    return {
        "current": current,
        "label":   regime_labels[current],
        "series":  pd.Series(labels, index=common),
        "stats":   stats,
        "fallback": False,
    }
```

> **[규칙] 레짐은 Alpha Score의 '맥락'이다 — 점수를 보정하는 역할이다.**
>
> 같은 Alpha Score 68점이라도:
> - 강세 레짐(2): "지금 시장 자체가 상승 중 → 68점은 유효"
> - 약세 레짐(0): "시장 전체가 하락 중 → 68점이어도 Buy 신호 약화"
>
> 레짐은 점수를 직접 바꾸지 않는다. 대신 판단 엔진(Part 0)에서 최종 액션을 보정한다.
> **레짐 판단 결과는 `판단 우선순위 3순위`에서 최종 판단에 반영된다.**

---

## 9. ML — Ridge 회귀 Alpha Score

```python
FEATURE_DIRECTION = {
    "momentum":      1.0,
    "trend":         1.0,
    "rsi_norm":     -0.5,
    "volume_signal": 0.6,
    "supply_signal": 1.0,
    "low_vol":       0.4,
}

def compute_alpha_score(features: pd.DataFrame, df: pd.DataFrame,
                        regime: int) -> dict:
    """
    Ridge 회귀 + TimeSeriesSplit으로 Alpha Score(0~100)를 계산한다.
    브라우저(JS) 환경에서는 레짐별 가중 선형 결합 + rolling rank로 근사.

    구현 일관성 규칙:
      모든 Alpha Score 표시 지점(게이지·헤더·What-if 기준)은
      이 함수의 scores 배열 마지막 유효값만 사용한다.
      단순 산술식(50 + MA괴리율 × 500)은 절대 금지.
    """
    from sklearn.linear_model import Ridge
    from sklearn.model_selection import TimeSeriesSplit
    from sklearn.preprocessing import StandardScaler

    weights = REGIME_FEATURE_WEIGHTS.get(regime, REGIME_FEATURE_WEIGHTS[1])
    fwd20   = df["close"].pct_change(20).shift(-20)
    common  = features.dropna().index.intersection(fwd20.dropna().index)

    if len(common) < 60:
        # 폴백: 선형 결합 + rolling rank 근사
        raw = features.fillna(0.5).apply(
            lambda row: sum(weights[k] * FEATURE_DIRECTION[k] * row[k]
                            for k in weights if k in row), axis=1
        )
        scores = raw.rank(pct=True).mul(100).round(1)
        importance = _calc_importance(weights, features.iloc[-1] if len(features) > 0 else None)
        return {"scores": scores, "importance": importance,
                "cv_r2": None, "mode": "lite_linear",}

    X = features.loc[common].copy()
    for k, w in weights.items():
        if k in X.columns:
            X[k] = X[k] * w

    y      = fwd20.loc[common]
    scaler = StandardScaler()
    model  = Ridge(alpha=1.0)
    cv_scores = []

    n_splits = min(5, len(X) // 60)
    for tr, val in TimeSeriesSplit(n_splits=n_splits).split(X):
        model.fit(scaler.fit_transform(X.iloc[tr]), y.iloc[tr])
        cv_scores.append(model.score(scaler.transform(X.iloc[val]), y.iloc[val]))

    model.fit(scaler.fit_transform(X), y)
    raw    = pd.Series(model.predict(scaler.transform(features.fillna(0.5))),
                       index=features.index)
    scores = raw.rank(pct=True).mul(100).round(1)

    importance = _calc_importance(weights, features.iloc[-1],
                                  model_coef=dict(zip(X.columns, model.coef_)))

    return {
        "scores":     scores,
        "importance": importance,
        "cv_r2_mean": round(float(np.mean(cv_scores)), 3),
        "cv_r2_std":  round(float(np.std(cv_scores)), 3),
        "mode": "ridge",
    }

def _calc_importance(weights, last_row, model_coef=None) -> dict:
    if last_row is None:
        return {"labels": [], "values": []}
    total = sum(abs(weights[k] * FEATURE_DIRECTION.get(k,1)) for k in weights)
    items = sorted([
        {"label": {"momentum":"모멘텀","trend":"추세강도","rsi_norm":"RSI",
                   "volume_signal":"거래량","supply_signal":"수급신호","low_vol":"저변동성"}.get(k, k),
         "value": round(abs(
             (model_coef[k] if model_coef and k in model_coef
              else weights[k] * FEATURE_DIRECTION.get(k,1)) * float(last_row.get(k, 0.5))
         ) / (total + 1e-10) * 100, 1)}
        for k in weights if k in (last_row.index if hasattr(last_row,'index') else weights)
    ], key=lambda x: -x["value"])
    return {"labels": [i["label"] for i in items], "values": [i["value"] for i in items]}
```

> **[규칙] Alpha Score는 이 시스템의 '결론'이다 — 모든 것이 이 숫자로 수렴한다.**
>
> - `scores` 배열의 **마지막 유효값**만 최종 판단에 사용한다.
> - `importance`는 Tab 2에서 "왜 이 점수인가"를 설명하는 피처 기여도로 사용된다.
> - `cv_r2_mean`이 음수이면 Ridge 모델이 신뢰할 수 없다는 뜻 → 폴백으로 전환.
> - **이 함수의 결과물이 판단 엔진(Part 0) 2순위의 입력이 된다.**
>
> Alpha Score는 결코 단순 산술식(`50 + MA괴리율 × 500`)으로 계산하지 않는다.
> Skills.md가 Ridge 모델을 통해 자동으로 계산하는 값이다.

---

## 9-A. Lite Alpha Score — 데이터 부족 대응 경량 판단 엔진

> 🔑 **이 규칙은 Skills.md의 핵심 안정성 장치다**
> 정식 Ridge 기반 Alpha Score 계산이 불가능하더라도, 시스템은 분석을 중단하지 않고 반드시 하나의 판단값을 반환해야 한다.
>
> Lite Alpha Score는 단순 지표 합이 아니라, 각 신호를 상대적 강도(rank 기반)로 변환하여 계산하는 경량 판단 모델이다. 동일한 신호 구조를 유지하면서 데이터 요구사항만 완화한 경량 판단 엔진이다.
>
> 다음 조건 중 하나라도 해당되면 Lite Alpha Score를 사용한다.
>
> - 데이터 기간이 60일 미만인 경우
> - rolling 60 기반 피처 계산이 불가능한 경우
> - Ridge 모델의 CV R²가 전체적으로 음수인 경우
> - 주요 컬럼(volume, foreign 등) 부족으로 정식 모델 신뢰도가 낮은 경우
>
> 계산 방식:
>
> ```python
> def compute_lite_alpha_score(df: pd.DataFrame) -> pd.Series:
>     """
>     데이터 부족 환경용 경량 Alpha Score.
>     단순 지표 합산이 아닌 rank 기반 상대 강도 점수화 사용.
>     """
>
>     close = df["close"]
>
>     # 1. 단기 모멘텀
>     ret5  = close.pct_change(5)
>     ret10 = close.pct_change(10)
>     momentum = (ret5 + ret10) / 2
>     momentum_rank = momentum.rank(pct=True)
>
>     # 2. 추세 강도
>     ma20 = close.rolling(20).mean()
>     trend = (close - ma20) / (ma20 + 1e-10)
>     trend_norm = (
>         np.clip(trend, -0.1, 0.1) / 0.1 * 0.5 + 0.5
>     )
>
>     # 3. RSI
>     rsi = _compute_rsi(close.values, 14)
>     rsi_norm = pd.Series(rsi, index=df.index) / 100
>
>     # 4. 변동성
>     vol = close.pct_change().rolling(10).std()
>     vol_rank = vol.rank(pct=True)
>
>     # 5. Lite Alpha 계산
>     lite_raw = (
>         momentum_rank * 0.35 +
>         trend_norm    * 0.30 +
>         (1 - rsi_norm) * 0.20 +
>         (1 - vol_rank) * 0.15
>     )
>
>     return lite_raw.rank(pct=True).mul(100).round(1)
> ```
>
> 출력 규칙:
>
> - 기존 Alpha Score와 동일하게 0~100 스케일 유지
> - 반드시 `"Lite 추정값"` 배지 표시
> - 판단 엔진(Part 0)에 동일하게 전달
> - 기존 Alpha Score와 동일한 게이지/UI 구조 사용
>
> 출력 예시:
>
> ```
> Alpha Score: 54점
> 산출 방식: Lite Alpha Score (경량 모델)
> 신뢰도: 낮음
>
> 보정 사유:
> - 데이터 45일 → Ridge 모델 미적용
> - 단기 모멘텀 + MA + RSI 기반 계산
>
> 권장 해석:
> 뚜렷한 방향성 부족. 관망 또는 소량 진입 고려.
> ```
>
> **규칙:**
> 정식 Alpha Score 계산이 실패하더라도 시스템은 분석을 중단하지 않는다.
> 데이터가 부족한 환경에서는 동일한 신호 구조를 유지한 Lite Alpha Score로 자동 전환한다.

---

## 9-B. Lite Regime Engine — 데이터 부족 환경용 경량 레짐 판단

Lite Regime Engine은 데이터 기간이 짧거나 OHLC·거래량 정보가 부족한 경우에도 시장 상태를 최소 수준으로 판단하기 위한 경량 레짐 시스템이다.

정식 K-Means 레짐 판단이 불가능한 경우, 시스템은 레짐 판단을 중단하지 않고 MA 기울기와 최근 수익률 방향성을 기반으로 Bullish / Sideways / Bearish 중 하나를 반환한다.

판단 기준은 다음과 같다.

- MA20 또는 MA50의 최근 5일 기울기가 +0.2% 이상이면 Bullish로 판단한다.
- MA20 또는 MA50의 최근 5일 기울기가 -0.2% 이하이면 Bearish로 판단한다.
- 위 조건에 해당하지 않으면 Sideways로 판단한다.

출력 규칙은 다음과 같다.

- Lite Regime Engine 사용 시 `"Lite Regime"` 배지를 표시한다.
- 정식 K-Means 레짐과 구분하여 신뢰도는 최대 MEDIUM까지만 허용한다.
- Lite Regime 결과는 판단 엔진의 3순위 Regime 보정에 동일하게 전달한다.

---

## 10. 신호 검증 — Rolling 상관계수

```python
def validate_signals(features: pd.DataFrame, df: pd.DataFrame) -> list:
    """
    각 피처와 20일 후 수익률의 최근 60개 유효쌍 Pearson 상관계수.
    |corr| < 0.03 → usable=False (신뢰도 낮음)
    추세: 최근 30개 vs 이전 30개 비교로 방향 판정.
    """
    fwd20 = df["close"].pct_change(20).shift(-20)
    keys  = ["momentum","trend","rsi_norm","volume_signal","supply_signal","low_vol"]
    names = {"momentum":"모멘텀","trend":"추세강도","rsi_norm":"RSI정규화",
             "volume_signal":"거래량신호","supply_signal":"수급신호","low_vol":"저변동성"}
    result = []
    for key in keys:
        if key not in features.columns:
            continue
        pairs = [(float(features[key].iloc[i]), float(fwd20.iloc[i]))
                 for i in range(len(features)-1, max(len(features)-61,-1),-1)
                 if not (pd.isna(features[key].iloc[i]) or pd.isna(fwd20.iloc[i]))]
        if len(pairs) < 10:
            result.append({"signal":names[key],"corr":0,"trend":"데이터 부족","usable":False})
            continue
        xs = [p[0] for p in pairs]; ys = [p[1] for p in pairs]
        corr = float(np.corrcoef(xs, ys)[0,1])
        recent = pairs[:30]; old = pairs[30:]
        if len(old) >= 5:
            c_r = float(np.corrcoef([p[0] for p in recent],[p[1] for p in recent])[0,1])
            c_o = float(np.corrcoef([p[0] for p in old],  [p[1] for p in old]  )[0,1])
            trend = "상승 중" if c_r > c_o + 0.01 else "하락 중" if c_r < c_o - 0.01 else "횡보"
        else:
            trend = "—"
        result.append({"signal":names[key],"corr":round(corr,3),
                        "trend":trend,"usable":abs(corr)>=0.03})
    return sorted(result, key=lambda x: -abs(x["corr"]))
```

> **[규칙] 신호 검증은 Alpha Score의 '신뢰도 검사'다.**
>
> Alpha Score가 68점이어도, 그 점수를 만든 피처들이 실제로 미래 수익률과 상관없다면 의미가 없다.
> `|corr| < 0.03`이면 해당 피처는 이 종목의 과거 데이터에서 예측력이 없다는 뜻이다.
> **신뢰도 낮은 피처가 많을수록 Alpha Score의 신뢰도도 낮아진다 → 품질 배지에 반영된다.**

---

## 11. 리스크 관리 — ATR + Kelly Criterion

```python
def compute_risk_levels(last_close: float, atr: float,
                        score: float, regime: int) -> dict:
    """
    stop_mult = 2.0 × score_factor × regime_factor
    score_factor:  80+→0.8, 60+→1.0, 40+→1.2, 20+→1.3, else→1.4
    regime_factor: 강세→0.8, 횡보→1.0, 약세→1.3
    RR 비율: 목표/손절 = 2:1 고정
    """
    sf = (0.8 if score>=80 else 1.0 if score>=60 else 1.2 if score>=40
          else 1.3 if score>=20 else 1.4)
    rf = {2: 0.8, 1: 1.0, 0: 1.3}.get(regime, 1.0)
    mult    = 2.0 * sf * rf
    stop    = last_close - atr * mult
    target  = last_close + atr * mult * 2
    stop_pct   = round((stop - last_close) / last_close * 100, 2)
    target_pct = round((target - last_close) / last_close * 100, 2)
    kelly = min(max((score/100 - 0.5) * 0.5, 0), 0.20)
    return {"stop_loss": round(stop), "stop_pct": stop_pct,
            "target_price": round(target), "target_pct": target_pct,
            "rr_ratio": 2.0, "kelly_pct": round(kelly*100, 1)}
```

> **[규칙] 리스크 관리는 Alpha Score의 '실행 조건'이다.**
>
> Alpha Score가 아무리 높아도 손절/목표가 없이는 실제 투자에 쓸 수 없다.
> 이 함수는 "점수가 좋다 → 얼마에 사서 어디서 팔고 어디서 자르냐"의 구체적 수치를 만든다.
>
> - `stop_mult`는 점수와 레짐에 따라 자동으로 결정된다 (사람이 입력하지 않는다).
> - 레짐이 약세일수록 손절을 더 가깝게 설정한다 (regime_factor=1.3).
> - Kelly 비율은 포지션 크기 기준이다 — 점수 50점 이하이면 0% (진입 비권고).

---

## 12. 백테스트 — Walk-forward

```python
def walk_forward_backtest(df: pd.DataFrame, alpha_scores: pd.Series) -> dict:
    """
    252/63일 슬라이딩 윈도우. Alpha Score > 60 → 다음날 진입 시뮬레이션.
    252일 미만이면 {"error":"252일+ 필요"} 반환.
    """
    if len(df) < 252:
        return {"error": "백테스트 불가 — 252일+ 데이터 필요"}
    ret1    = df["close"].pct_change().shift(-1)
    results = []
    for start in range(0, len(df)-252-63, 63):
        te, tx = start+252, min(start+252+63, len(df))
        period_rets = [float(ret1.iloc[i])
                       for i in range(te, tx-1)
                       if not pd.isna(alpha_scores.iloc[i])
                       and alpha_scores.iloc[i] > 60
                       and not pd.isna(ret1.iloc[i])]
        if len(period_rets) < 3:
            continue
        avg  = float(np.mean(period_rets))
        wr   = float(np.mean([r>0 for r in period_rets]))
        std  = float(np.std(period_rets))
        sh   = float(avg/std * np.sqrt(252)) if std > 0 else 0
        results.append({"label": str(df.index[te])[:7],
                         "value": round(avg*100,1),
                         "win_rate": round(wr,2), "sharpe": round(sh,2)})
    if not results:
        return {"error": "검증 기간 부족"}
    return {"results": results,
            "avg_return": round(float(np.mean([r["value"] for r in results])),1),
            "avg_win_rate": round(float(np.mean([r["win_rate"] for r in results])),2),
            "avg_sharpe":   round(float(np.mean([r["sharpe"]   for r in results])),2),
            "consistency":  round(float(np.mean([r["value"]>0  for r in results])),2)}
```

> **[규칙] 백테스트는 Alpha Score의 '보조 근거'다 — 미래가 아니라 과거 검증이다.**
>
> 백테스트가 좋다고 미래 수익을 보장하지 않는다.
> 하지만 "이 종목에서 Alpha Score > 60일 때 평균 수익률이 얼마였는가"는 유효한 참고다.
> **백테스트 결과는 Alpha Score의 주요 판단이 아니라, Tab 2에서 보조 근거로만 표시된다.**
> 252일 미만이면 백테스트 자체를 표시하지 않는다 — 부족한 데이터로 오해를 주지 않기 위해서다.

---

## 13. 신호 충돌 감지

```python
CONFLICT_TYPES = [
    {
        "id":    "TYPE-1",
        "label": "방향 충돌",
        "test":  lambda f, score, *_: (
            score >= 60 and f.get("rsi_norm", 0.5) > 0.75 and f.get("low_vol", 0.5) < 0.25
        ),
        "severity": "MEDIUM",
        "message":  "Alpha 점수는 긍정적이나 RSI 과매수 + 변동성 급증",
        "suggestion":"포지션 축소 또는 분할 진입 고려",
    },
    {
        "id":    "TYPE-2",
        "label": "강도 충돌",
        "test":  lambda f, score, *_: (
            score >= 60 and f.get("momentum", 0.5) < 0.3 and f.get("trend", 0.5) < 0.4
        ),
        "severity": "MEDIUM",
        "message":  "Alpha 점수는 긍정적이나 모멘텀·추세 신호 약함",
        "suggestion":"추세 확인 후 진입 고려",
    },
    {
        "id":    "TYPE-3",
        "label": "타이밍 충돌",
        "test":  lambda f, score, *_: (
            score >= 60 and f.get("rsi_norm", 0.5) > 0.70
        ),
        "severity": "HIGH",
        "message":  "Alpha 점수 긍정적이나 RSI 과매수 구간",
        "suggestion":"RSI 60 이하 대기 또는 분할 매수 고려",
    },
    {
        "id":    "TYPE-4",
        "label": "신뢰도 충돌",
        "test":  lambda f, score, atr_norm, quality, *_: quality < 50,
        "severity": "LOW",
        "message":  "데이터 품질 낮음 — 신호 신뢰도 저하",
        "suggestion":"추가 데이터 확보 후 재분석 권고",
    },
    {
        "id":    "TYPE-5",
        "label": "레짐 충돌",
        "test":  lambda f, score, atr_norm, quality, regime: (
            score >= 60 and regime == 0
        ),
        "severity": "HIGH",
        "message":  "매수 신호이나 현재 약세 레짐",
        "suggestion":"레짐 전환 확인 후 진입 고려",
    },
]

def detect_conflicts(last_f: dict, score: float, atr_norm: float,
                     quality: int, regime: int) -> list:
    found = []
    for ct in CONFLICT_TYPES:
        try:
            if ct["test"](last_f, score, atr_norm, quality, regime):
                found.append({k: ct[k] for k in ["id","label","severity","message","suggestion"]})
        except Exception:
            continue
    return sorted(found, key=lambda x: {"HIGH":0,"MEDIUM":1,"LOW":2}[x["severity"]])
```

> **[규칙] 신호 충돌은 판단 엔진의 '4순위 보정 입력'이다.**
>
> 충돌 감지 결과는 Alpha Score를 바꾸지 않는다.
> 대신 Part 0 판단 엔진 4순위에서 최종 액션을 강등하는 데 사용된다.
>
> - HIGH 충돌 → 액션 1단계 강등 + 보정 사유에 기록
> - MEDIUM 2건+ → 동일하게 1단계 강등
> - LOW만 있으면 → 강등 없음, 경고 배지만
>
> **충돌이 여러 개여도 강등은 1단계만 추가된다.**
> 레짐 보정 + 충돌 보정 합산 최대 2단계까지만 강등한다.

---

# Part 3 — 3탭 대시보드 설계

> 💡 **이 규칙은 Skills.md의 핵심 역할이다**
> 어떤 데이터가 들어오든 아래 UI 생성 규칙에 따라 대시보드가 **자동으로 구성**된다.
> Skills.md가 데이터를 분석하고, Skills.md가 UI를 결정한다. **모든 UI는 Skills.md 규칙에 의해 자동 생성된다.**

---

## 13-B. UI 자동 생성 규칙 — 데이터 조건 → UI 컴포넌트 매핑

> 🔑 **이 규칙은 Skills.md의 핵심 역할이다**
> 입력 데이터의 컬럼 구성·기간·품질에 따라 표시할 UI 컴포넌트가 자동으로 결정된다.
> **"이 데이터면 이 UI"** — 아래 매핑 테이블이 그 전부다. 하드코딩된 레이아웃은 없다.

### 13-B-1. 차트 타입 자동 결정

| 데이터 조건 | 표시 UI | 이유 |
|---|---|---|
| OHLC 4개 컬럼 + 60일+ | **캔들스틱 차트** | 완전한 가격 구조 표현 가능 |
| close만 있음 또는 30~59일 | **라인차트** | OHLC 없으면 캔들 불가 |
| 14일 미만 | **라인차트 (최소)** + 경고 배너 | 분석 불가 수준, 데이터 부족 안내 |
| volume 컬럼 있음 | 차트 하단 **거래량 서브패널** 추가 | 거래량 신호 시각화 |
| volume 없음 | 거래량 서브패널 **숨김** | 빈 패널 노출 방지 |

### 13-B-2. 판단 패널 구성 자동 결정

| 데이터 조건 | 표시 UI | 비고 |
|---|---|---|
| 60일+ (can_alpha=True) | **Alpha Score 게이지** (0~100 반원형) | Ridge 계산값 사용 |
| 60일 미만 (can_alpha=False) | Lite Alpha Score 게이지 + "Lite 추정값" 배지 | Ridge 대신 경량 모델 적용 |
| OHLC + ATR 계산 가능 | 리스크 카드: **ATR 손절/목표가** | 정밀 리스크 |
| close만, ATR 불가 | 리스크 카드: **2σ 손절 (rolling std)** + "OHLC 없음" 안내 | 대체 계산 명시 |
| foreign 컬럼 있음 | 수급 패널 **활성화** (스마트머니 방향) | |
| foreign 없음 | 수급 패널 **숨김** 또는 "수급 데이터 없음" 표시 | |

### 13-B-3. Tab 2 패널 활성/비활성 자동 결정

| 데이터 조건 | 표시 UI | 비고 |
|---|---|---|
| 252일+ (can_backtest=True) | **백테스트 바차트** (기간별 수익률) | Walk-forward 결과 |
| 252일 미만 | 백테스트 패널 **흐림 처리** (opacity 0.4) + 안내 | "252일+ 필요" 메시지 |
| 60일+ (can_feature=True) | **피처 기여도 가로 막대 6개** | 실제 Ridge 계수 기반 |
| 60일 미만 | 피처 기여도 **단순 비율 표시** + 경고 배지 | 폴백 계산 명시 |
| OHLCV + 60일+ (can_tp=True) | **TP 신호 이력 테이블** | 최근 10건 |
| can_tp=False | TP 이력 테이블 **숨김** | |
| \|corr\| ≥ 0.03 신호 존재 | 신호 검증 행: **✅ 초록** | 사용 가능 |
| \|corr\| < 0.03 | **❌ 빨강** + "신뢰도 낮음" | 경고 표시 |

### 13-B-3-A. 기능 축소 모드 (Graceful Degradation Mode)

> 🔑 시스템은 데이터 부족만으로 핵심 UI와 분석 흐름을 제거하지 않는다.
> 대신 현재 데이터 환경에서 가능한 수준까지 분석 기능을 자동 축소하여 유지한다.
>
> 즉, 기능 제거(disabled)가 기본 동작이 아니라, 경량 분석(lightweight mode) 전환이 기본 동작이다.
>
> 예시:
>
> - 252일 미만 → 전체 Walk-forward 백테스트 대신 단기 수익률 분석 표시
> - 60일 미만 → Ridge Alpha Score 대신 Lite Alpha Score 자동 전환
> - OHLC 부족 → 캔들 패턴 제거 후 라인 기반 추세 분석 유지
> - ATR 계산 불가 → rolling std 기반 리스크 카드 대체 출력
> - volume 없음 → 거래량 신호 제거 후 가격 기반 분석 유지
> - foreign/institutional 없음 → 수급 패널만 축소 비활성화
>
> UI는 빈 패널을 출력하지 않는다. 대신 다음과 같은 안내 문구와 함께 대체 분석 결과를 유지한다.
>
> - `"경량 분석 모드 활성"`
> - `"현재 데이터에서는 일부 고급 분석이 제한됨"`
> - `"데이터 부족 → Lite 모델 적용"`
>
> 시스템 규칙:
>
> ```text
> 데이터 부족은 분석 실패가 아니다.
> 시스템은 현재 데이터 환경에서 가능한 최대 수준의 분석 결과를 유지해야 한다.
> ```

### 13-B-4. Tab 3 시뮬레이터 슬라이더 자동 결정

| 데이터 조건 | 활성 슬라이더 | 비활성 슬라이더 |
|---|---|---|
| volume 있음 | 거래량 배율 슬라이더 **활성** | — |
| volume 없음 | 거래량 배율 슬라이더 **비활성 + 회색** | "거래량 데이터 없음" tooltip |
| foreign 있음 | 외국인 순매수 슬라이더 **활성** | — |
| foreign 없음 | 외국인 슬라이더 **비활성 + 회색** | "수급 데이터 없음" tooltip |
| vix 있음 | VIX 변화 슬라이더 **활성** | — |
| vix 없음 | VIX 슬라이더 **비활성 + 회색** | "VIX 데이터 없음" tooltip |
| 가격(close) 항상 있음 | 가격 변화율 슬라이더 **항상 활성** | — |

### 13-B-5. 데이터 품질 점수 → 헤더 배지 자동 결정

| 품질 점수 | 헤더 배지 색상 | 배지 텍스트 |
|---|---|---|
| 80점+ | 🟢 초록 | "신뢰 높음" |
| 60~79점 | 🟡 노랑 | "보통" |
| 40~59점 | 🟠 주황 | "낮음 — 결과 참고 수준" |
| 40점 미만 | 🔴 빨강 | "분석 제한 — 데이터 보강 필요" |

### 13-B-5-A. 분석 신뢰도 보정 시스템 (Confidence Adjustment Layer)

> 🔑 데이터 품질 점수는 단순 UI 배지가 아니라, 전체 분석 결과의 신뢰도를 보정하는 핵심 입력값이다.
>
> 시스템은 데이터 부족·강제 복구·컬럼 누락·기간 부족 여부를 기반으로 분석 신뢰도를 자동 조정한다.
>
> 예시:
>
> - 강제 컬럼 복구 적용 → 신뢰도 감점
> - Lite Alpha Score 사용 → 신뢰도 상한 제한
>
> Lite Alpha Score 제한 규칙:
>
> - Lite Alpha Score 사용 시 Confidence는 최대 MEDIUM까지만 허용한다.
> - 데이터 기간이 60일 미만이면 Strong Buy 액션은 출력하지 않는다.
> - Lite Alpha Score가 80점 이상이어도 최종 판단은 최대 Buy까지만 허용한다.
> - 강제 컬럼 복구와 Lite Alpha가 동시에 적용되면 Confidence는 LOW로 고정한다.
> - 252일 미만 → 백테스트 신뢰도 감점
> - volume 없음 → 거래량 기반 검증 제거
> - foreign 없음 → 수급 기반 판단 비활성화
>
> 신뢰도는 다음 3단계로 구분한다.
>
> - HIGH → 충분한 기간 + 주요 컬럼 존재 + 정식 Ridge 계산 완료
> - MEDIUM → 일부 기능 제한 또는 일부 컬럼 부족
> - LOW → Lite 분석 / 강제 복구 / 짧은 데이터 기반
>
> 신뢰도는 헤더 배지, Alpha Score 하단 설명, 최종 액션 문구, 경고 패널에 공통 반영된다.
>
> 예:
>
> ```text
> Alpha Score: 68
> Action: Buy
> Confidence: LOW
>
> 보정 사유:
> - 데이터 45일
> - Lite Alpha 사용
> - 거래량 데이터 없음
> ```
>
> 시스템 규칙:
>
> ```text
> 시스템은 분석 결과만 출력하지 않는다.
> 현재 분석이 얼마나 신뢰 가능한지도 반드시 함께 설명해야 한다.
> ```

### 13-B-6. 비교 분석 UI 자동 결정

| 조건 | 표시 UI |
|---|---|
| 두 번째 CSV 미업로드 | "CSV를 업로드하면 자동 비교합니다" 안내 + 업로드 버튼 |
| 두 번째 CSV 업로드 완료 | 레이더 차트 + 기준별 비교 테이블 5행 + 최종 승자 배너 |
| 두 데이터 기간 불일치 (2배 이상 차이) | "기간 차이 주의" 경고 배너 추가 |
| 두 데이터 모두 252일+ | 백테스트 승률까지 포함한 5개 기준 비교 |
| 어느 하나라도 252일 미만 | 백테스트 기준 제외, 4개 기준만 비교 |

> **요약: Skills.md가 데이터를 읽고, Skills.md가 UI를 그린다.**
> 위 매핑 테이블은 코드가 아니라 **규칙**이다. 어떤 CSV가 들어오든 이 규칙이 자동으로 적용된다.
> **모든 UI 생성은 Skills.md 규칙에 의해 자동 결정된다.**

---

## 13-B-V. UI 자동 생성 검증 흐름 — 실제 예시

> **이 섹션은 심사 검증용이다.**
> "어떤 입력이 들어오면 어떤 UI가 나오는가"를 실제 시나리오로 보여준다.
> Skills.md 규칙이 제대로 자동 생성되었는지 확인하는 기준이다.

### 시나리오 A — OHLCV + 300일 데이터 (삼성전자 1년치)

**입력 CSV 컬럼:** `날짜, 시가, 고가, 저가, 종가, 거래량, 외국인`

```
[파이프라인 실행]
1. detect_encoding()    → UTF-8 감지
2. detect_delimiter()   → 쉼표 감지
3. normalize_columns()  → 날짜→date, 시가→open, 고가→high, 저가→low,
                          종가→close (confidence=1.0), 거래량→volume, 외국인→foreign
4. prepareForPipeline() → n=300, has_ohlc=True, has_volume=True, has_supply=True
                          can_feature=True, can_regime=True, can_alpha=True,
                          can_backtest=True, can_tp=True
                          mode="full"
5. quality_score()      → 완전성38 + 기간27 + 이상치28 = 93점 → 🟢 신뢰 높음

[UI 자동 결정]
✅ 차트: 캔들스틱 (OHLC + 60일+)
✅ 게이지: SVG 반원형 Alpha Score (Ridge 계산값)
✅ 거래량 서브패널: 표시 (volume 있음)
✅ 수급 패널: 활성화 (foreign 있음)
✅ 리스크 카드: ATR 손절/목표가 (OHLC 있음)
✅ 백테스트 바차트: 활성 (252일+)
✅ 피처 기여도: 실제 Ridge 계수 기반 (60일+)
✅ TP 신호 이력: 표시 (can_tp=True)
✅ Tab 3 슬라이더: 가격·거래량·외국인 활성, VIX 비활성(vix 없음)
✅ 헤더 배지: 🟢 신뢰 높음
```

**판단 엔진 실행 예시:**
```
Alpha Score: 68점 → 기본 판단: Buy
레짐: 약세(0) → 3순위 보정: Buy → Neutral (약세 레짐)
충돌: TYPE-3 HIGH (RSI 과매수) → 4순위 보정: 이미 Neutral이므로 유지, 경고 기록
품질: 93점 → 정상 진행

──────────────────────────────────
최종 판단:  Neutral
Alpha Score: 68점
기본 판단:  Buy
보정 사유:
- 현재 약세 레짐 → Buy → Neutral 하향
- RSI 과매수 충돌 감지 (TYPE-3, HIGH)
- 데이터 품질 93점 — 신뢰 높음
권장 해석:
약세 레짐 주의. 레짐 전환 확인 후 진입 권고.
──────────────────────────────────
```

---

### 시나리오 B — close만 + 45일 데이터 (짧은 종가 데이터)

**입력 CSV 컬럼:** `Date, Close`

```
[파이프라인 실행]
1. normalize_columns()  → Date→date (confidence=1.0), Close→close (confidence=1.0)
2. prepareForPipeline() → n=45, has_ohlc=False, has_volume=False, has_supply=False
                          can_feature=False (60일 미만), can_regime=True
                          can_alpha_ridge=False, can_alpha_lite=True, can_backtest=False
                          mode="lite"
3. quality_score()      → 완전성40 + 기간12 + 이상치28 = 80점 → 🟡 보통

[UI 자동 결정]
✅ 차트: 라인차트 (close만, OHLC 없음)
⚠️ 게이지: Lite Alpha Score 게이지 + "Lite 분석 모드" 배지
❌ 거래량 서브패널: 숨김 (volume 없음)
❌ 수급 패널: 숨김 (foreign 없음)
⚠️ 리스크 카드: 2σ 손절 + "OHLC 없음" 안내
❌ 백테스트 패널: opacity:0.4 + "252일+ 필요" 오버레이
⚠️ 피처 기여도: Lite Alpha 내부 신호 강도 기반 상대 비율 표시
❌ TP 신호 이력: 숨김 (can_tp=False)
✅ Tab 3 슬라이더: 가격만 활성, 거래량·외국인·VIX 모두 회색 비활성
⚠️ 헤더 배지: 🟡 보통
```

**판단 엔진 실행 예시:**
```
Alpha Score: Lite Alpha Score 51점 → 산출 방식: Lite Alpha Score (경량 모델)
레짐: Lite Regime Engine(MA Slope 기반) → 횡보 → 보정 없음
충돌: 없음
품질: 80점 → 정상 분석 진행 (Alpha 계산은 Lite 모델 사용)

──────────────────────────────────
최종 판단:  Neutral
Alpha Score: Lite Alpha 51점
(경량 분석 모드 — 60일 미만 Lite 모델 적용)
기본 판단:  Neutral
보정 사유:
- 데이터 45일 — Lite 모델 기반 경량 분석 적용
- 데이터 품질 80점 — 보통
권장 해석:
뚜렷한 방향 없음. 관망이 적절.
──────────────────────────────────
```

---

### 시나리오 C — 컬럼명이 완전히 비표준 (col_0~col_4)

**입력 CSV 컬럼:** `col_0, col_1, col_2, col_3, col_4` (컬럼명 없는 raw 데이터)

```
[파이프라인 실행]
1. normalize_columns() 3단계 실행:
   - 1단계 완전 일치: 실패
   - 2단계 정규식: 실패
   - 3단계 값 추론:
     col_0 → mean=1705..., dtype=object → 날짜로 추론 → date (confidence=0.65)
     col_1 → mean=72000, min>0, cv<0.5 → close (confidence=0.65)
     col_2 → mean=73500, min>0 → open (confidence=0.65)
     col_3 → mean=74000 → high (confidence=0.65)
     col_4 → mean=71000 → low (confidence=0.65)

2. validate_normalization() → low_conf=['col_1','col_2','col_3','col_4']
   → UI 헤더에 "⚠️ 컬럼 자동 추론됨" 배지 표시

[UI 자동 결정]
⚠️ 모든 패널: confidence<0.7 경고 배지 포함
✅ 분석 자체는 OHLC가 추론됐으므로 캔들차트로 진행
```

> **이 3가지 시나리오가 "어떤 CSV든"의 실제 작동 방식을 보여준다.**
> Skills.md 규칙은 가능한 데이터로 최선의 분석을 하되, 불확실성은 항상 사용자에게 표시한다.

---

## 14. Tab 1 — 시장 분석 ("지금 사야 해?")

Tab 1은 사용자가 처음 보는 화면이다. 차트와 판단 결과가 동시에 보여야 하며, 스크롤 없이 핵심 정보를 파악할 수 있어야 한다.
**여기서 표시되는 모든 수치(Alpha Score, 레짐, 리스크)는 Skills.md 분석 엔진이 자동으로 계산한 결과다.**

### 14-1. 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  헤더: [Alpha Signal]  [Tab1] [Tab2] [Tab3]  [CSV]  │
├───────────────────────────────┬─────────────────────┤
│                               │  Alpha Score 게이지  │
│   메인 캔들차트               │  레짐 상태 카드      │
│   (MA50 색상분할 + TP마커)    │  리스크 카드         │
│                               │  인사이트 텍스트     │
│   ─────────────────────────── │  매매 액션 배지      │
│   거래량 서브패널             │                     │
├───────────────────────────────┴─────────────────────┤
│  기간: [1M][3M][6M][1Y][전체]   MA: [20][50][120]   │
└─────────────────────────────────────────────────────┘

비율: 차트 영역 70% / 판단 패널 30%
```

### 14-2. 메인 차트 구성

```
캔들스틱 (lightweight-charts)
  상승봉: #22d3ee (하늘색)
  하락봉: #f43f5e (분홍)

MA50 색상 분할 (세그먼트 방식)
  상승 구간: #3b82f6 (파란색)   — 5봉 slope > 0.002
  하락 구간: #ef4444 (빨간색)   — 5봉 slope < -0.002
  연속 3봉 확인 후 전환 (노이즈 필터)

TP 마커
  롱 TP: 초록 ▲ + "TP" (캔들 하단)
  숏 TP: 빨강 ▼ + "TP" (캔들 상단)

거래량 서브패널 (차트 높이의 20%)
  상승봉 거래량: rgba(34,211,238,0.5)
  하락봉 거래량: rgba(244,63,94,0.5)

레짐 배경색
  약세: rgba(239,68,68,0.04)
  횡보: rgba(148,163,184,0.03)
  강세: rgba(29,158,117,0.04)
```

### 14-3. 판단 패널 — Alpha Score 게이지

```
SVG 반원형 게이지 (0~100)
  80+: #22c55e  → "Strong Buy"
  60+: #3b82f6  → "Buy"
  40+: #eab308  → "Neutral"
  20+: #f97316  → "Caution"
   0+: #ef4444  → "Avoid"

점수 아래: 액션 레이블 (굵게, 큰 폰트)

반드시 computeAlphaScore().scores 마지막 유효값 사용.
단순 산술식 금지 (50 + MA괴리율 × 500 등).
```

### 14-4. 판단 패널 — 리스크 카드

```
손절가: XX,XXX원 (-N.N%)
목표가: XX,XXX원 (+N.N%)
RR비율: 2.0:1
Kelly 권고: N.N%

OHLC 없을 때: "2σ 손절 적용 중" 안내
```

### 14-5. 판단 패널 — 인사이트 텍스트

```
[액션 한 줄] — 굵게, 점수에 따른 색상
[주요 신호 근거 2줄] — |corr| 기준 상위 2개 신호
[리스크 1줄] — 손절/목표/Kelly 요약
[면책 조항] — 작게, 회색
```

---

## 15. Tab 2 — 신호 분석 ("왜 이 점수야?")

Tab 2는 Alpha Score의 근거를 보여주는 탭이다. 6개 피처 기여도, 신호 검증, 백테스트, TP 이력이 하나의 흐름으로 연결돼야 한다.

> 🔑 **이 규칙은 Skills.md의 핵심 역할이다**
> Tab 2에 표시되는 피처 기여도, 신호 상관계수, 백테스트 수치 — 모두 Skills.md의 분석 로직이 동적으로 계산한 값이다.
> 하드코딩된 수치는 단 하나도 없다. **모든 분석은 Skills.md 규칙에 의해 자동 생성된다.**

### 15-1. 레이아웃

```
┌──────────────┬──────────────┬──────────────┐
│ 피처 기여도  │  신호 검증   │  신호 충돌   │
│ 가로 막대    │  테이블 6행  │  충돌 목록   │
├──────────────┴──────────────┴──────────────┤
├──────────────────────┬──────────────────────┤
│   백테스트 결과      │   TP 신호 이력       │
│   기간별 수익률 바   │   최근 10건 테이블   │
└──────────────────────┴──────────────────────┘
```

### 15-2. 피처 기여도 차트

```
Chart.js 가로 막대 6개
데이터: computeAlphaScore().importance (실제 계산값)
CSV 교체 시 재계산 — 하드코딩 금지

색상: 기여도 높을수록 #3b82f6, 낮을수록 #334155
레이블: 한국어 (모멘텀/추세강도/RSI/거래량/수급신호/저변동성)
```

### 15-3. 신호 검증 테이블

```
컬럼: 신호 / 상관계수 / 방향 / 추세 / 사용가능

|corr| ≥ 0.03: ✅ 사용가능 (초록)
|corr| < 0.03:  ❌ 신뢰도 낮음 (빨강)

양수 상관계수: 초록 / 음수: 빨강
추세: "상승 중" / "횡보" / "하락 중"
```

### 15-4. 백테스트 결과

```
Chart.js 막대차트 (기간별 수익률)
  양수: #22c55e / 음수: #ef4444

하단 요약 4개:
  평균 수익률 / 승률 / 샤프비율 / 일관성

252일 미만:
  "⚠️ 백테스트 불가 — 252일+ 데이터 필요" 안내
  패널 흐림 처리 (opacity 0.4)
```

### 15-5. TP 신호 이력

```
최근 10건 테이블
컬럼: 날짜 / 추세 / 신호 / RSI / MA괴리율 / 액션

롱 TP 행: rgba(34,197,94,0.05) 배경
숏 TP 행: rgba(239,68,68,0.05) 배경

[전체 보기 N건] 버튼으로 최대 50건까지 펼치기
```

---

## 16. Tab 3 — 시뮬레이터 ("만약에?")

Tab 3은 사용자가 가설을 검증하는 공간이다. What-if와 비교 분석 두 섹션이 하나의 탭 안에 자연스럽게 이어진다.

> 🔑 **이 규칙은 Skills.md의 핵심 역할이다**
> 슬라이더 조작 시 점수 재계산 경로(가격 → 모멘텀 → Alpha Score), 활성화할 슬라이더 종류, 비교 분석 파이프라인 — 모두 Skills.md에 정의된 규칙이 자동으로 처리한다.

### 16-1. What-if 시뮬레이터 레이아웃

```
┌──────────────────┬────────────┬─────────────────────┐
│  슬라이더 4개    │ 점수 비교  │  시나리오 버튼 11개 │
│  가격변화율      │ 현재 → 시뮬│  [현재][+3%][+5%]   │
│  거래량배율      │  delta 표시│  [-3%][-5%]         │
│  외국인순매수    │  액션 변경 │  [거래량×2][×0.5]   │
│  VIX 변화        │  배너      │  [외국인+1000억]     │
│                  │            │  [VIX+10][최악][최적]│
└──────────────────┴────────────┴─────────────────────┘
```

### 16-2. 슬라이더 사양

```
가격 변화율:   -20% ~ +20%, 0.5% 단위
거래량 배율:   0.1× ~ 5.0×, 0.1 단위
외국인 순매수: -5000억 ~ +5000억, 100억 단위
VIX 변화:      -15pt ~ +15pt, 1pt 단위

조작 시 debounce 50ms → simulateScore() 재계산
```

### 16-3. delta 표시 규칙

```
delta > 0: +N점 (개선)  — #22c55e
delta < 0: -N점 (악화)  — #ef4444
delta = 0: 변화 없음    — #94a3b8

액션 변경 시: "⚠️ Buy → Neutral" 배너 3초 표시

window._baseScore 규칙:
  simulateScore() 내부: const base = window._baseScore ?? 50
  BASE_SCORE 하드코딩 상수 절대 금지
  fillScenarioBtns() 호출은 window._baseScore 설정 이후
```

### 16-4. 비교 분석

```
[📁 두 번째 CSV 업로드] 버튼

업로드 전: "CSV를 업로드하면 현재 종목과 자동 비교합니다" 안내

업로드 후 동일 파이프라인 실행:
  parseCSV → normalizeColumns → detect_types
  → handle_missing → build_features → fit_regime
  → compute_alpha_score → walk_forward_backtest

비교 결과 3가지:
  1. 레이더 차트 (Chart.js)
     5개 기준 정규화 0~1:
       Alpha Score / 샤프비율 / 백테스트 승률 / MDD / 품질점수
     두 종목 동시 표시 (파란선 vs 초록선)

  2. 기준별 비교 테이블 5행
     컬럼: 기준 / 종목A / 종목B / 승자

  3. 최종 승자 배너
     "종목A가 N:M으로 우세합니다"
```

---

## 17. 탭 간 데이터 흐름 및 공유 상태

```
window.addEventListener('load')
    ↓
[파이프라인 순서]
a. setupCSVUpload()
b. data = generateSampleData()       ← CSV 없을 때 기본값 (300일 샘플)
c. closes = data.map(d => d.close)
d. ma50, trends50 = computeMA + computeMATrend
e. rsi14 = computeRSI(closes)
f. atr14 = computeATR(data)
g. features = buildFeatures(data)
h. regimeResult = fitRegime(data)
i. {scores, importance} = computeAlphaScore(features, regime)
j. lastScore = scores 마지막 유효값
k. bt = walkForwardBacktest(data, scores)
l. signalCorrs = validateSignals(features, closes)
m. tpMarkers = detectTPSignals(data, ma50, trends50, rsi14, atr14)
n. lastF = features 마지막 유효 row
o. riskLevels = computeRiskLevels(lastClose, lastAtr, lastScore, regime)
p. conflicts = detectConflicts(lastF, lastScore, atrNorm, quality, regime)
q. insight = generateInsight({score, regime, risk, conflicts, signals, bt})
    ↓
window._appData = { 위 모든 결과 }  ← 3개 탭이 공유
window._baseScore = lastScore       ← What-if 기준값
    ↓
showTab(1)  ← Tab 1 lazy render
            ← Tab 2, 3은 탭 전환 시 최초 1회만 렌더링

CSV 업로드 이벤트:
  parseCSV → normalizeColumns → 전체 파이프라인 재실행
  → window._appData 갱신 → window._baseScore 갱신
  → 현재 탭 즉시 리렌더링
```

---

## 18. 인사이트 생성 규칙

> 🔑 **이 규칙은 Skills.md의 핵심 역할이다**
> "Strong Buy", "Caution", "Avoid" — 이 한 줄 판단은 사람이 쓴 것이 아니다.
> Skills.md의 인사이트 생성 로직이 Alpha Score·레짐·충돌·백테스트를 조합해 자동으로 생성한다.
> **모든 인사이트 텍스트는 Skills.md 규칙에 의해 자동 생성된다.**

```python
def generate_insight(result: dict) -> dict:
    """
    Alpha Score·레짐·신호·충돌·백테스트를 복합 분기해 인사이트를 생성한다.
    확정 표현 금지. 면책 조항 항상 마지막.
    충돌 HIGH 1건 이상이면 액션을 한 단계 강등한다.
    """
    score     = result.get("score", 50)
    regime    = result.get("regime", {})
    conflicts = result.get("conflicts", [])
    signals   = result.get("signals", [])
    risk      = result.get("risk", {})
    bt        = result.get("bt", {})

    # 1. 기본 액션 결정
    action = score_to_action(score)

    # 2. HIGH 충돌 시 강등
    high_cnt = sum(1 for c in conflicts if c.get("severity") == "HIGH")
    if high_cnt > 0 and action in ("Strong Buy", "Buy"):
        action   = "Caution (충돌 감지)"
        downgraded = True
    else:
        downgraded = False

    # 3. 유효 신호 상위 2개
    top2 = [s for s in signals if s.get("usable")][:2]
    sig_text = " / ".join(
        f"{s['signal']} ({s['corr']:+.3f}, {s['trend']})" for s in top2
    ) if top2 else "신뢰도 기준 충족 신호 없음"

    # 4. 백테스트 요약
    if "avg_return" in bt:
        bt_text = (f"백테스트: 평균 {bt['avg_return']:+.1f}% / "
                   f"승률 {bt['avg_win_rate']*100:.0f}% / "
                   f"샤프 {bt['avg_sharpe']:.2f}")
    else:
        bt_text = "백테스트 불가 (252일+ 필요)"

    # 5. 레짐 문장
    rl = regime.get("label", "—")
    rs = regime.get("stats", {}).get(regime.get("current",1), {})
    reg_text = (f"레짐: {rl} "
                f"(역사적 평균 수익률 {rs.get('avg_return',0)*100:+.1f}%)")

    # 6. 리스크 요약
    risk_text = (f"손절 {risk.get('stop_pct',0):.1f}% / "
                 f"목표 +{risk.get('target_pct',0):.1f}% / "
                 f"Kelly {risk.get('kelly_pct',0):.1f}%")

    return {
        "action_line":  (f"⚡ {action} — 원 점수 {score:.0f}점, HIGH충돌 {high_cnt}건 강등"
                         if downgraded else
                         f"{_action_emoji(action)} {action} — Alpha Score {score:.0f}점"),
        "regime_line":  reg_text,
        "signal_line":  f"주요 신호: {sig_text}",
        "bt_line":      bt_text,
        "risk_line":    risk_text,
        "conflict_line":(f"⚡ {conflicts[0]['label']} ({conflicts[0]['severity']}): "
                         f"{conflicts[0]['message']}" if conflicts else None),
        "disclaimer":   "※ 과거 성과가 미래 수익을 보장하지 않습니다. 투자 판단과 책임은 본인에게 있습니다.",
        "downgraded":   downgraded,
    }

def _action_emoji(action: str) -> str:
    return {"Strong Buy":"🟢","Buy":"🟢","Neutral":"🟡",
            "Caution":"🟠","Avoid":"🔴"}.get(action, "⚪")
```

---

## 19. MA 추세 + TP 신호 시스템

### 19-1. MA 추세 판정

```python
def compute_ma_trend(ma: list, slope_period: int = 5,
                     threshold: float = 0.002,
                     confirm_bars: int = 3) -> list:
    """
    MA의 N봉 기울기로 bull/bear/sideways를 판정한다.
    연속 confirm_bars봉 동일 방향이어야 전환 확정 (노이즈 필터).

    반환: ['bull'|'bear'|'sideways'] × n봉
    """
    n      = len(ma)
    trends = ['sideways'] * n
    cur    = 'sideways'
    count  = 0

    for i in range(slope_period, n):
        if ma[i] is None or ma[i - slope_period] is None:
            continue
        slope = (ma[i] - ma[i - slope_period]) / (abs(ma[i - slope_period]) + 1e-10)
        new_dir = 'bull' if slope > threshold else 'bear' if slope < -threshold else 'sideways'
        if new_dir == cur:
            count += 1
        else:
            count = 1
            cur   = new_dir
        if count >= confirm_bars:
            trends[i] = cur

    return trends
```

### 19-2. TP 신호 감지

```python
def detect_tp_signals(data: list, ma50: list, trends: list,
                      rsi14: list, atr14: list) -> list:
    """
    롱 TP: 상승 추세 + RSI < 35 + 로컬 저점 → 분할 매수 신호
    숏 TP: 하락 추세 + RSI > 65 + 로컬 고점 → 익절 청산 신호

    신호 유형:
      BUY         : 최초 롱 TP
      ADD         : 추가 롱 TP (최대 3회)
      TAKE_PROFIT : 숏 TP (익절 청산)
      STOP_LOSS   : 손절 트리거 (종가가 MA50 반대 방향으로 돌파)
    """
    markers = []
    lookback = 10
    buy_count = 0

    for i in range(lookback, len(data)):
        d     = data[i]
        trend = trends[i] if i < len(trends) else 'sideways'
        rsi   = rsi14[i]  if i < len(rsi14) and rsi14[i] is not None else 50
        atr   = atr14[i]  if i < len(atr14) and atr14[i] is not None else 0
        close = d['close']
        ma    = ma50[i] if i < len(ma50) and ma50[i] is not None else close

        local_lows  = [data[j]['low']  for j in range(i-lookback, i)
                       if 'low'  in data[j]]
        local_highs = [data[j]['high'] for j in range(i-lookback, i)
                       if 'high' in data[j]]

        # 롱 TP: 상승 추세 + RSI 과매도 + 로컬 저점
        if (trend == 'bull' and rsi < 35 and local_lows
                and close <= min(local_lows) * 1.005
                and abs(close - ma) / (ma + 1e-10) <= atr / (close + 1e-10)):
            sig_type = 'ADD' if buy_count > 0 and buy_count < 3 else 'BUY'
            buy_count = min(buy_count + 1, 3)
            markers.append({
                "time":    d['time'],
                "type":    sig_type,
                "action":  "🟢 분할 매수",
                "rsi":     round(rsi, 1),
                "ma_gap":  round((close - ma) / ma * 100, 2),
                "price":   close,
            })

        # 숏 TP: 하락 추세 + RSI 과매수 + 로컬 고점 → 익절
        elif (trend == 'bear' and rsi > 65 and local_highs
              and close >= max(local_highs) * 0.995):
            buy_count = 0
            markers.append({
                "time":    d['time'],
                "type":    "TAKE_PROFIT",
                "action":  "🔴 익절 청산",
                "rsi":     round(rsi, 1),
                "ma_gap":  round((close - ma) / ma * 100, 2),
                "price":   close,
            })

    return markers
```

---

## 20. What-if 시뮬레이터 민감도 설계

가격 1% 변화가 Alpha Score N점 변화로 이어지는 경로를 피처 편미분으로 유도한다.

```
[가격 변화율 p% → Alpha Score Δ]

경로 1 (모멘텀):
  pct_change(20) += p/100
  rolling_rank_pct 내 위치 변화 ≈ p × 0.5
  레짐=강세(weight=1.4) × direction(+1.0) = Δs_momentum

경로 2 (추세강도):
  (close-MA20)/MA20 += p/100
  clip(-0.1, 0.1) / 0.1 → Δtrend ≈ min(p/10, 1)
  레짐=강세(weight=1.2) × direction(+1.0) = Δs_trend

경로 3 (RSI):
  RSI는 1/14 평활화로 반응 느림
  Δrsi_norm ≈ p × 0.015
  direction(-0.5) → Δs_rsi ≈ p × 0.015 × (-0.5)

합산 (레짐=강세, 총가중치=7.4):
  Δs ≈ p × 1.8   ← 가격 1%당 +1.8점

거래량 배율 v배:
  Δs ≈ (v-1) × 3.5

외국인 순매수 F억원:
  Δs ≈ F × 14 / 5000

VIX 변화 V pt:
  |V| > 5pt: 레짐 전환 트리거
  V > 5:  약세 레짐 → Δs ≈ -(V-5) × 1.5
  V < -5: 강세 레짐 → Δs ≈ (-V-5) × 0.9
```

---

## 21. 비교 분석 모드

```python
def run_comparison(df_a: pd.DataFrame, name_a: str,
                   df_b: pd.DataFrame, name_b: str) -> dict:
    """
    두 데이터를 동일한 파이프라인으로 분석해 5개 기준으로 승자를 판정.
    Ridge 하이퍼파라미터·피처 계산 방식이 완전히 동일해야 공정한 비교.
    """
    results = {}
    for df, name in [(df_a, name_a), (df_b, name_b)]:
        features = build_features(df)
        regime   = fit_regime(df)["current"]
        alpha    = compute_alpha_score(features, df, regime)
        score    = float(alpha["scores"].dropna().iloc[-1])
        ret      = df["close"].pct_change().dropna()
        cum      = ret.cumsum()
        mdd      = float((cum - cum.cummax()).min())
        sharpe   = float(ret.mean() / (ret.std() + 1e-10) * 252**0.5)
        bt       = walk_forward_backtest(df, alpha["scores"])
        q        = quality_score(df, {})

        results[name] = {
            "alpha_score": round(score, 1),
            "sharpe":      round(sharpe, 2),
            "win_rate":    bt.get("avg_win_rate", 0) if "error" not in bt else 0,
            "mdd":         round(mdd, 4),
            "quality":     q["total"],
        }

    CRITERIA = [
        ("Alpha Score",  "alpha_score", True),
        ("샤프비율",      "sharpe",      True),
        ("백테스트 승률", "win_rate",    True),
        ("MDD",          "mdd",         False),
        ("데이터 품질",  "quality",     True),
    ]

    sa, sb   = 0, 0
    score_card = []
    ra, rb     = results[name_a], results[name_b]

    for label, key, higher_better in CRITERIA:
        va, vb = ra[key], rb[key]
        if abs(va - vb) < 0.01:
            verdict, winner = "동등", None
        elif (va > vb) == higher_better:
            verdict, winner = f"{name_a} 우세", name_a; sa += 1
        else:
            verdict, winner = f"{name_b} 우세", name_b; sb += 1
        score_card.append({"label":label,"value_a":va,"value_b":vb,
                            "verdict":verdict,"winner":winner})

    overall = name_a if sa > sb else name_b if sb > sa else None
    return {
        "results":    results,
        "score_card": score_card,
        "winner":     {"name": overall, "score_a": sa, "score_b": sb,
                       "verdict": (f"{overall}이(가) {max(sa,sb)}:{min(sa,sb)}로 우세합니다."
                                   if overall else "두 종목이 동등합니다.")},
    }
```

---

> **이 문서는 Alpha Signal Dashboard v3의 핵심 설계 명세서입니다.**
>
> **Skills.md는 규칙 문서다. 사람이 구현하는 것이 아니라, 이 문서가 구현을 생성한다.**
>
> 이 문서가 정의하는 핵심 계층:
> - Alpha Score = 결론
> - 레짐 = 시장 배경 (Alpha Score 보정)
> - 피처 = 점수 근거 (Alpha Score 원재료)
> - 신호 검증 = 신뢰도 (피처의 유효성 검사)
> - 리스크 = 실행 조건 (점수가 높아도 필요)
> - 백테스트 = 보조 근거 (과거 검증)
> - 시뮬레이터 = 탐색 기능 (What-if)
>
> **판단 엔진(Part 0)이 이 계층을 4단계 우선순위로 자동 적용해 최종 판단을 생성한다.**
>
> 인코딩 자동 감지 → 구분자 자동 감지 → 컬럼 3단계 정규화 → 유형 감지 → 결측치 처리 →
> 품질 진단 → 폴백 규칙 → 피처 계산 → Alpha Score → 판단 엔진 → UI 자동 생성
> 이 전체 흐름이 CSV 한 장으로 자동 실행됩니다.
>
> 🏆 **"문서 → 자동 생성" — 이것이 이 대회에서 Skills.md가 증명하는 것입니다.**
>
> *과거 성과가 미래를 보장하지 않습니다. 이 시스템은 투자 보조 도구입니다.*
