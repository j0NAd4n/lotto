import streamlit as st
import random

# --- 1. 기본 설정 ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="centered")

# --- 2. CSS (여기가 핵심입니다) ---
st.markdown("""
<style>
    /* [전략]
       "탭(Tab) 패널" 안에 있는 "가로 블록"만 타겟팅합니다.
       하단의 실행 버튼은 탭 밖에 있으므로 영향을 받지 않습니다.
    */
    div[data-baseweb="tab-panel"] [data-testid="stHorizontalBlock"] {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr) !important; /* 무조건 7등분 */
        gap: 2px !important;
        padding-bottom: 5px !important;
    }

    /* 탭 안에 있는 컬럼들의 너비 제한 해제 */
    div[data-baseweb="tab-panel"] [data-testid="column"] {
        width: auto !important;
        min-width: 0px !important; /* 이게 0이어야 좁은 화면에 구겨져 들어감 */
        flex: unset !important;
    }

    /* 탭 안에 있는 버튼 스타일링 (동그라미) */
    div[data-baseweb="tab-panel"] button {
        width: 100% !important;
        aspect-ratio: 1 / 1 !important; /* 정사각형 비율 유지 */
        border-radius: 50% !important;
        padding: 0px !important;
        margin: 0px !important;
        
        /* 폰트 크기: 화면 폭에 따라 자동 조절 (vmin 사용) */
        font-size: 3.5vmin !important; 
        line-height: 1 !important;
    }
    
    /* 전체 여백 줄이기 (폴드4 커버화면 공간 확보) */
    .block-container {
        padding-top: 2rem !important;
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
    }
    
    /* 탭 메뉴 글씨 작게 */
    .stTabs button {
        font-size: 0.8rem !important;
        padding: 0.5rem !important;
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
    # 번호판 생성
    numbers = list(range(1, 46))
    rows = [numbers[i:i+7] for i in range(0, len(numbers), 7)]
    
    for row_nums in rows:
        cols = st.columns(7) # 여기서 만들어진 컬럼들이 위 CSS의 영향을 받음
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

# 탭 구성 (이 안의 내용물만 CSS Grid가 적용됨)
tabs = st.tabs(["A", "B", "C", "D", "E"])

for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)

st.divider()

# --- 6. 하단 버튼 (탭 밖이므로 정상적인 컬럼 작동) ---
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
