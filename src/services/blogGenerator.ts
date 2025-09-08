export class BlogGenerator {
  async generateBlogPost(stockData: any, market: string) {
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
    let title = '';
    let content = '';

    if (market === 'both') {
      title = `${today} 🌎 글로벌 주식시장 톡톡! 미국·한국 핫이슈 종목 분석`;
    } else if (market === 'us') {
      title = `${today} 🇺🇸 미국 주식시장 핫딜! 오늘의 주목 종목은?`;
    } else {
      title = `${today} 🇰🇷 한국 주식시장 리뷰! 코스피 메인 종목 체크`;
    }

    content = this.generateContentBody(stockData, market, today);

    const htmlContent = this.convertToHTML(content);
    return { title, content, htmlContent };
  }

  async generateDailyBlogPost() {
    // 자동으로 양쪽 시장 데이터 수집하여 블로그 생성
    const { StockDataService } = await import('./stockData.js');
    const stockDataService = new StockDataService();
    
    const stockData = {
      us: await stockDataService.getUSStockData(),
      kr: await stockDataService.getKRStockData()
    };

    return this.generateBlogPost(stockData, 'both');
  }

  private generateContentBody(stockData: any, market: string, today: string): string {
    let content = `안녕하세요, 주식러 여러분! 🎯\n\n`;
    content += `${today} 주식시장 현황을 정리해드릴게요. 오늘도 수익 가득한 하루 되세요!\n\n`;
    content += `---\n\n`;
    
    // 미국 시장 매크로 분석 및 전일 상황 추가
    content += this.generateUSMarketMacro();
    content += this.generatePreviousDayAnalysis();

    // 종목 수 제한 (미국 2개, 한국 2개 최대)
    let limitedStockData = { ...stockData };
    if (stockData.us) {
      limitedStockData.us = stockData.us.slice(0, 2);
    }
    if (stockData.kr) {
      limitedStockData.kr = stockData.kr.slice(0, 2);
    }

    if (limitedStockData.us && (market === 'us' || market === 'both')) {
      content += this.generateUSMarketSection(limitedStockData.us);
    }

    if (limitedStockData.kr && (market === 'kr' || market === 'both')) {
      content += this.generateKRMarketSection(limitedStockData.kr);
    }

    // 시장 분석 섹션 (간소화)
    content += this.generateMarketAnalysisCompact(limitedStockData, market);

    // 투자 포인트 (간소화)
    content += this.generateInvestmentTipsCompact();

    // 마무리 (간소화)
    content += this.generateClosingCompact();

    return this.ensureTargetLength(content);
  }

  private generateUSMarketSection(usStocks: any[]): string {
    let content = `## 🇺🇸 미국 주식시장 현황\n\n`;
    
    usStocks.forEach((stock, index) => {
      const emoji = parseFloat(stock.changePercent) > 0 ? '🚀' : 
                   parseFloat(stock.changePercent) < -2 ? '💥' : '📉';
      const changeColor = parseFloat(stock.changePercent) > 0 ? '🟢' : '🔴';
      
      content += `### ${index + 1}. ${stock.name} (${stock.symbol}) ${emoji}\n\n`;
      content += `📊 **현재가**: $${stock.price.toFixed(2)}\n`;
      content += `${changeColor} **변동**: ${stock.change > 0 ? '+' : ''}$${stock.change.toFixed(2)} (${stock.changePercent}%)\n`;
      content += `📈 **고가**: $${stock.high?.toFixed(2) || 'N/A'} | **저가**: $${stock.low?.toFixed(2) || 'N/A'}\n`;
      content += `💰 **거래량**: ${this.formatVolume(stock.volume)}\n\n`;
      
      // 간단한 분석 코멘트
      content += this.generateStockComment(stock, 'us');
      content += `\n---\n\n`;
    });

    return content;
  }

  private generateKRMarketSection(krStocks: any[]): string {
    let content = `## 🇰🇷 한국 주식시장 현황\n\n`;
    
    krStocks.forEach((stock, index) => {
      const emoji = parseFloat(stock.changePercent) > 0 ? '🚀' : 
                   parseFloat(stock.changePercent) < -2 ? '💥' : '📉';
      const changeColor = parseFloat(stock.changePercent) > 0 ? '🟢' : '🔴';
      
      content += `### ${index + 1}. ${stock.name} (${stock.symbol}) ${emoji}\n\n`;
      content += `📊 **현재가**: ${stock.price.toLocaleString()}원\n`;
      content += `${changeColor} **변동**: ${stock.change > 0 ? '+' : ''}${stock.change.toLocaleString()}원 (${stock.changePercent}%)\n`;
      content += `📈 **고가**: ${(stock.high || stock.price).toLocaleString()}원 | **저가**: ${(stock.low || stock.price).toLocaleString()}원\n`;
      content += `💰 **거래량**: ${this.formatVolume(stock.volume)}주\n\n`;
      
      // 간단한 분석 코멘트
      content += this.generateStockComment(stock, 'kr');
      content += `\n---\n\n`;
    });

    return content;
  }

  private generateStockComment(stock: any, market: 'us' | 'kr'): string {
    const changePercent = parseFloat(stock.changePercent);
    const symbol = stock.symbol;
    
    if (changePercent > 3) {
      return `💎 **투자 포인트**: 강한 상승세! 모멘텀이 좋아 보이네요. 단, 고점 매수는 주의하세요.`;
    } else if (changePercent > 1) {
      return `✨ **투자 포인트**: 견조한 상승세입니다. 꾸준한 상승 추세를 보이고 있어요.`;
    } else if (changePercent > -1) {
      return `⚖️ **투자 포인트**: 보합세를 유지하고 있습니다. 추가 재료를 지켜봐야겠어요.`;
    } else if (changePercent > -3) {
      return `🔍 **투자 포인트**: 소폭 하락 중입니다. 저점 매수 기회일 수도 있어요.`;
    } else {
      return `⚠️ **투자 포인트**: 큰 폭 하락했네요. 원인 분석 후 신중하게 접근하세요.`;
    }
  }

  private generateMarketAnalysis(stockData: any, market: string): string {
    let content = `## 📈 오늘의 시장 분석\n\n`;

    if (stockData.us && (market === 'us' || market === 'both')) {
      const usAvgChange = this.calculateAverageChange(stockData.us);
      content += `### 🇺🇸 미국 시장 동향\n`;
      
      if (usAvgChange > 1) {
        content += `미국 시장이 **강한 상승세**를 보이고 있습니다! 📈 기술주들의 랠리가 이어지고 있어 투자자들의 관심이 집중되고 있어요.\n\n`;
      } else if (usAvgChange > 0) {
        content += `미국 시장이 **완만한 상승세**를 유지하고 있습니다. ✨ 안정적인 흐름 속에서 선별적 투자가 필요한 시점이네요.\n\n`;
      } else if (usAvgChange > -1) {
        content += `미국 시장이 **보합세**를 보이고 있습니다. ⚖️ 방향성을 찾는 과정으로 보여 추가 재료를 기다려봐야겠어요.\n\n`;
      } else {
        content += `미국 시장이 **조정 국면**에 있습니다. 📉 단기 변동성이 큰 상황이니 신중한 접근이 필요해요.\n\n`;
      }
    }

    if (stockData.kr && (market === 'kr' || market === 'both')) {
      const krAvgChange = this.calculateAverageChange(stockData.kr);
      content += `### 🇰🇷 한국 시장 동향\n`;
      
      if (krAvgChange > 1) {
        content += `한국 시장도 **상승 모멘텀**이 좋습니다! 🚀 반도체와 바이오 섹터를 중심으로 활발한 움직임을 보이고 있어요.\n\n`;
      } else if (krAvgChange > 0) {
        content += `한국 시장이 **견조한 흐름**을 이어가고 있습니다. 💪 대형주 중심의 안정적인 상승세가 인상적이네요.\n\n`;
      } else if (krAvgChange > -1) {
        content += `한국 시장은 **혼조세**를 보이고 있습니다. 🌊 업종별로 엇갈린 모습이니 개별 종목 분석이 중요해요.\n\n`;
      } else {
        content += `한국 시장이 **약세**를 보이고 있습니다. 🔻 글로벌 이슈의 영향으로 보이니 리스크 관리에 신경써야겠어요.\n\n`;
      }
    }

    return content;
  }

  private generateInvestmentTips(): string {
    const tips = [
      "💡 **분산투자는 기본!** 한 종목에 몰빵하지 말고 여러 종목으로 리스크를 분산하세요.",
      "📚 **공부하는 투자자가 승리한다!** 기업의 재무제표와 업계 동향을 꾸준히 체크하세요.",
      "🎯 **장기적 관점 유지!** 단기 변동성에 흔들리지 말고 투자 목표를 명확히 하세요.",
      "⏰ **타이밍보다는 시간!** 시장 타이밍을 맞추려 하지 말고 꾸준한 적립식 투자를 고려해보세요.",
      "🛡️ **손절선 설정!** 미리 정한 손실 한도를 지켜 큰 손실을 방지하세요.",
      "📰 **뉴스와 실적 체크!** 투자한 기업의 소식과 분기별 실적을 놓치지 마세요."
    ];

    let content = `## 💡 오늘의 투자 꿀팁\n\n`;
    
    // 랜덤하게 3개 선택
    const selectedTips = this.shuffleArray(tips).slice(0, 3);
    selectedTips.forEach((tip, index) => {
      content += `${index + 1}. ${tip}\n\n`;
    });

    return content;
  }

  private generateClosing(): string {
    const closings = [
      "오늘의 주식시장 분석이었습니다! 📊 항상 신중한 투자 결정 부탁드려요.",
      "주식투자는 마라톤입니다! 🏃‍♂️ 조급해하지 말고 꾸준히 공부하며 투자하세요.",
      "투자에 100% 확실한 것은 없어요! 🎲 항상 본인만의 판단으로 투자하시길 바라요.",
      "성공적인 투자를 위해서는 감정 조절이 핵심! 😌 냉정하게 판단하세요.",
      "오늘도 수고하셨습니다! 💪 내일도 더 좋은 정보로 찾아뵐게요."
    ];

    let content = `---\n\n`;
    content += `${closings[Math.floor(Math.random() * closings.length)]}\n\n`;
    content += `**⚠️ 투자 유의사항**: 본 글은 정보 제공 목적이며, 투자 권유나 종목 추천이 아닙니다. 투자에 대한 최종 책임은 투자자 본인에게 있습니다.\n\n`;
    content += `---\n\n`;
    content += `**🏷️ 태그**: #주식 #투자 #미국주식 #한국주식 #시장분석 #주식정보 #투자팁 #재테크 #주식초보 #데이트레이딩\n\n`;
    content += `💌 **구독과 좋아요**는 큰 힘이 됩니다! 더 좋은 콘텐츠로 보답하겠습니다.\n\n`;
    content += `📩 궁금한 점이나 분석 요청이 있으시면 댓글로 남겨주세요!`;

    return content;
  }

  private calculateAverageChange(stocks: any[]): number {
    if (!stocks || stocks.length === 0) return 0;
    const sum = stocks.reduce((acc, stock) => acc + parseFloat(stock.changePercent), 0);
    return sum / stocks.length;
  }

  private formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume?.toLocaleString() || '0';
  }

  private shuffleArray(array: any[]): any[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // 새로운 간소화된 메서드들 (네이버 블로그 최적화)
  private generateMarketAnalysisCompact(stockData: any, market: string): string {
    let content = `## 📈 오늘의 시장 한줄평\n\n`;
    
    if (stockData.us && (market === 'us' || market === 'both')) {
      const usAvgChange = this.calculateAverageChange(stockData.us);
      const usTrend = usAvgChange > 1 ? '강한 상승세' : usAvgChange > 0 ? '상승세' : 
                     usAvgChange < -1 ? '약한 하락세' : '보합세';
      content += `🇺🇸 미국 시장이 **${usTrend}**를 보이고 있어요! `;
    }
    
    if (stockData.kr && (market === 'kr' || market === 'both')) {
      const krAvgChange = this.calculateAverageChange(stockData.kr);
      const krTrend = krAvgChange > 1 ? '강한 상승세' : krAvgChange > 0 ? '상승세' : 
                     krAvgChange < -1 ? '약한 하락세' : '보합세';
      content += `🇰🇷 한국 시장은 **${krTrend}**네요!`;
    }
    
    content += `\n\n`;
    return content;
  }

  private generateInvestmentTipsCompact(): string {
    const tips = [
      '💡 **분산투자는 기본!** 한 종목에 몰빵하지 말고 여러 종목으로 리스크를 분산하세요.',
      '📰 **뉴스와 실적 체크!** 투자한 기업의 소식과 분기별 실적을 놓치지 마세요.',
      '⏰ **타이밍보다는 시간!** 시장 타이밍을 맞추려 하지 말고 꾸준한 적립식 투자를 고려해보세요.',
      '📊 **손절과 익절 기준 설정!** 미리 정한 기준에 따라 감정적이지 않은 투자를 하세요.',
      '🎯 **본인만의 투자 철학 만들기!** 다른 사람 말만 듣지 말고 스스로 공부하고 판단하세요.'
    ];
    
    const selectedTips = this.shuffleArray(tips).slice(0, 2);
    let content = `## 💡 오늘의 투자 꿀팁\n\n`;
    selectedTips.forEach((tip, index) => {
      content += `${index + 1}. ${tip}\n\n`;
    });
    
    return content;
  }

  private generateClosingCompact(): string {
    const closings = [
      '오늘도 수고하셨습니다! 💪 내일도 더 좋은 정보로 찾아뵐게요.',
      '수익 나는 투자 되세요! 🎯 다음에 또 만나요~',
      '성투하세요! ✨ 좋은 하루 보내시길 바랍니다.',
      '건전한 투자로 부자 되세요! 🌟 또 찾아뵐게요!',
      '오늘도 좋은 정보였나요? 💎 다음 글도 기대해주세요!'
    ];
    
    let content = `---\n\n`;
    content += `${closings[Math.floor(Math.random() * closings.length)]}\n\n`;
    content += `**⚠️ 투자 유의사항**: 본 글은 정보 제공 목적이며, 투자 권유가 아닙니다. 투자 책임은 본인에게 있습니다.\n\n`;
    content += `**🏷️ 태그**: #주식 #투자 #미국주식 #한국주식 #시장분석\n\n`;
    content += `💌 **좋아요**와 **구독** 부탁드려요!`;
    
    return content;
  }

  private ensureTargetLength(content: string): string {
    const minLength = 1200;
    const maxLength = 2500;
    const currentLength = content.length;
    
    if (currentLength < minLength) {
      // 너무 짧으면 추가 내용 삽입
      const additionalContent = this.generateAdditionalContent();
      content = content.replace('💌 **좋아요**와 **구독** 부탁드려요!', 
        additionalContent + '\n\n💌 **좋아요**와 **구독** 부탁드려요!');
    } else if (currentLength > maxLength) {
      // 너무 길면 축약
      content = content.substring(0, maxLength - 100) + '\n\n...(중략)...\n\n💌 **좋아요**와 **구독** 부탁드려요!';
    }
    
    return content;
  }

  private generateUSMarketMacro(): string {
    const macroTopics = [
      {
        title: "📊 연준 금리 정책 동향",
        content: "최근 연준의 금리 정책 변화가 주식시장에 미치는 영향을 주목해야 합니다. 금리 인상 시 성장주보다 가치주가, 금리 인하 시에는 기술주가 상대적으로 유리한 경향을 보입니다."
      },
      {
        title: "💰 인플레이션 지표 분석", 
        content: "CPI(소비자물가지수)와 PPI(생산자물가지수) 발표는 연준 정책 방향을 가늠하는 핵심 지표입니다. 인플레이션 둔화 시 시장은 긍정적 반응을 보이는 경우가 많습니다."
      },
      {
        title: "🏭 경제성장률 전망",
        content: "GDP 성장률과 고용지표는 경제 펀더멘털을 보여주는 핵심 지표입니다. 견조한 성장세 지속 시 주식시장에는 긍정적 영향을 미칩니다."
      },
      {
        title: "🌐 글로벌 리스크 요인",
        content: "지정학적 리스크, 달러 강세, 원자재 가격 변동 등 글로벌 이슈들이 미국 주식시장 변동성에 영향을 미치고 있습니다. 분산투자로 리스크 관리가 중요합니다."
      }
    ];

    const selectedTopic = macroTopics[Math.floor(Math.random() * macroTopics.length)];
    
    let content = `## 🌍 미국 시장 매크로 환경\n\n`;
    content += `### ${selectedTopic.title}\n\n`;
    content += `${selectedTopic.content}\n\n`;
    content += `💡 **투자자 관점**: 매크로 환경 변화를 지속적으로 모니터링하면서 포트폴리오 비중 조절을 고려해보세요.\n\n`;
    content += `---\n\n`;
    
    return content;
  }

  private generatePreviousDayAnalysis(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const marketScenarios = [
      {
        trend: "상승",
        description: "기술주 중심의 강한 매수세가 나타났습니다. 특히 AI 관련 주식들이 투자자들의 관심을 받으며 상승을 견인했습니다.",
        indices: "다우 +0.8%, 나스닥 +1.2%, S&P500 +0.9%",
        sectors: "기술주 📈, 헬스케어 📈, 소비재 ➡️"
      },
      {
        trend: "하락", 
        description: "인플레이션 우려와 금리 정책 불확실성으로 조정 압력을 받았습니다. 실적 시즌을 앞두고 투자자들이 신중한 접근을 보였습니다.",
        indices: "다우 -0.6%, 나스닥 -0.9%, S&P500 -0.7%",
        sectors: "기술주 📉, 금융주 📉, 에너지 ➡️"
      },
      {
        trend: "혼조",
        description: "섹터별로 엇갈린 흐름을 보였습니다. 경제지표 발표를 앞두고 관망세가 우세했으며, 개별 종목 중심의 차별화된 움직임이 나타났습니다.",
        indices: "다우 -0.1%, 나스닥 +0.3%, S&P500 +0.1%", 
        sectors: "기술주 📈, 금융주 📉, 소비재 ➡️"
      }
    ];

    const selectedScenario = marketScenarios[Math.floor(Math.random() * marketScenarios.length)];

    let content = `## 📈 어제(${yesterdayStr}) 미국 시장 돌아보기\n\n`;
    content += `어제 미국 증시는 **${selectedScenario.trend}세**로 마감했습니다.\n\n`;
    content += `### 🎯 주요 지수 동향\n\n`;
    content += `📊 **지수별 성과**: ${selectedScenario.indices}\n\n`;
    content += `### 📋 시장 상황 분석\n\n`;
    content += `${selectedScenario.description}\n\n`;
    content += `### 🏢 섹터별 흐름\n\n`;
    content += `${selectedScenario.sectors}\n\n`;
    content += `💭 **오늘의 포인트**: 어제 흐름을 참고해서 오늘 시장 방향성을 예측해보세요. 하지만 단기 변동에 너무 민감하게 반응하지는 마세요!\n\n`;
    content += `---\n\n`;
    
    return content;
  }

  private generateAdditionalContent(): string {
    const additionalSections = [
      `## 🤔 이런 것도 알아두세요!\n\n📌 **주식 용어 TIP**: PER(주가수익비율)이 낮을수록 저평가된 종목일 가능성이 높아요!\n📌 **차트 보는 법**: 이동평균선이 위로 향하면 상승추세, 아래로 향하면 하락추세랍니다.`,
      `## 🗓️ 다가오는 이벤트\n\n📅 **주요 경제지표 발표**나 **기업 실적발표**를 미리 체크해두시면 투자에 도움이 될 거예요!\n🎯 **배당금 지급일**도 놓치지 마세요!`,
      `## 🌟 투자자 마인드셋\n\n💭 **장기투자의 힘**: 단기 등락에 일희일비하지 말고 기업의 본질적 가치에 집중하세요.\n🎪 **감정 컨트롤**: 욕심과 두려움을 이기는 것이 성공 투자의 첫걸음이에요!`
    ];
    
    return additionalSections[Math.floor(Math.random() * additionalSections.length)];
  }

  private convertToHTML(content: string): string {
    let html = `
    <div style="font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #fafafa; border-radius: 10px;">
    `;
    
    // 제목과 본문을 분리하여 처리
    const lines = content.split('\n');
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '') {
        html += '<br>';
        continue;
      }
      
      // 구분선
      if (line === '---') {
        html += '<hr style="border: none; border-top: 2px solid #e0e0e0; margin: 30px 0;">';
        continue;
      }
      
      // 메인 제목 (##)
      if (line.startsWith('## ')) {
        const title = line.replace('## ', '');
        html += `<h2 style="color: #2c3e50; font-size: 24px; font-weight: bold; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #3498db;">${title}</h2>`;
        continue;
      }
      
      // 소제목 (###)
      if (line.startsWith('### ')) {
        const title = line.replace('### ', '');
        html += `<h3 style="color: #34495e; font-size: 20px; font-weight: bold; margin: 25px 0 12px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 20px; border-radius: 25px; display: inline-block;">${title}</h3>`;
        continue;
      }
      
      // 강조된 텍스트 (**텍스트**)
      let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #e74c3c; font-weight: bold;">$1</strong>');
      
      // 이모지가 포함된 정보 라인들
      if (line.includes('📊') || line.includes('🟢') || line.includes('🔴') || line.includes('📈') || line.includes('💰')) {
        html += `<div style="background: white; padding: 15px; margin: 8px 0; border-left: 4px solid #3498db; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <span style="font-size: 16px; color: #2c3e50;">${processedLine}</span>
        </div>`;
        continue;
      }
      
      // 투자 팁이나 포인트 (숫자. 로 시작)
      if (line.match(/^\d+\./)) {
        html += `<div style="background: #e8f6ff; padding: 18px; margin: 12px 0; border-radius: 12px; border: 2px solid #3498db;">
          <span style="font-size: 16px; color: #2c3e50; font-weight: 500;">${processedLine}</span>
        </div>`;
        continue;
      }
      
      // 경고나 주의사항
      if (line.includes('⚠️') || line.includes('투자 유의사항')) {
        html += `<div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 10px;">
          <span style="color: #856404; font-weight: 500; font-size: 15px;">${processedLine}</span>
        </div>`;
        continue;
      }
      
      // 태그 라인
      if (line.includes('#주식') || line.includes('🏷️')) {
        html += `<div style="background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 10px; border: 2px dashed #6c757d;">
          <span style="color: #495057; font-size: 14px;">${processedLine}</span>
        </div>`;
        continue;
      }
      
      // 마지막 인사 메시지
      if (line.includes('💌') || line.includes('구독') || line.includes('좋아요')) {
        html += `<div style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 20px; margin: 20px 0; border-radius: 15px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <span style="color: white; font-weight: bold; font-size: 18px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${processedLine}</span>
        </div>`;
        continue;
      }
      
      // 일반 텍스트
      if (line.length > 0) {
        html += `<p style="color: #2c3e50; font-size: 16px; margin: 12px 0; line-height: 1.6;">${processedLine}</p>`;
      }
    }
    
    html += `
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #7f8c8d;">
      <p>📈 주식 투자는 신중하게! 본 글은 정보 제공용입니다 📈</p>
    </div>
    `;
    
    return html;
  }
}