import streamlit as st
import random

# --- 1. 페이지 설정: "Wide" 모드로 설정하여 공간 확보 ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="wide")

st.markdown("""
<style>
    /* [1] 앱 전체 좌우 여백 제거 (폴드4 좁은 화면 공간 확보) */
    .block-container {
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
        padding-top: 2rem !important;
        max-width: 100% !important;
    }

    /* [2] 숫자판(7칸) 감지 및 강제 가로 정렬 */
    /* 7번째 컬럼이 있는 줄을 찾아서 강제로 스타일 주입 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        gap: 1px !important;  /* 버튼 사이 간격 1px로 최소화 */
        width: 100% !important;
    }

    /* [3] 숫자판의 각 컬럼(칸) 스타일 강제 조정 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) div[data-testid="column"] {
        flex: 0 0 14.28% !important; /* 100% / 7 = 14.28% 강제 고정 */
        width: 14.28% !important;    /* 모바일에서 width: 100%로 바뀌는 것 방지 */
        min-width: 0px !important;   /* 최소 너비 제한 해제 (가장 중요) */
        padding: 0 !important;
        margin: 0 !important;
    }

    /* [4] 버튼 디자인: 여백 없애고 꽉 채우기 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) button {
        width: 95% !important;       /* 옆 버튼이랑 안 붙게 살짝 줄임 */
        aspect-ratio: 1 / 1 !important; 
        padding: 0 !important;
        margin: 0 auto !important;   /* 중앙 정렬 */
        border-radius: 50% !important;
        
        /* 폰트 크기: 화면 폭에 따라 자동 조절 (폴드 커버화면 맞춤) */
        font-size: clamp(10px, 3vw, 16px) !important; 
        font-weight: bold;
        line-height: 1 !important;
        border: 1px solid #ccc;
        background-color: transparent; /* 기본 배경 투명 */
    }

    /* 버튼 선택되었을 때 색상 (Primary) */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) button:focus:not(:active),
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) button:hover {
        border-color: #ff4b4b;
        color: #ff4b4b;
    }
    
    /* 탭 메뉴 스타일 간소화 */
    .stTabs [data-baseweb="tab-list"] { 
        gap: 0px; 
        justify-content: space-between;
    }
    .stTabs [data-baseweb="tab"] { 
        padding: 10px 0px; 
        flex-grow: 1; /* 탭 버튼 꽉 채우기 */
        font-size: 0.8rem;
        text-align: center;
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

def render_lotto_paper(game_idx):
    # 상단 캡션 삭제 (공간 확보)
    # 숫자 버튼 배치
    numbers = list(range(1, 46))
    rows = [numbers[i:i+7] for i in range(0, len(numbers), 7)]
    
    for row_nums in rows:
        cols = st.columns(7) # 7개 컬럼 생성
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
st.title("🎱 로또 패턴")
# 탭 구성
tabs = st.tabs(["A", "B", "C", "D", "E"]) # 탭 이름 줄여서 한 줄에 나오게

for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)
        selected = sorted(list(st.session_state.my_games[i]))
        if selected:
            st.caption(f"선택: {selected}") # 작게 표시
        else:
            st.write("") 

st.divider()

# --- 5. 하단 버튼 (이 부분은 그리드 영향 안 받음) ---
col_action1, col_action2 = st.columns([2.5, 1]) # 비율 조정

with col_action1:
    if st.button("🚫 제외하고 생성", type="primary", use_container_width=True):
        all_used_numbers = set()
        for i in range(5):
            all_used_numbers.update(st.session_state.my_games[i])
        
        full_pool = set(range(1, 46))
        remaining_pool = list(full_pool - all_used_numbers)
        
        if len(remaining_pool) < 6:
            st.error("숫자 부족!")
        else:
            st.success(f"남은번호: {len(remaining_pool)}개")
            for i in range(5):
                lucky_nums = sorted(random.sample(remaining_pool, 6))
                # 결과도 좁은 화면 고려해 텍스트로 깔끔하게
                st.text(f"게임 {i+1}: {lucky_nums}")

with col_action2:
    if st.button("🔄 리셋", use_container_width=True):
        st.session_state.my_games = {i: set() for i in range(5)}
        st.rerun()
