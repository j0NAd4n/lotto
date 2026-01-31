import streamlit as st
import random

# --- 1. 기본 설정 ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="centered")

# --- 2. CSS (이 부분이 핵심입니다) ---
st.markdown("""
<style>
    /* [문제 해결의 핵심]
       복잡한 조건문(:has)을 다 지우고, 
       화면이 좁을 때(max-width: 768px) 무조건 가로로 정렬하라고 강제합니다.
    */
    @media (max-width: 768px) {
        /* 1. 모든 가로 배치 블록을 강제로 '가로(row)'로 고정 */
        div[data-testid="stHorizontalBlock"] {
            flex-direction: row !important;
            flex-wrap: nowrap !important;
        }

        /* 2. 모든 컬럼(칸)의 최소 너비 제한을 0으로 만듦 (그래야 7개가 들어감) */
        div[data-testid="column"] {
            flex: 1 1 auto !important;
            width: auto !important;
            min-width: 0px !important;
            padding: 0px 1px !important; /* 좌우 간격 1px */
        }

        /* 3. 버튼 크기 강제 조정 */
        button[kind="secondary"], button[kind="primary"] {
            padding: 0px !important;
            margin: 0px !important;
            height: auto !important;
            aspect-ratio: 1/1 !important; /* 정사각형 유지 */
            font-size: 10px !important;   /* 글자 크기 줄임 */
            line-height: 1 !important;
        }
        
        /* 4. 앱 좌우 여백 삭제 (공간 확보) */
        .block-container {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
        }
    }
    
    /* PC/큰 화면에서도 버튼 동그랗게 */
    div[data-testid="column"] button {
        border-radius: 50% !important;
        width: 100% !important;
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
    st.caption(f"Game {chr(65+game_idx)}")
    
    numbers = list(range(1, 46))
    rows = [numbers[i:i+7] for i in range(0, len(numbers), 7)]
    
    for row_nums in rows:
        # Streamlit 컬럼 7개 생성
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
st.write("좁은 화면에서도 가로로 나옵니다.")

tabs = st.tabs(["A", "B", "C", "D", "E"])

for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)

st.divider()

# --- 6. 하단 버튼 (여기도 가로로 나옵니다) ---
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
                st.code(str(sorted(random.sample(remain, 6))))

with c2:
    if st.button("🔄", use_container_width=True): # 버튼 이름 줄임
        st.session_state.my_games = {i: set() for i in range(5)}
        st.rerun()
