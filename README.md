# Stock Blog MCP Server 📈

자동화된 주식 블로그 콘텐츠 생성 및 이메일 발송 시스템

## 🚀 주요 기능

- **실시간 주식 데이터 수집**: Yahoo Finance API를 통한 미국/한국 주식 데이터
- **AI 기반 블로그 생성**: 주식 데이터를 분석해서 자동으로 블로그 포스트 작성
- **자동 이메일 발송**: Gmail SMTP를 통한 일일 브리핑 메일 발송
- **스케줄링**: 매일 오전 9시, 평일 오후 6시 자동 실행
- **MCP 서버**: Claude와 연동 가능한 Model Context Protocol 서버

## 🏗️ 기술 스택

- **Runtime**: Node.js + TypeScript
- **스케줄링**: node-cron
- **데이터**: Yahoo Finance API
- **이메일**: Nodemailer (Gmail SMTP)
- **프로토콜**: MCP (Model Context Protocol)

## 🔧 환경 설정

Railway에서 다음 환경변수를 설정하세요:

```
NODE_ENV=production
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 📅 실행 스케줄

- **오전 브리핑**: 매일 오전 9:00 (한국시간)
- **저녁 시황**: 평일 오후 6:00 (한국시간)

## 🚀 Railway 배포

1. Railway 계정 생성: https://railway.app
2. GitHub 리포지토리 연결
3. 환경변수 설정
4. 자동 배포 완료!

## 📧 Gmail 설정

1. Google 계정에서 2단계 인증 활성화
2. 앱 비밀번호 생성
3. EMAIL_PASSWORD에 앱 비밀번호 사용