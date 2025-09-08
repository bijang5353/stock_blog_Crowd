import cron from 'node-cron';
import { StockDataService } from './services/stockData.js';
import { BlogGenerator } from './services/blogGenerator.js';
import { EmailService } from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

export class StockBlogScheduler {
  private stockDataService: StockDataService;
  private blogGenerator: BlogGenerator;
  private emailService: EmailService;
  private isRunning: boolean = false;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.stockDataService = new StockDataService();
    this.blogGenerator = new BlogGenerator();
    this.emailService = new EmailService();
  }

  start() {
    console.log('🤖 주식 블로그 자동화 스케줄러를 시작합니다...');
    
    // 매일 오전 9시에 실행 (한국시간 기준)
    const dailyJob = cron.schedule('0 9 * * *', async () => {
      await this.runDailyBlogGeneration();
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // 개발/테스트용: 매 30분마다 실행
    const testJob = cron.schedule('*/30 * * * *', async () => {
      console.log('🧪 테스트 모드: 30분마다 블로그 생성');
      await this.runDailyBlogGeneration();
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // 평일 오후 6시에 마감 시황 블로그 생성
    const eveningJob = cron.schedule('0 18 * * 1-5', async () => {
      console.log('🌆 장 마감 후 시황 분석 블로그 생성');
      await this.runEveningBlogGeneration();
    }, {
      scheduled: false,
      timezone: "Asia/Seoul"
    });

    // 환경에 따라 다른 스케줄 활성화
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 개발 모드: 테스트 스케줄 활성화 (30분마다)');
      testJob.start();
      this.jobs.set('test', testJob);
    } else {
      console.log('🏭 운영 모드: 일일 스케줄 활성화 (매일 오전 9시, 평일 오후 6시)');
      dailyJob.start();
      eveningJob.start();
      this.jobs.set('daily', dailyJob);
      this.jobs.set('evening', eveningJob);
    }

    this.isRunning = true;
    console.log('✅ 스케줄러가 성공적으로 시작되었습니다!');
    console.log('📅 다음 실행 시간을 확인하세요:');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('   🧪 테스트: 매 30분마다');
    } else {
      console.log('   🌅 아침 브리핑: 매일 오전 9시');
      console.log('   🌆 저녁 시황: 평일 오후 6시');
    }

    // 프로세스 종료 시 정리
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });

    return this;
  }

  stop() {
    console.log('🛑 스케줄러를 중지합니다...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`   ❌ ${name} 스케줄 중지`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ 스케줄러가 안전하게 중지되었습니다.');
  }

  async runDailyBlogGeneration() {
    try {
      console.log('\n🚀 일일 주식 블로그 생성을 시작합니다...');
      console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
      
      // 블로그 생성
      const blogContent = await this.blogGenerator.generateDailyBlogPost();
      console.log(`📝 블로그 생성 완료: "${blogContent.title}"`);
      
      // 이메일 발송 (HTML 형식 사용)
      await this.emailService.sendEmail({
        to: 'xo361@naver.com',
        subject: `[일일 주식 브리핑] ${blogContent.title}`,
        html: blogContent.htmlContent || blogContent.content
      });

      console.log('✅ 일일 블로그 생성 및 이메일 발송 완료!');
      console.log(`⏰ 완료 시간: ${new Date().toLocaleString('ko-KR')}\n`);
      
      // 성공 로그 저장
      this.logSuccess('daily', blogContent.title);
      
    } catch (error) {
      console.error('❌ 일일 블로그 생성 중 오류 발생:', error);
      
      // 오류 알림 이메일 발송
      await this.sendErrorNotification('일일 블로그 생성', error);
      
      // 실패 로그 저장
      this.logError('daily', error);
    }
  }

  async runEveningBlogGeneration() {
    try {
      console.log('\n🌆 저녁 시황 블로그 생성을 시작합니다...');
      console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
      
      // 저녁 시황용 블로그 생성
      const blogContent = await this.blogGenerator.generateDailyBlogPost();
      
      // 제목을 저녁 시황용으로 수정
      const eveningTitle = blogContent.title.replace('주식시장', '장 마감 후 시황');
      
      await this.emailService.sendEmail({
        to: 'xo361@naver.com',
        subject: `[장 마감 시황] ${eveningTitle}`,
        html: blogContent.htmlContent || blogContent.content
      });

      console.log('✅ 저녁 시황 블로그 생성 및 이메일 발송 완료!');
      console.log(`⏰ 완료 시간: ${new Date().toLocaleString('ko-KR')}\n`);
      
      this.logSuccess('evening', eveningTitle);
      
    } catch (error) {
      console.error('❌ 저녁 시황 블로그 생성 중 오류 발생:', error);
      await this.sendErrorNotification('저녁 시황 블로그 생성', error);
      this.logError('evening', error);
    }
  }

  async sendErrorNotification(taskName: string, error: any) {
    try {
      const errorContent = `
        <h2>🚨 오류 발생 알림</h2>
        <p><strong>작업:</strong> ${taskName}</p>
        <p><strong>발생 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
        <p><strong>오류 내용:</strong></p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">
${error.message || error.toString()}
        </pre>
        <p>서버 로그를 확인하여 문제를 해결해주세요.</p>
      `;

      await this.emailService.sendEmail({
        to: 'xo361@naver.com',
        subject: `[오류 알림] ${taskName} 실패`,
        html: errorContent
      });
    } catch (emailError) {
      console.error('❌ 오류 알림 이메일 발송 실패:', emailError);
    }
  }

  private logSuccess(taskType: string, title: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      taskType,
      status: 'success',
      title,
      message: '성공적으로 완료됨'
    };
    
    console.log(`📊 로그: ${JSON.stringify(logEntry)}`);
  }

  private logError(taskType: string, error: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      taskType,
      status: 'error',
      message: error.message || error.toString()
    };
    
    console.error(`📊 오류 로그: ${JSON.stringify(logEntry)}`);
  }

  // 수동 실행 메서드들
  async runManualDaily() {
    console.log('🖱️ 수동으로 일일 블로그를 생성합니다...');
    await this.runDailyBlogGeneration();
  }

  async runManualEvening() {
    console.log('🖱️ 수동으로 저녁 시황 블로그를 생성합니다...');
    await this.runEveningBlogGeneration();
  }

  // 상태 확인
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      environment: process.env.NODE_ENV || 'production',
      timezone: 'Asia/Seoul',
      nextExecutions: this.getNextExecutionTimes()
    };
  }

  private getNextExecutionTimes() {
    const now = new Date();
    const times = [];
    
    if (process.env.NODE_ENV === 'development') {
      // 다음 30분 단위 시간 계산
      const next30Min = new Date(now);
      next30Min.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
      times.push({
        type: 'test',
        time: next30Min.toLocaleString('ko-KR')
      });
    } else {
      // 다음 오전 9시
      const next9AM = new Date(now);
      next9AM.setHours(9, 0, 0, 0);
      if (next9AM <= now) {
        next9AM.setDate(next9AM.getDate() + 1);
      }
      times.push({
        type: 'daily',
        time: next9AM.toLocaleString('ko-KR')
      });

      // 다음 평일 오후 6시
      const next6PM = new Date(now);
      next6PM.setHours(18, 0, 0, 0);
      while (next6PM <= now || next6PM.getDay() === 0 || next6PM.getDay() === 6) {
        next6PM.setDate(next6PM.getDate() + 1);
      }
      times.push({
        type: 'evening',
        time: next6PM.toLocaleString('ko-KR')
      });
    }
    
    return times;
  }
}

// 스케줄러 시작 함수 (외부에서 호출)
export function startScheduler() {
  const scheduler = new StockBlogScheduler();
  return scheduler.start();
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📅 주식 블로그 스케줄러를 직접 실행합니다...');
  const scheduler = startScheduler();
  
  // 테스트용 수동 실행 (개발 모드에서만)
  if (process.env.NODE_ENV === 'development') {
    setTimeout(async () => {
      console.log('\n🧪 테스트: 수동으로 블로그 생성 실행');
      await scheduler.runManualDaily();
    }, 5000); // 5초 후 실행
  }
}