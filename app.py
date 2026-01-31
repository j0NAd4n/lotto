import streamlit as st
import random

# --- 1. 페이지 설정 및 스타일 (폴드4 커버화면 Grid 강제 적용) ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="centered")

st.markdown("""
<style>
    /* [핵심] '7번째 컬럼'이 존재하는 블록(숫자판)만 감지하여 Grid로 강제 전환 */
    /* Flexbox가 아니라 Grid를 쓰면 화면 폭과 상관없이 무조건 7등분이 유지됩니다 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr) !important; /* 1fr = 균등 분할 */
        gap: 2px !important;        /* 버튼 사이 간격 */
        width: 100% !important;
        padding: 0 !important;
        overflow: hidden !important; /* 넘치는 것 방지 */
    }

    /* Grid 안의 컬럼(칸) 설정 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) div[data-testid="column"] {
        width: auto !important;
        min-width: 0 !important;    /* 중요: 최소 너비 제한을 없애야 좁은 화면에 들어감 */
        flex: unset !important;     /* Streamlit의 Flex 속성 무시 */
        padding: 0 !important;
    }

    /* 버튼 스타일 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) button {
        width: 100% !important;
        aspect-ratio: 1 / 1 !important; /* 정사각형 비율 유지 */
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 50% !important;
        
        /* 폰트 크기: 화면이 작으면 글자도 같이 작아지게 설정 (최소 8px) */
        font-size: clamp(8px, 3.5vw, 14px) !important; 
        font-weight: bold;
        line-height: 1 !important;
        border: 1px solid #e0e0e0;
    }
    
    /* 탭 메뉴 스타일 (좁은 화면용) */
    .stTabs [data-baseweb="tab-list"] { 
        gap: 4px; 
        flex-wrap: nowrap; /* 탭 메뉴 줄바꿈 방지 */
        overflow-x: auto;  /* 탭이 많으면 스크롤 */
    }
    .stTabs [data-baseweb="tab"] { 
        padding: 6px 10px; 
        font-size: 0.8rem;
    }
</style>
""", unsafe_allow_html=True)

# --- 2. 세션 상태 초기화 ---
if 'my_games' not in st.session_state:
    st.session_state.my_games = {i: set() for i in range(5)}

# --- 3. 로직 함수 ---
def toggle_number(game_idx, number):
    if number in st.session_state.my_games[game_idx]:
        st.session_state.my_games[game_idx].remove(number)
    else:
        if len(st.session_state.my_games[game_idx]) < 6:
            st.session_state.my_games[game_idx].add(number)
        else:
            st.toast("6개까지만 선택 가능!", icon="⚠️")

def render_lotto_paper(game_idx):
    count = len(st.session_state.my_games[game_idx])
    st.caption(f"**Game {chr(65+game_idx)}** ({count}/6)")
    
    numbers = list(range(1, 46))
    rows = [numbers[i:i+7] for i in range(0, len(numbers), 7)]
    
    for row_nums in rows:
        # Streamlit 컬럼 생성
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

# --- 4. 메인 화면 ---
st.title("🎱 터치형 로또 반전기")
st.write("패턴을 보며 번호를 찍으세요.")

tabs = st.tabs(["A게임", "B게임", "C게임", "D게임", "E게임"])

for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)
        selected = sorted(list(st.session_state.my_games[i]))
        if selected:
            # 선택된 번호를 작게 표시 (공간 절약)
            st.caption(f"선택: {selected}")
        else:
            st.write("") 

st.divider()

# --- 5. 하단 버튼 ---
# 여기는 2개짜리 컬럼이므로 위의 CSS Grid 영향을 받지 않습니다.
col_action1, col_action2 = st.columns([3, 1])

with col_action1:
    if st.button("🚫 제외하고 생성! (Click)", type="primary", use_container_width=True):
        all_used_numbers = set()
        for i in range(5):
            all_used_numbers.update(st.session_state.my_games[i])
        
        full_pool = set(range(1, 46))
        remaining_pool = list(full_pool - all_used_numbers)
        
        st.write("---")
        if len(remaining_pool) < 6:
            st.error(f"남은 번호 부족 ({len(remaining_pool)}개).")
        else:
            st.success(f"제외 후 남은 번호: **{len(remaining_pool)}개**")
            st.subheader("🎰 추천 번호")
            for i in range(5):
                lucky_nums = sorted(random.sample(remaining_pool, 6))
                st.code(f"자동 {i+1}:  {lucky_nums}", language="text")

with col_action2:
    if st.button("🔄 리셋", use_container_width=True):
        st.session_state.my_games = {i: set() for i in range(5)}
        st.rerun()
