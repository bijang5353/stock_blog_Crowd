import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StockDataService } from './services/stockData.js';
import { BlogGenerator } from './services/blogGenerator.js';
import { EmailService } from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

class StockBlogMCPServer {
  private server: Server;
  private stockDataService: StockDataService;
  private blogGenerator: BlogGenerator;
  private emailService: EmailService;
  private lastBlogContent: { title: string; content: string } | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'stock-blog-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.stockDataService = new StockDataService();
    this.blogGenerator = new BlogGenerator();
    this.emailService = new EmailService();

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_stock_blog',
          description: '미국주식과 한국주식 정보를 기반으로 네이버 블로그 글을 생성합니다',
          inputSchema: {
            type: 'object',
            properties: {
              market: {
                type: 'string',
                enum: ['us', 'kr', 'both'],
                description: '주식 시장 선택 (us: 미국, kr: 한국, both: 둘다)',
                default: 'both'
              },
              symbols: {
                type: 'array',
                items: { type: 'string' },
                description: '특정 종목 코드 (선택사항)',
                default: []
              }
            },
          },
        },
        {
          name: 'send_blog_email',
          description: '생성된 블로그 글을 이메일로 발송합니다',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: '블로그 글 내용'
              },
              title: {
                type: 'string',
                description: '블로그 글 제목'
              }
            },
            required: ['content', 'title'],
          },
        },
        {
          name: 'generate_and_send_daily_blog',
          description: '일일 주식 블로그를 생성하고 이메일로 발송합니다',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'show_full_blog_content',
          description: '마지막으로 생성된 블로그의 전체 내용을 여러 부분으로 나누어 보여줍니다',
          inputSchema: {
            type: 'object',
            properties: {
              part: {
                type: 'number',
                description: '보고 싶은 부분 번호 (1부터 시작, 생략시 전체 구조 보기)',
                default: 0
              }
            }
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'generate_stock_blog':
            return await this.generateStockBlog(request.params.arguments);
          
          case 'send_blog_email':
            return await this.sendBlogEmail(request.params.arguments);
          
          case 'generate_and_send_daily_blog':
            return await this.generateAndSendDailyBlog();
          
          case 'show_full_blog_content':
            return await this.showFullBlogContent(request.params.arguments);
          
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async generateStockBlog(args: any) {
    const { market = 'both', symbols = [] } = args;
    
    console.error(`블로그 생성 시작 - 시장: ${market}, 종목: ${symbols.join(', ') || '기본 종목'}`);
    
    let stockData: any = {};
    
    if (market === 'us' || market === 'both') {
      console.error('미국 주식 데이터 수집 중...');
      stockData.us = await this.stockDataService.getUSStockData(symbols);
    }
    
    if (market === 'kr' || market === 'both') {
      console.error('한국 주식 데이터 수집 중...');
      stockData.kr = await this.stockDataService.getKRStockData(symbols);
    }

    console.error('블로그 글 생성 중...');
    const blogContent = await this.blogGenerator.generateBlogPost(stockData, market);
    
    // 마지막 블로그 내용 저장
    this.lastBlogContent = blogContent;
    
    // 블로그 내용 미리보기 (처음 200자)
    const preview = blogContent.content.substring(0, 200) + (blogContent.content.length > 200 ? '...' : '');
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ 블로그 글이 성공적으로 생성되었습니다!

📝 **제목**: ${blogContent.title}

📊 **내용 통계**:
- 글자수: ${blogContent.content.length.toLocaleString()}자
- 예상 읽기 시간: 약 ${Math.ceil(blogContent.content.length / 300)}분

📄 **내용 미리보기**:
${preview}

💡 **전체 내용을 보려면** 이메일로 발송하거나 별도로 요청해주세요!`,
        },
      ],
    };
  }

  private async sendBlogEmail(args: any) {
    const { content, title } = args;
    
    console.error(`이메일 발송 시작 - 제목: ${title}`);
    
    await this.emailService.sendEmail({
      to: 'xo361@naver.com',
      subject: `[주식 블로그] ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db;">${title}</h1>
          <div style="white-space: pre-wrap; line-height: 1.8; font-size: 14px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
            ${content.replace(/\n/g, '<br>')}
          </div>
          <hr style="margin: 20px 0; border: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px;">
            📋 자동 생성된 블로그 글입니다. 위 내용을 복사해서 네이버 블로그에 붙여넣기 하세요.<br>
            🕐 생성 시간: ${new Date().toLocaleString('ko-KR')}
          </p>
        </div>
      `
    });

    return {
      content: [
        {
          type: 'text',
          text: '📧 이메일이 성공적으로 발송되었습니다! xo361@naver.com 메일함을 확인해주세요.',
        },
      ],
    };
  }

  private async generateAndSendDailyBlog() {
    console.error('일일 블로그 생성 및 발송 시작...');
    
    const blogContent = await this.blogGenerator.generateDailyBlogPost();
    
    await this.emailService.sendEmail({
      to: 'xo361@naver.com',
      subject: `[일일 주식 브리핑] ${blogContent.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
            <h1 style="color: #2c3e50; text-align: center; border-bottom: 3px solid #e74c3c; padding-bottom: 15px; margin-bottom: 25px;">${blogContent.title}</h1>
            
            <div style="background: #e8f6ff; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #3498db;">
              <h3 style="color: #2980b9; margin: 0 0 10px 0;">📋 네이버 블로그 붙여넣기용 HTML</h3>
              <p style="margin: 0; color: #34495e;">아래 내용을 복사해서 네이버 블로그 HTML 편집기에 붙여넣으세요!</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border: 2px dashed #dee2e6; border-radius: 10px; margin: 20px 0; font-family: monospace; font-size: 12px; color: #495057; max-height: 300px; overflow-y: auto;">
              ${blogContent.htmlContent ? blogContent.htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0;">💡 사용법</h4>
              <ol style="color: #856404; margin: 0; padding-left: 20px;">
                <li>위의 HTML 코드를 모두 복사하세요</li>
                <li>네이버 블로그 글쓰기에서 'HTML 편집' 버튼을 클릭</li>
                <li>복사한 HTML 코드를 붙여넣기 하세요</li>
                <li>다시 '일반 편집'으로 돌아가서 미리보기 확인!</li>
              </ol>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 12px;">
            🕐 생성시간: ${new Date().toLocaleString('ko-KR')} | 🤖 주식 블로그 자동화 봇
          </div>
        </div>
      `
    });

    return {
      content: [
        {
          type: 'text',
          text: `🎉 일일 블로그가 생성되고 이메일로 발송되었습니다!\n\n📝 제목: ${blogContent.title}\n📧 발송 완료: xo361@naver.com`,
        },
      ],
    };
  }

  private async showFullBlogContent(args: any) {
    const { part = 0 } = args;
    
    if (!this.lastBlogContent) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ 표시할 블로그 내용이 없습니다. 먼저 블로그를 생성해주세요!',
          },
        ],
      };
    }

    const { title, content } = this.lastBlogContent;
    
    if (part === 0) {
      // 전체 구조 보기
      const sections = content.split('\n---\n');
      let structureText = `📋 **블로그 구조** (총 ${sections.length}개 섹션)\n\n`;
      structureText += `📝 **제목**: ${title}\n`;
      structureText += `📊 **전체 글자수**: ${content.length.toLocaleString()}자\n\n`;
      
      sections.forEach((section, index) => {
        const lines = section.trim().split('\n');
        const sectionTitle = lines.find(line => line.startsWith('#') || line.startsWith('##')) || `섹션 ${index + 1}`;
        structureText += `${index + 1}. ${sectionTitle.replace(/^#+\s*/, '')}\n`;
      });
      
      structureText += `\n💡 특정 섹션을 보려면 part 번호를 지정해주세요! (1-${sections.length})`;
      
      return {
        content: [
          {
            type: 'text',
            text: structureText,
          },
        ],
      };
    } else {
      // 특정 섹션 보기
      const sections = content.split('\n---\n');
      
      if (part > sections.length || part < 1) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ 잘못된 섹션 번호입니다. 1-${sections.length} 사이의 번호를 입력해주세요.`,
            },
          ],
        };
      }
      
      const sectionContent = sections[part - 1].trim();
      
      return {
        content: [
          {
            type: 'text',
            text: `📄 **섹션 ${part}/${sections.length}**\n\n${sectionContent}\n\n---\n\n💡 다른 섹션을 보려면 part 번호를 바꿔서 다시 실행해주세요!`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Stock Blog MCP Server started successfully');
  }
}

const server = new StockBlogMCPServer();
server.run().catch(console.error);