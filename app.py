import streamlit as st
import random

# --- 1. 페이지 설정 및 스타일 (폴드4 커버 화면 대응) ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="centered")

st.markdown("""
<style>
    /* 1. 모바일(좁은 화면)에서도 강제로 가로 배열 유지 */
    div[data-testid="stHorizontalBlock"] {
        flex-direction: row !important; /* 세로 전환 방지 */
        flex-wrap: nowrap !important;   /* 줄바꿈 방지 */
        gap: 3px !important;            /* 컬럼 사이 간격 최소화 */
    }

    /* 2. 각 컬럼(숫자 칸)의 너비 강제 조정 */
    div[data-testid="column"] {
        flex: 1 1 0% !important;        /* 7개 등분 */
        width: auto !important;
        min-width: 20px !important;     /* 최소한의 클릭 영역 확보 */
        padding: 0 !important;          /* 패딩 제거 */
    }

    /* 3. 버튼 스타일: 반응형 크기 + 동그라미 */
    div[data-testid="column"] button {
        width: 100% !important;         /* 컬럼 너비에 꽉 차게 */
        aspect-ratio: 1 / 1 !important; /* 정사각형(1:1) 비율 유지 */
        border-radius: 50% !important;
        padding: 0 !important;
        margin: 0 !important;
        
        /* 폰트 크기 반응형으로 (화면이 작으면 글씨도 작게) */
        font-size: clamp(10px, 3.5vw, 16px) !important; 
        font-weight: bold;
        border: 1px solid #e0e0e0;
        
        /* 텍스트 정렬 */
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    /* 탭 메뉴 여백 줄이기 (모바일 공간 확보) */
    .stTabs [data-baseweb="tab-list"] {
        gap: 2px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 10px 10px;
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
            st.toast("한 게임당 6개까지만 선택 가능합니다!", icon="⚠️")

def render_lotto_paper(game_idx):
    count = len(st.session_state.my_games[game_idx])
    st.caption(f"**Game {chr(65+game_idx)}** ({count}/6)")
    
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

# --- 4. 메인 화면 ---
st.title("🎱 터치형 로또 반전기")
st.write("로또 용지처럼 **패턴을 보며** 번호를 찍으세요.")

tabs = st.tabs(["A게임", "B게임", "C게임", "D게임", "E게임"])

for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)
        selected = sorted(list(st.session_state.my_games[i]))
        if selected:
            st.info(f"선택: {selected}")
        else:
            st.write("")

st.divider()

# --- 5. 하단 버튼 ---
col_action1, col_action2 = st.columns([3, 1])

with col_action1:
    if st.button("🚫 제외하고 생성! (Click)", type="primary", use_container_width=True):
        all_used_numbers = set()
        for i in range(5):
            all_used_numbers.update(st.session_state.my_games[i])
        
        full_pool = set(range(1, 46))
        remaining_pool = list(full_pool - all_used_numbers)
        
        st.write("---")
        st.subheader("📊 결과")
        st.write(f"패턴 포함 번호: **{len(all_used_numbers)}개**")
        
        if len(remaining_pool) < 6:
            st.error(f"남은 번호 부족 ({len(remaining_pool)}개). 선택을 줄이세요.")
        else:
            st.success(f"생성 가능: **{len(remaining_pool)}개**")
            st.subheader("🎰 추천 번호")
            for i in range(5):
                lucky_nums = sorted(random.sample(remaining_pool, 6))
                st.code(f"자동 {i+1}:  {lucky_nums}", language="text")

with col_action2:
    if st.button("🔄 초기화", use_container_width=True):
        st.session_state.my_games = {i: set() for i in range(5)}
        st.rerun()
