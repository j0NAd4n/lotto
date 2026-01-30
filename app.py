import streamlit as st
import random

# 페이지 설정
st.set_page_config(page_title="로또 반전 생성기", page_icon="🎱")

st.title("🎱 로또 반전(Inverse) 전략")
st.write("내가 찍은 번호를 **제외한** 나머지 숫자로 5게임을 만듭니다.")

# 사이드바 혹은 메인 화면에서 입력 받기
with st.form("my_form"):
    st.write("### 1. 수동 번호 입력")
    st.info("각 게임을 줄바꿈으로 구분하고, 번호는 띄어쓰기로 입력하세요.")
    
    # 모바일에서 입력하기 편하게 텍스트 영역 사용 (기본값 예시 제공)
    default_text = "1 2 3 4 5 6\n7 8 9 10 11 12\n13 14 15 16 17 18\n19 20 21 22 23 24\n25 26 27 28 29 30"
    user_input = st.text_area("수동 5게임 입력창", value=default_text, height=150)
    
    submitted = st.form_submit_button("반전 번호 생성하기! 🎲")

if submitted:
    manual_games = []
    lines = user_input.strip().split('\n')
    
    # 입력 데이터 파싱
    valid_input = True
    used_numbers = set()
    
    for line in lines:
        try:
            parts = list(map(int, line.strip().split()))
            if len(parts) != 6:
                st.error(f"오류: 6개의 숫자가 아닌 줄이 있습니다 -> {line}")
                valid_input = False
                break
            # 범위 체크
            if any(n < 1 or n > 45 for n in parts):
                st.error("오류: 1~45 사이의 숫자만 가능합니다.")
                valid_input = False
                break
                
            manual_games.append(parts)
            used_numbers.update(parts)
        except ValueError:
            st.warning("숫자와 띄어쓰기, 줄바꿈만 입력해주세요.")
            valid_input = False
            break

    if valid_input:
        # 제외 로직 실행
        all_numbers = set(range(1, 46))
        remaining_pool = list(all_numbers - used_numbers)
        
        st.divider()
        st.write(f"📊 **분석 결과**")
        st.write(f"- 내가 찍은 고유 번호 개수: `{len(used_numbers)}개`")
        st.write(f"- 생성 가능한 나머지 번호 개수: `{len(remaining_pool)}개`")
        
        if len(remaining_pool) < 6:
            st.error("제외할 번호가 너무 많아 6개를 뽑을 수 없습니다!")
        else:
            st.success("🎉 생성된 반전(Inverse) 5게임")
            
            for i in range(5):
                recommendation = sorted(random.sample(remaining_pool, 6))
                # 보기 좋게 공 모양으로 출력 (Streamlit 마크다운 활용)
                st.subheader(f"Game {i+1}")
                st.code(str(recommendation).replace('[', '').replace(']', ''))
