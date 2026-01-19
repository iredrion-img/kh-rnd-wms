# Kunhwa R&D WMS (통합 업무 관리 시스템)

Kunhwa R&D 센터의 업무 관리를 위한 웹 애플리케이션입니다.

## [다른 PC에서 설치 및 실행 방법]

### 1. 필수 프로그램 설치
이 프로그램을 실행하려면 **Node.js**와 **Git**이 설치되어 있어야 합니다.
- **Node.js**: [https://nodejs.org/](https://nodejs.org/) (LTS 버전 권장)
- **Git**: [https://git-scm.com/](https://git-scm.com/)

### 2. 소스 코드 가져오기 (Clone)
터미널(CMD 또는 PowerShell)을 열고 실행하려는 폴더로 이동하여 다음 명령어를 입력합니다.

```bash
git clone https://github.com/iredrion-img/kh-rnd-wms.git
cd kh-rnd-wms
```

### 3. 라이브러리 설치
다음 명령어를 입력하여 필요한 라이브러리를 설치합니다.

```bash
npm install
```

### 4. 빌드 (화면 생성)
화면 파일들을 생성하기 위해 빌드 명령어를 실행합니다.

```bash
npm run build
```

### 5. 프로그램 실행
**방법 A: 원클릭 실행 (추천)**
- 폴더 내의 **`Run_All.bat`** 파일을 더블 클릭하여 실행합니다.

**방법 B: 수동 실행**
```bash
node server.js
```
실행 후 브라우저에서 `http://localhost:3001`로 접속합니다.

---

## [폴더 구조 설명]
- **`src/`**: 화면 소스 코드 (React)
- **`server.js`**: 백엔드 서버
- **`public/`**: 이미지 및 정적 파일
- **`database.csv`**: 데이터 저장 파일
