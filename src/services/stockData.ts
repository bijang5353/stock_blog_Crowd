import axios from 'axios';
import yahooFinance from 'yahoo-finance2';

export class StockDataService {
  private readonly ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

  async getUSStockData(symbols: string[] = []) {
    // 기본 인기 종목들
    const defaultSymbols = symbols.length > 0 ? symbols : ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    
    const stockData = [];
    
    for (const symbol of defaultSymbols.slice(0, 3)) { // API 제한으로 3개만
      try {
        console.error(`미국 주식 ${symbol} 데이터 수집 중...`);
        
        if (!this.ALPHA_VANTAGE_API_KEY) {
          console.warn('Alpha Vantage API 키가 없습니다. 더미 데이터를 사용합니다.');
          stockData.push(this.generateMockUSStockData(symbol));
          continue;
        }

        // Alpha Vantage API 사용
        const response = await axios.get(`https://www.alphavantage.co/query`, {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol: symbol,
            apikey: this.ALPHA_VANTAGE_API_KEY,
            outputsize: 'compact'
          },
          timeout: 10000
        });

        const timeSeries = response.data['Time Series (Daily)'];
        if (timeSeries) {
          const latestDate = Object.keys(timeSeries)[0];
          const latestData = timeSeries[latestDate];
          const previousDate = Object.keys(timeSeries)[1];
          const previousData = timeSeries[previousDate];
          
          const currentPrice = parseFloat(latestData['4. close']);
          const previousPrice = parseFloat(previousData['4. close']);
          const change = currentPrice - previousPrice;
          const changePercent = (change / previousPrice * 100);
          
          stockData.push({
            symbol,
            name: this.getUSStockName(symbol),
            price: currentPrice,
            change: change,
            changePercent: changePercent.toFixed(2),
            volume: parseInt(latestData['5. volume']),
            date: latestDate,
            high: parseFloat(latestData['2. high']),
            low: parseFloat(latestData['3. low'])
          });
        } else {
          console.warn(`${symbol} 데이터를 가져올 수 없습니다. 더미 데이터를 사용합니다.`);
          stockData.push(this.generateMockUSStockData(symbol));
        }
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error instanceof Error ? error.message : String(error));
        stockData.push(this.generateMockUSStockData(symbol));
      }
      
      // API 제한을 위한 딜레이 (무료 버전: 5 calls per minute)
      if (this.ALPHA_VANTAGE_API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }
    
