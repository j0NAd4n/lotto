# Seoul Sky — 모바일 드론 비행 시뮬레이터

휴대폰 브라우저에서 설치 없이 돌아가는 3D 비행 시뮬레이터. 무대는 **광화문·종로** 일대(OpenStreetMap 건물과 실제 지형 고도)입니다.

## 기체 (가상 기체, 실제 상표와 무관)
| 기체 | 급 | 비행 방식 |
|---|---|---|
| M-3 접이식 쿼드 | DJI 매빅급 촬영 드론 | GPS 속도 제어, 장애물 회피, 스포츠 모드 |
| R-5 레이싱 FPV | 5인치 FPV | Angle 모드, 쓰로틀 유지형 스틱 |
| A-6 헥사콥터 | 농업·방재용 대형 드론 | 무겁고 느린 GPS 비행 |
| RQ-S 소형 정찰기 | 레이븐급 고정익 | 양력·항력 모델, 실속 |
| HALE 고고도 무인기 | 글로벌호크급 | 둔한 조작, 30배 정찰 카메라 |

고정익은 기본으로 Fly-by-wire 보조가 켜져 있습니다(스틱 = 뱅크/상승각, 실속 보호). 끄면 수동 각속도 조종입니다.

## 조작 (Mode 2)
- **왼쪽 스틱**: 위/아래 = 쓰로틀, 좌/우 = 요
- **오른쪽 스틱**: 위/아래 = 피치, 좌/우 = 롤
- 스틱은 손가락을 댄 지점이 중심이 됩니다. 주황 테두리 = 놓아도 쓰로틀 유지.
- 키보드: W/S, A/D, 방향키, Space(이륙/착륙), C(시점), P(촬영), R/F(짐벌). 게임패드 지원.

## 모드
- 자유비행
- 미션: 촬영(광화문, 동상, 근정전, 궁궐), 북악산 등정, 청계천 저공 정찰, 세종대로 FPV 레이스, 고고도 감시
- 시점: 3인칭 추적 → 짐벌 카메라(FPV는 고글 시점) → 탑뷰

## 실행
정적 파일만 있으면 됩니다. 로컬에서는:
```
cd drone-sim && python3 -m http.server 8000
```
휴대폰으로 `http://<PC IP>:8000` 접속 → 가로 화면 → "홈 화면에 추가"하면 전체화면 앱처럼 실행됩니다.

## 데이터 다시 만들기
```
# 지형 (AWS Terrain Tiles, 공개 데이터)
python3 tools/build_terrain.py data/terrain.json /tmp/dem
# 건물·도로 (Overpass에서 받은 OSM JSON → 압축 포맷)
python3 tools/build_city.py seoul_osm.json data/city.json
```
`data/city.json`이 없으면 게임이 폰에서 직접 Overpass API로 데이터를 받아옵니다.

## 출처
- 지도 데이터 © OpenStreetMap contributors, ODbL
- 고도: Mapzen / AWS Terrain Tiles
- three.js (MIT), `vendor/`
