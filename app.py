import random

import streamlit as st

# --- 기본 설정 ---
st.set_page_config(
    page_title="로또 제외 생성기",
    page_icon="🎱",
    layout="centered",
    initial_sidebar_state="collapsed",
)

MAX_MANUAL_GAMES = 5
NUMBERS_PER_GAME = 6
LOTTO_MIN = 1
LOTTO_MAX = 45
MAX_PURCHASE_GAMES = 5


def lotto_ball_color(n: int) -> str:
    if n <= 10:
        return "#FBC400"
    if n <= 20:
        return "#69C8F2"
    if n <= 30:
        return "#FF7272"
    if n <= 40:
        return "#AAAAAA"
    return "#B0D840"


def toggle_number(game_idx: int, number: int) -> None:
    selected = st.session_state.my_games[game_idx]
    if number in selected:
        selected.remove(number)
    elif len(selected) < NUMBERS_PER_GAME:
        selected.add(number)


def all_excluded_numbers() -> set[int]:
    used: set[int] = set()
    for i in range(MAX_MANUAL_GAMES):
        used.update(st.session_state.my_games[i])
    return used


def remaining_pool(excluded: set[int]) -> list[int]:
    return [n for n in range(LOTTO_MIN, LOTTO_MAX + 1) if n not in excluded]


def generate_games(pool: list[int], count: int) -> list[list[int]]:
    if len(pool) < NUMBERS_PER_GAME:
        return []
    return [sorted(random.sample(pool, NUMBERS_PER_GAME)) for _ in range(count)]


def balls_html(numbers: list[int]) -> str:
    parts = []
    for n in numbers:
        bg = lotto_ball_color(n)
        parts.append(
            f'<span class="ball" style="background:{bg};">{n}</span>'
        )
    return "".join(parts)


# --- CSS: 모바일 우선, 큰 터치 영역 ---
st.markdown(
    """
<style>
    /* 사이드바·상단 여백 줄이기 */
    [data-testid="stSidebar"] { display: none; }
    .block-container {
        padding-top: 1rem !important;
        padding-bottom: 2rem !important;
        max-width: 480px !important;
    }

    h1 { font-size: 1.45rem !important; line-height: 1.3 !important; }
    .subtle {
        color: #6b7280;
        font-size: 0.92rem;
        margin-bottom: 0.75rem;
    }

    /* 번호판: 7열 그리드, 버튼 크게 */
    div[data-baseweb="tab-panel"] [data-testid="stHorizontalBlock"] {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr) !important;
        gap: 6px !important;
        width: 100% !important;
    }
    div[data-baseweb="tab-panel"] [data-testid="column"] {
        width: auto !important;
        min-width: 0 !important;
        flex: unset !important;
        padding: 0 !important;
    }
    div[data-baseweb="tab-panel"] button {
        width: 100% !important;
        min-height: 44px !important;
        aspect-ratio: 1 / 1 !important;
        max-height: 52px !important;
        border-radius: 50% !important;
        padding: 0 !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
    }

    @media (max-width: 380px) {
        div[data-baseweb="tab-panel"] button {
            font-size: 13px !important;
            min-height: 40px !important;
        }
    }

    @media (min-width: 481px) {
        div[data-baseweb="tab-panel"] button {
            max-width: 52px !important;
            margin: 0 auto !important;
        }
    }

    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
    }
    .stTabs [data-baseweb="tab"] {
        flex-grow: 1;
        justify-content: center;
        padding: 8px 4px !important;
        font-size: 0.95rem !important;
    }

    /* 생성 결과 */
    .game-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 12px 14px;
        margin-bottom: 10px;
    }
    .game-label {
        font-size: 0.8rem;
        font-weight: 700;
        color: #64748b;
        margin-bottom: 8px;
    }
    .ball-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: center;
    }
    .ball {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        color: #1a1a1a;
        font-weight: 800;
        font-size: 16px;
        box-shadow: inset 0 -2px 0 rgba(0,0,0,0.12);
    }

    div[data-testid="stRadio"] > div {
        flex-direction: row !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
    }
    div[data-testid="stRadio"] label {
        background: #f1f5f9 !important;
        border-radius: 12px !important;
        padding: 10px 16px !important;
        min-width: 52px;
        justify-content: center !important;
    }
</style>
""",
    unsafe_allow_html=True,
)

