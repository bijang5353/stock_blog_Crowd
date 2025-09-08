import * as nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      console.error('Email configuration missing. Email functionality limited.');
      console.error('Please set EMAIL_USER and EMAIL_PASSWORD in .env file.');
      return;
    }

    // Gmail 설정
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword // Gmail 앱 비밀번호 사용
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 연결 테스트
    this.transporter.verify()
      .then(() => {
        console.error('Email service ready');
      })
      .catch((error) => {
        console.error('Email configuration error:', error.message);
        console.error('Please check Gmail app password: https://support.google.com/accounts/answer/185833');
      });
  }

  async sendEmail(options: { to: string; subject: string; html: string }) {
    if (!this.transporter) {
      throw new Error('이메일 서비스가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }

    try {
      console.error(`📧 이메일 발송 중... 받는 사람: ${options.to}`);
      
      const mailOptions = {
        from: {
          name: '📈 주식 블로그 봇',
          address: process.env.EMAIL_USER!
        },
        to: options.to,
        subject: options.subject,
        html: this.enhanceEmailTemplate(options.html, options.subject)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.error('✅ 이메일 발송 성공:', result.messageId);
      console.error('📬 메일 미리보기:', nodemailer.getTestMessageUrl(result) || '미리보기 불가');
      
      return result;
    } catch (error) {
      console.error('❌ 이메일 발송 실패:', error);
      throw new Error(`이메일 발송 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private enhanceEmailTemplate(content: string, subject: string): string {
    const currentTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            background-color: #f5f7fa;
            padding: 20px;
          }
          .email-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 30px;
          }
          .blog-content {
            background: #f8fafc;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
            font-family: 'Malgun Gothic', sans-serif;
            line-height: 1.8;
          }
          .footer {
            background: #f1f5f9;
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #64748b;
          }
          .copy-instruction {
            background: #e0f2fe;
            border: 1px solid #0891b2;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          .copy-instruction strong {
            color: #0c4a6e;
          }
          .timestamp {
            font-size: 12px;
            color: #94a3b8;
            text-align: right;
            margin-top: 10px;
          }
          .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            margin: 15px 0;
            border-radius: 0 6px 6px 0;
            font-size: 13px;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📈 주식 블로그 자동 생성 완료!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">네이버 블로그 글이 준비되었습니다</p>
          </div>
          
          <div class="content">
            <div class="copy-instruction">
              <strong>📋 사용 방법</strong><br>
              아래 내용을 복사(Ctrl+A → Ctrl+C)해서 네이버 블로그에 바로 붙여넣기 하세요!
            </div>
            
            <div class="blog-content">
              ${content}
            </div>
            
            <div class="warning">
              <strong>⚠️ 투자 유의사항:</strong> 본 글은 정보 제공 목적이며, 투자 권유나 종목 추천이 아닙니다. 투자 책임은 투자자 본인에게 있습니다.
            </div>
            
            <div class="timestamp">
              📅 생성 시간: ${currentTime}
            </div>
          </div>
          
          <div class="footer">
            <p><strong>🤖 자동 생성 서비스</strong></p>
            <p>매일 자동으로 생성되는 주식 시장 분석 블로그입니다.</p>
            <p>📧 문의사항이 있으시면 이 이메일에 답장해주세요.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">
            <p style="font-size: 12px; color: #94a3b8;">
              이 이메일은 주식 블로그 자동화 MCP 서버에서 발송되었습니다.<br>
              수신을 원하지 않으시면 설정에서 스케줄러를 중지해주세요.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 테스트 이메일 발송 메서드
  async sendTestEmail(to: string = 'xo361@naver.com') {
    const testContent = `
      <h2>🧪 테스트 이메일</h2>
      <p>주식 블로그 MCP 서버가 정상적으로 작동하고 있습니다!</p>
      <ul>
        <li>✅ 이메일 발송 기능 정상</li>
        <li>✅ 템플릿 렌더링 정상</li>
        <li>✅ 한글 인코딩 정상</li>
      </ul>
      <p>이제 실제 블로그 글을 생성해보세요! 🚀</p>
    `;

    return await this.sendEmail({
      to,
      subject: '[테스트] 주식 블로그 MCP 서버 연결 확인',
      html: testContent
    });
  }

  // Gmail 앱 비밀번호 설정 가이드
  static getGmailSetupGuide(): string {
    return `
📧 Gmail 앱 비밀번호 설정 가이드:

1. Google 계정 관리 페이지로 이동
2. 보안 → 2단계 인증 활성화 (필수)
3. 앱 비밀번호 생성:
   - 앱 선택: 메일
   - 기기 선택: 기타 (사용자 지정 이름)
   - 이름 입력: "주식블로그MCP"
4. 생성된 16자리 비밀번호를 .env 파일에 입력
   EMAIL_PASSWORD=abcd efgh ijkl mnop

⚠️ 주의: 일반 Gmail 비밀번호가 아닌 앱 비밀번호를 사용해야 합니다!

🔗 상세 가이드: https://support.google.com/accounts/answer/185833
    `;
  }
}