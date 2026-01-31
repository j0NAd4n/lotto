import streamlit as st
import random

# --- 1. 페이지 설정 및 스타일 (폴드4 커버화면 완벽 대응) ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="centered")

st.markdown("""
<style>
    /* [핵심] 7개짜리 컬럼이 있는 줄만 감지해서 '강제 그리드' 적용 */
    /* :has() 선택자는 최신 브라우저(크롬, 삼성인터넷 등)에서 작동합니다 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) {
        display: grid !important;
        grid-template-columns: repeat(7, 1fr) !important; /* 무조건 7등분 */
        gap: 2px !important;        /* 간격 최소화 */
        flex-direction: row !important; /* 세로 정렬 방지 */
        flex-wrap: nowrap !important;   /* 줄바꿈 방지 */
    }

    /* 7개짜리 그리드 안의 컬럼 스타일 초기화 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) div[data-testid="column"] {
        width: auto !important;
        flex: 1 1 0 !important;
        min-width: 0 !important;    /* 내용물이 커도 강제로 줄임 (중요) */
        padding: 0 !important;
    }

    /* 버튼 스타일: 좁은 화면에 맞춰 꽉 채우기 */
    div[data-testid="stHorizontalBlock"]:has(div[data-testid="column"]:nth-child(7)) button {
        width: 100% !important;
        aspect-ratio: 1 / 1 !important; /* 정사각 비율 유지 -> 동그라미 */
        padding: 0 !important;          /* 내부 여백 제거 */
        margin: 0 !important;
        border-radius: 50% !important;
        
        /* 글자 크기: 화면 폭에 따라 자동 조절 (작은 화면에선 글자도 작게) */
        font-size: clamp(8px, 3.5vw, 16px) !important; 
        font-weight: bold;
        line-height: 1 !important;      /* 수직 정렬 보정 */
        border: 1px solid #e0e0e0;
    }
    
    /* 탭 메뉴 여백 줄이기 */
    .stTabs [data-baseweb="tab-list"] { gap: 4px; }
    .stTabs [data-baseweb="tab"] { padding: 5px 10px; font-size: 0.9rem; }
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
            st.info(f"선택: {selected}")
        else:
            st.write("") # 공간 유지

st.divider()

# --- 5. 하단 버튼 (이 부분은 그리드 적용 안 받음) ---
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