# --- 세션 ---
if "my_games" not in st.session_state:
    st.session_state.my_games = {i: set() for i in range(MAX_MANUAL_GAMES)}
if "generated" not in st.session_state:
    st.session_state.generated = []
if "purchase_count" not in st.session_state:
    st.session_state.purchase_count = 1


def render_lotto_paper(game_idx: int) -> None:
    numbers = list(range(LOTTO_MIN, LOTTO_MAX + 1))
    rows = [numbers[i : i + 7] for i in range(0, len(numbers), 7)]
    picked = st.session_state.my_games[game_idx]
    st.caption(f"{len(picked)}/{NUMBERS_PER_GAME}개 선택 (수동으로 살 번호)")

    for row_nums in rows:
        cols = st.columns(7)
        for idx, number in enumerate(row_nums):
            is_selected = number in picked
            with cols[idx]:
                st.button(
                    str(number),
                    key=f"btn_{game_idx}_{number}",
                    type="primary" if is_selected else "secondary",
                    on_click=toggle_number,
                    args=(game_idx, number),
                    use_container_width=True,
                )


# --- UI ---
st.title("🎱 로또 제외 생성기")
st.markdown(
    '<p class="subtle">수동으로 고른 5게임 번호를 입력한 뒤, '
    "그 번호를 <b>제외</b>하고 남은 번호로 구매할 게임만큼 추출합니다.</p>",
    unsafe_allow_html=True,
)

excluded = all_excluded_numbers()
remain = remaining_pool(excluded)

info_col1, info_col2 = st.columns(2)
with info_col1:
    st.metric("제외 번호", f"{len(excluded)}개")
with info_col2:
    st.metric("남은 번호", f"{len(remain)}개")

st.markdown("#### 1. 수동 구매 번호 (A~E)")
tabs = st.tabs(["A", "B", "C", "D", "E"])
for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)

st.divider()
st.markdown("#### 2. 구매할 게임 수")
st.caption("한 번에 최대 5게임까지 구매할 수 있습니다.")

purchase_count = st.radio(
    "게임 수",
    options=list(range(1, MAX_PURCHASE_GAMES + 1)),
    format_func=lambda x: f"{x}게임",
    horizontal=True,
    index=st.session_state.purchase_count - 1,
    label_visibility="collapsed",
)
st.session_state.purchase_count = purchase_count

st.divider()

btn_col1, btn_col2 = st.columns([2, 1])
with btn_col1:
    generate_clicked = st.button(
        "🎲 제외하고 번호 생성",
        type="primary",
        use_container_width=True,
    )
with btn_col2:
    if st.button("🔄 초기화", use_container_width=True):
        st.session_state.my_games = {i: set() for i in range(MAX_MANUAL_GAMES)}
        st.session_state.generated = []
        st.rerun()

if generate_clicked:
    if len(remain) < NUMBERS_PER_GAME:
        st.error(
            f"남은 번호가 {len(remain)}개입니다. "
            f"게임 1개당 {NUMBERS_PER_GAME}개 이상 필요합니다."
        )
        st.session_state.generated = []
    else:
        st.session_state.generated = generate_games(remain, purchase_count)
        st.rerun()

if st.session_state.generated:
    if len(st.session_state.generated) != purchase_count:
        st.info("게임 수를 변경했습니다. 「제외하고 번호 생성」을 다시 눌러 주세요.")
    else:
        st.markdown("#### 3. 생성된 번호")
        st.success(f"제외 {len(excluded)}개 · {purchase_count}게임 생성")
        for idx, nums in enumerate(st.session_state.generated, start=1):
            st.markdown(
                f'<div class="game-card">'
                f'<div class="game-label">{idx}게임</div>'
                f'<div class="ball-row">{balls_html(nums)}</div>'
                f"</div>",
                unsafe_allow_html=True,
            )
        plain = "\n".join(
            f"{i}게임: {', '.join(map(str, g))}"
            for i, g in enumerate(st.session_state.generated, start=1)
        )
        st.download_button(
            "📋 텍스트로 저장",
            data=plain,
            file_name="lotto_numbers.txt",
            mime="text/plain",
            use_container_width=True,
        )
