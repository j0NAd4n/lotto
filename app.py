import streamlit as st
import random

# --- 1. 페이지 설정 및 스타일 (CSS 수정됨) ---
st.set_page_config(page_title="로또 패턴 반전기", page_icon="🎱", layout="centered")

st.markdown("""
<style>
    /* [수정 포인트] 모든 버튼이 아니라, '컬럼(열)' 안에 있는 버튼만 타겟팅합니다. */
    div[data-testid="column"] button {
        width: 40px !important;  /* 너비 고정 */
        height: 40px !important; /* 높이 고정 */
        padding: 0px !important;
        border-radius: 50% !important; /* 완전한 원형 */
        border: 1px solid #d0d0d0;     /* 테두리 살짝 */
        font-weight: bold;
    }

    /* 버튼이 눌렸을 때(active) 텍스트 색상 등 미세 조정 (선택사항) */
    div[data-testid="column"] button:active {
        background-color: #ff4b4b;
        color: white;
    }

    /* 숫자 버튼 간격을 좁혀서 로또 용지처럼 보이게 함 */
    div[data-testid="column"] {
        width: fit-content !important;
        flex: 0 0 auto !important;
        padding: 0 3px !important; /* 좌우 간격 */
    }
</style>
""", unsafe_allow_html=True)

# --- 2. 세션 상태 초기화 ---
if 'my_games' not in st.session_state:
    # 0~4번 게임(총 5게임)에 대해 각각 빈 집합(Set) 생성
    st.session_state.my_games = {i: set() for i in range(5)}

# --- 3. 로직 함수 ---
def toggle_number(game_idx, number):
    """버튼 클릭 시 번호를 넣거나 뺍니다."""
    if number in st.session_state.my_games[game_idx]:
        st.session_state.my_games[game_idx].remove(number)
    else:
        # 6개까지만 선택 가능
        if len(st.session_state.my_games[game_idx]) < 6:
            st.session_state.my_games[game_idx].add(number)
        else:
            st.toast("한 게임당 6개까지만 선택 가능합니다!", icon="⚠️")

def render_lotto_paper(game_idx):
    """7열 구조의 로또 용지 그리드를 그립니다."""
    # 현재 선택된 개수 표시
    count = len(st.session_state.my_games[game_idx])
    st.caption(f"**Game {chr(65+game_idx)}** ({count}/6)")
    
    # 1~45 숫자 생성
    numbers = list(range(1, 46))
    
    # 7개씩 끊어서 행(Row) 만들기 (로또 용지 포맷)
    rows = [numbers[i:i+7] for i in range(0, len(numbers), 7)]
    
    for row_nums in rows:
        cols = st.columns(7) # 7개의 열 생성
        for idx, number in enumerate(row_nums):
            is_selected = number in st.session_state.my_games[game_idx]
            
            # 선택되면 'primary'(붉은색/강조색), 아니면 'secondary'(회색)
            btn_type = "primary" if is_selected else "secondary"
            
            with cols[idx]:
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

# 탭 구성
tabs = st.tabs(["게임 A", "게임 B", "게임 C", "게임 D", "게임 E"])

for i, tab in enumerate(tabs):
    with tab:
        render_lotto_paper(i)
        
        # 선택된 번호 텍스트 확인
        selected = sorted(list(st.session_state.my_games[i]))
        if selected:
            st.info(f"선택 번호: {selected}")
        else:
            st.write("") # 공백 유지

st.divider()

# --- 5. 하단 액션 버튼 (이제 깨지지 않습니다) ---

# 버튼 컨테이너를 써서 조금 더 깔끔하게 정리
col_action1, col_action2 = st.columns([3, 1])

with col_action1:
    if st.button("🚫 제외하고 나머지로 돌리기! (Click)", type="primary", use_container_width=True):
        
        # 1. 사용된 모든 번호 수집
        all_used_numbers = set()
        for i in range(5):
            all_used_numbers.update(st.session_state.my_games[i])
        
        # 2. 제외 로직
        full_pool = set(range(1, 46))
        remaining_pool = list(full_pool - all_used_numbers)
        
        st.write("---")
        st.subheader("📊 결과 분석")
        st.write(f"내가 찍은 패턴에 포함된 번호: **{len(all_used_numbers)}개**")
        
        if len(remaining_pool) < 6:
            st.error(f"남은 번호가 {len(remaining_pool)}개 뿐이라 6개를 뽑을 수 없습니다. 선택을 좀 더 줄여보세요!")
        else:
            st.success(f"👉 생성 가능한 나머지 번호: **{len(remaining_pool)}개**")
            
            st.subheader("🎰 반전(Inverse) 추천 번호")
            for i in range(5):
                lucky_nums = sorted(random.sample(remaining_pool, 6))
                # 번호만 깔끔하게 출력
                st.code(f"자동 {i+1}:  {lucky_nums}", language="text")

with col_action2:
    if st.button("🔄 초기화", use_container_width=True):
        st.session_state.my_games = {i: set() for i in range(5)}
        st.rerun()
