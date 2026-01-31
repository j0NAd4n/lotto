import streamlit as st
import random

# --- 1. 기본 설정 (화면 꽉 채우기) ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="wide")

# --- 2. CSS (접음/펼침 자동 감지) ---
st.markdown("""
<style>
    /* [공통 설정] 
       화면 크기와 상관없이 로또 번호판은 무조건 7칸 그리드 
    */
    div[data-baseweb="tab-panel"] [data-testid="stHorizontalBlock"] {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr) !important; /* 가로 7개 등분 */
        width: 100% !important;
        padding: 5px 0 !important;
    }

    /* 컬럼(칸) 설정: 내용물이 넘치지 않게 */
    div[data-baseweb="tab-panel"] [data-testid="column"] {
        width: auto !important;
        min-width: 0 !important;
        flex: unset !important;
        padding: 2px !important; /* 버튼 간격 조절 */
    }

    /* [버튼 디자인 핵심] 
       1. 동그라미 유지 (aspect-ratio: 1/1)
       2. 글자 세로 깨짐 방지 (white-space: nowrap)
    */
    div[data-baseweb="tab-panel"] button {
        width: 100% !important;
        aspect-ratio: 1 / 1 !important; /* 무조건 정사각형 비율 -> 동그라미 */
        border-radius: 50% !important;
        padding: 0 !important;
        margin: 0 !important;
        line-height: 1 !important;
        white-space: nowrap !important; /* 글자가 세로로 떨어지는 것 방지 (중요!) */
        
        /* 버튼 안의 Flex 정렬 */
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    /* ============================================================
       [반응형 처리] 화면 너비에 따라 글자 크기와 간격을 다르게!
       ============================================================ */

    /* 📱 1. 접었을 때 (화면 폭 600px 이하) */
    @media (max-width: 600px) {
        div[data-baseweb="tab-panel"] [data-testid="stHorizontalBlock"] {
            gap: 1px !important; /* 간격 촘촘하게 */
        }
        div[data-baseweb="tab-panel"] button {
            font-size: 12px !important; /* 글자 작게 */
        }
        /* 앱 여백 최소화 */
        .block-container {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
        }
    }

    /* 💻 2. 펼쳤을 때 (화면 폭 601px 이상) */
    @media (min-width: 601px) {
        div[data-baseweb="tab-panel"] [data-testid="stHorizontalBlock"] {
            gap: 8px !important; /* 간격 여유 있게 */
        }
        div[data-baseweb="tab-panel"] button {
            font-size: 18px !important; /* 글자 시원하게 */
            max-width: 60px !important;  /* 버튼이 너무 커지는 것 방지 (오이 현상 해결) */
            margin: 0 auto !important;   /* 중앙 정렬 */
        }
        /* 펼쳤을 땐 버튼이 너무 커지지 않게 컬럼 너비 제한 */
        div[data-baseweb="tab-panel"] [data-testid="column"] {
             display: flex;
             justify-content: center;
        }
    }

    /* 탭 메뉴 스타일 */
    .stTabs [data-baseweb="tab-list"] { 
        gap: 0px; 
        justify-content: space-evenly; /* 균등 배치 */
    }
    .stTabs [data-baseweb="tab"] {
        flex-grow: 1;
        text-align: center;
    }
</style>
""", unsafe_allow_html=True)

# --- 3. 세션 초기화 ---
if 'my_games' not in st.session_state:
    st.session_state.my_games = {i: set() for i in range(5)}

# --- 4. 로직 함수 ---
def toggle_number(game_idx, number):
    if number in st.session_state.my_games[game_idx]:
        st.session_state.my_games[game_idx].remove(number)
    else:
        if len(st.session_state.my_games[game_idx]) < 6:
            st.session_state.my_games[game_idx].add(number)

def render_lotto_paper(game_idx):
    numbers = list(range(1, 46))
    rows = [numbers[i:i+7] for i in range(0, len(numbers), 7)]
    
    for row_nums in rows:
        cols = st.columns(7)
        for idx, number in enumerate(row_nums):
            is_selected = number in st.session_state.my_games[game_idx]
            btn_type = "primary" if is_selected else "secondary"
            
            with cols[idx]:
                st.button(
                    str(number), 
                    key=f"btn_{game_idx}_{number}", 
                    type=btn_type,
                    on_click=toggle_number,
                    args=(game_idx, number)
                )

# --- 5. 메인 화면 ---
st.title("🎱 로또 패턴")

tabs = st.tabs(["A", "B", "C", "D", "E"])

for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)

st.divider()

# --- 6. 하단 버튼 ---
c1, c2 = st.columns([3, 1])

with c1:
    if st.button("🚫 제외하고 생성", type="primary", use_container_width=True):
        all_used = set()
        for i in range(5):
            all_used.update(st.session_state.my_games[i])
        
        remain = list(set(range(1, 46)) - all_used)
        
        if len(remain) < 6:
            st.error("숫자 부족")
        else:
            st.success(f"{len(remain)}개 남음")
            for k in range(5):
                nums = sorted(random.sample(remain, 6))
                st.code(f"{nums}", language="json")

with c2:
    if st.button("🔄", use_container_width=True): 
        st.session_state.my_games = {i: set() for i in range(5)}
        st.rerun()
