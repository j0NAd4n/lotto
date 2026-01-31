import streamlit as st
import random

# --- 1. 페이지 설정 및 스타일 ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="centered")

# CSS로 버튼 간격 조절 (모바일에서 더 용지처럼 보이게)
st.markdown("""
<style>
    div[data-testid="column"] {
        width: fit-content !important;
        flex: 0 0 auto !important;
        padding: 0 2px !important;
    }
    div.stButton > button {
        width: 40px !important;  /* 버튼 너비 고정 */
        height: 40px !important; /* 버튼 높이 고정 */
        padding: 0px !important;
        border-radius: 50%;      /* 동그라미 모양 */
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# --- 2. 세션 상태 초기화 (선택한 번호 저장용) ---
if 'my_games' not in st.session_state:
    # 0~4번 게임(총 5게임)에 대해 각각 빈 집합(Set) 생성
    st.session_state.my_games = {i: set() for i in range(5)}

# --- 3. 함수 정의 ---

def toggle_number(game_idx, number):
    """버튼 클릭 시 번호를 넣거나 뺍니다."""
    if number in st.session_state.my_games[game_idx]:
        st.session_state.my_games[game_idx].remove(number)
    else:
        # 6개까지만 선택 가능하게 제한 (선택사항)
        if len(st.session_state.my_games[game_idx]) < 6:
            st.session_state.my_games[game_idx].add(number)
        else:
            st.toast("한 게임당 6개까지만 선택 가능합니다!", icon="⚠️")

def render_lotto_paper(game_idx):
    """7열 구조의 로또 용지 그리드를 그립니다."""
    st.caption(f"**Game {chr(65+game_idx)}** (현재 {len(st.session_state.my_games[game_idx])}개 선택)")
    
    # 로또 용지처럼 1~45 숫자를 배치
    numbers = list(range(1, 46))
    
    # 7개씩 끊어서 행(Row) 만들기
    rows = [numbers[i:i+7] for i in range(0, len(numbers), 7)]
    
    for row_nums in rows:
        cols = st.columns(7) # 7개의 열 생성
        for idx, number in enumerate(row_nums):
            is_selected = number in st.session_state.my_games[game_idx]
            
            # 선택되면 'primary'(붉은색/강조색), 아니면 'secondary'(회색)
            btn_type = "primary" if is_selected else "secondary"
            
            with cols[idx]:
                # 버튼 클릭 시 toggle_number 함수 실행
                st.button(
                    str(number), 
                    key=f"btn_{game_idx}_{number}", 
                    type=btn_type,
                    on_click=toggle_number,
                    args=(game_idx, number)
                )

# --- 4. 메인 화면 구성 ---
st.title("🎱 터치형 로또 반전기")
st.write("로또 용지처럼 **패턴을 보며** 번호를 찍으세요.")

# 탭을 사용하여 5게임을 구분 (모바일 스크롤 압박 해소)
tabs = st.tabs(["게임 A", "게임 B", "게임 C", "게임 D", "게임 E"])

for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)
        
        # 선택된 번호 텍스트로 보여주기
        selected = sorted(list(st.session_state.my_games[i]))
        if selected:
            st.success(f"선택 번호: {selected}")
        else:
            st.info("번호를 터치하여 선택하세요.")

st.divider()

# --- 5. 결과 생성 버튼 및 로직 ---
if st.button("🚫 제외하고 나머지로 돌리기! (Click)", type="primary", use_container_width=True):
    
    # 1. 사용된 모든 번호 수집
    all_used_numbers = set()
    for i in range(5):
        all_used_numbers.update(st.session_state.my_games[i])
    
    # 2. 제외 로직
    full_pool = set(range(1, 46))
    remaining_pool = list(full_pool - all_used_numbers)
    
    st.subheader("📊 결과 분석")
    st.write(f"내가 찍은 패턴에 포함된 번호: **{len(all_used_numbers)}개**")
    
    if len(remaining_pool) < 6:
        st.error(f"남은 번호가 {len(remaining_pool)}개 뿐이라 6개를 뽑을 수 없습니다. 선택을 좀 더 줄여보세요!")
    else:
        st.write(f"👉 생성 가능한 나머지 번호: **{len(remaining_pool)}개**")
        
        st.subheader("🎰 반전(Inverse) 추천 번호")
        for i in range(5):
            lucky_nums = sorted(random.sample(remaining_pool, 6))
            # 시각적으로 예쁘게 출력
            st.markdown(f"**자동 {i+1}:** " + " ".join([f"`{n}`" for n in lucky_nums]))

# 초기화 버튼
if st.button("🔄 모든 선택 지우기"):
    st.session_state.my_games = {i: set() for i in range(5)}
    st.rerun()
