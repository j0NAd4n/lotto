# 로또 제외 생성기

수동으로 고른 A~E 번호를 **제외**하고, 남은 번호로 **1~5게임**만큼 로또 번호를 뽑는 앱입니다.

## 휴대폰에서 쓰는 가장 쉬운 방법 (Streamlit Cloud, 무료)

PC에서 서버를 켤 필요 없이 **링크 하나**로 폰에서 열 수 있습니다.

### 1단계: GitHub에 코드 올리기

이 저장소의 **main** �ranch에 최신 코드가 있어야 합니다.  
(예: Pull Request [#2](https://github.com/j0NAd4n/lotto/pull/2)를 **Merge**)

### 2단계: Streamlit Cloud에 배포

1. 브라우저에서 **[share.streamlit.io](https://share.streamlit.io/)** 를 엽니다.
2. **GitHub** 계정으로 로그인합니다.
3. **Create app** (또는 **New app**)을 누릅니다.
4. 아래처럼 입력합니다.

   | 항목 | 값 |
   |------|-----|
   | Repository | `j0NAd4n/lotto` |
   | Branch | `main` |
   | Main file path | `app.py` |

5. **Deploy**를 누릅니다. 1~2분 후 `https://xxxx.streamlit.app` 주소가 생깁니다.

### 3단계: 휴대폰에서 열기

1. 폰 브라우저(Chrome, Safari 등)에서 **배포 URL**을 엽니다.
2. (선택) **홈 화면에 추가**하면 앱처럼 쓸 수 있습니다.
   - **iPhone (Safari)**: 공유 → **홈 화면에 추가**
   - **Android (Chrome)**: 메뉴(⋮) → **홈 화면에 추가** 또는 **앱 설치**

이후에는 그 아이콘만 누르면 됩니다.

---

## 로컬에서 테스트 (선택)

```bash
pip install -r requirements.txt
streamlit run app.py
```

같은 Wi‑Fi의 휴대폰에서 `http://<PC의 IP>:8501` 로 접속할 수도 있지만, 설정이 더 번거롭습니다. **평소 사용은 Streamlit Cloud URL을 권장**합니다.