    return stockData;
  }

  async getKRStockData(symbols: string[] = []) {
    // 기본 인기 종목들 (한국 종목은 .KS 접미사 사용)
    const defaultSymbols = symbols.length > 0 ? symbols : ['005930.KS', '000660.KS', '373220.KS', '207940.KS', '035420.KS'];
    
    const stockData = [];
    
    for (const symbol of defaultSymbols) {
      try {
        console.error(`한국 주식 ${symbol} 데이터 수집 중...`);
        
        // Yahoo Finance로 한국 주식 데이터 가져오기
        const quote = await yahooFinance.quote(symbol);
        
        if (quote) {
          const currentPrice = quote.regularMarketPrice || 0;
          const previousClose = quote.regularMarketPreviousClose || currentPrice;
          const change = currentPrice - previousClose;
          const changePercent = (change / previousClose * 100);
          
          stockData.push({
            symbol: symbol.replace('.KS', ''), // 표시할 때는 .KS 제거
            name: quote.longName || quote.shortName || this.getKRStockName(symbol),
            price: Math.round(currentPrice),
            change: Math.round(change),
            changePercent: changePercent.toFixed(2),
            volume: quote.regularMarketVolume || 0,
            date: new Date().toISOString().split('T')[0],
            high: Math.round(quote.regularMarketDayHigh || currentPrice),
            low: Math.round(quote.regularMarketDayLow || currentPrice),
            marketCap: quote.marketCap || 0
          });
        } else {
          console.warn(`${symbol} 데이터를 가져올 수 없습니다. 더미 데이터를 사용합니다.`);
          stockData.push(this.generateMockKRStockData(symbol.replace('.KS', '')));
        }
      } catch (error) {
        console.error(`Error fetching KR ${symbol}:`, error instanceof Error ? error.message : String(error));
        stockData.push(this.generateMockKRStockData(symbol.replace('.KS', '')));
      }
      
      // 요청 간 딜레이
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return stockData;
  }

  private getKRStockName(symbol: string): string {
    const names: { [key: string]: string } = {
      '005930.KS': '삼성전자',
      '000660.KS': 'SK하이닉스',
      '373220.KS': 'LG에너지솔루션',
      '207940.KS': '삼성바이오로직스',
      '035420.KS': 'NAVER',
      '005380.KS': '현대차',
      '000270.KS': '기아',
      '068270.KS': '셀트리온'
    };
    return names[symbol] || symbol.replace('.KS', '');
  }

  private generateMockUSStockData(symbol: string) {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'TSLA': 'Tesla Inc.',
      'NVDA': 'NVIDIA Corporation',
      'AMZN': 'Amazon.com Inc.',
      'META': 'Meta Platforms Inc.'
    };

    const basePrice = this.getBasePriceForSymbol(symbol);
    const changePercent = (Math.random() - 0.5) * 8; // -4% ~ +4%
    const change = basePrice * (changePercent / 100);
    
    return {
      symbol,
      name: names[symbol] || `${symbol} Corporation`,
      price: parseFloat((basePrice + change).toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: changePercent.toFixed(2),
      volume: Math.round(Math.random() * 50000000 + 10000000), // 1000만 ~ 6000만
      date: new Date().toISOString().split('T')[0],
      high: parseFloat((basePrice + change + Math.random() * 5).toFixed(2)),
      low: parseFloat((basePrice + change - Math.random() * 5).toFixed(2))
    };
  }

  private generateMockKRStockData(symbol: string) {
    const names: { [key: string]: string } = {
      '005930': '삼성전자',
      '000660': 'SK하이닉스',
      '373220': 'LG에너지솔루션',
      '207940': '삼성바이오로직스',
      '035420': 'NAVER',
      '005380': '현대차',
      '000270': '기아',
      '068270': '셀트리온'
    };

    const basePrices: { [key: string]: number } = {
      '005930': 75000,  // 삼성전자
      '000660': 130000, // SK하이닉스
      '373220': 420000, // LG에너지솔루션
      '207940': 850000, // 삼성바이오로직스
      '035420': 185000, // NAVER
      '005380': 250000, // 현대차
      '000270': 95000,  // 기아
      '068270': 190000  // 셀트리온
    };

    const basePrice = basePrices[symbol] || 50000;
    const changePercent = (Math.random() - 0.5) * 6; // -3% ~ +3%
    const change = Math.round(basePrice * (changePercent / 100));
    
    return {
      symbol,
      name: names[symbol] || '종목명',
      price: basePrice + change,
      change: change,
      changePercent: changePercent.toFixed(2),
      volume: Math.round(Math.random() * 5000000 + 500000), // 50만 ~ 550만
      date: new Date().toISOString().split('T')[0],
      high: basePrice + change + Math.round(Math.random() * 3000),
      low: basePrice + change - Math.round(Math.random() * 3000)
    };
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      'AAPL': 175,
      'MSFT': 380,
      'GOOGL': 140,
      'TSLA': 250,
      'NVDA': 450,
      'AMZN': 150,
      'META': 320
    };
    return basePrices[symbol] || 100;
  }

  private getUSStockName(symbol: string): string {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'TSLA': 'Tesla Inc.',
      'NVDA': 'NVIDIA Corporation',
      'AMZN': 'Amazon.com Inc.',
      'META': 'Meta Platforms Inc.'
    };
    return names[symbol] || `${symbol} Corporation`;
  }
}