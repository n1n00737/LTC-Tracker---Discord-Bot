import QuickChart from 'quickchart-js';
import { AttachmentBuilder } from 'discord.js';

/**
 * Generates a high-definition cryptocurrency chart using QuickChart
 * @param {Object} historyData Output from getLtcHistoricalPrices
 * @param {string} currency Currency symbol ('USD' or 'EUR')
 * @returns {Promise<{ attachment: AttachmentBuilder, filename: string, isBullish: boolean }>}
 */
export async function generateLtcChart(historyData, currency = 'USD') {
  const { labels, prices, min, max, startPrice, endPrice, changePercent, isBullish, timeframe } = historyData;

  const symbol = currency === 'EUR' ? '€' : '$';
  const lineColor = isBullish ? '#00F59B' : '#FF495C';
  const fillColor = isBullish ? 'rgba(0, 245, 155, 0.16)' : 'rgba(255, 73, 92, 0.16)';

  const timeframeLabels = {
    '24h': '24 HOURS',
    '7d': '7 DAYS',
    '30d': '30 DAYS',
    '1y': '1 YEAR'
  };

  const chart = new QuickChart();
  chart.setWidth(900);
  chart.setHeight(440);
  chart.setBackgroundColor('#0E121B'); // TradingView-style dark theme
  chart.setDevicePixelRatio(2.0);

  // Even sampling of horizontal labels
  const step = Math.ceil(labels.length / 8);
  const formattedLabels = labels.map((l, index) => (index % step === 0 || index === labels.length - 1 ? l : ''));

  // Highlight start and end points
  const pointRadiuses = prices.map((_, i) => (i === 0 || i === prices.length - 1 ? 5 : 0));
  const pointBgColors = prices.map((_, i) => (i === 0 || i === prices.length - 1 ? '#FFFFFF' : lineColor));

  const sign = changePercent >= 0 ? '+' : '';

  chart.setConfig({
    type: 'line',
    data: {
      labels: formattedLabels,
      datasets: [
        {
          label: `LTC/${currency}`,
          data: prices,
          borderColor: lineColor,
          borderWidth: 3.2,
          pointRadius: pointRadiuses,
          pointBackgroundColor: pointBgColors,
          pointBorderColor: lineColor,
          pointBorderWidth: 2,
          fill: true,
          backgroundColor: fillColor,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      title: {
        display: true,
        text: `LTC / ${currency}  •  ${timeframeLabels[timeframe] || timeframe}  •  ${endPrice.toFixed(2)} ${symbol} (${sign}${changePercent.toFixed(2)}%)`,
        fontColor: '#F0F4F8',
        fontSize: 17,
        fontStyle: 'bold',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: 22
      },
      legend: {
        display: false
      },
      scales: {
        xAxes: [
          {
            gridLines: {
              display: true,
              color: 'rgba(255, 255, 255, 0.04)',
              zeroLineColor: 'rgba(255, 255, 255, 0.08)'
            },
            ticks: {
              fontColor: '#7E8B9B',
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
              autoSkip: false,
              maxRotation: 0,
              padding: 12
            }
          }
        ],
        yAxes: [
          {
            position: 'right',
            gridLines: {
              display: true,
              color: 'rgba(255, 255, 255, 0.05)',
              zeroLineColor: 'rgba(255, 255, 255, 0.12)'
            },
            ticks: {
              fontColor: '#7E8B9B',
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
              suggestedMin: min * 0.992,
              suggestedMax: max * 1.008,
              padding: 14
            }
          }
        ]
      }
    }
  });

  const buffer = await chart.toBinary();
  const filename = `ltc-chart-${timeframe}-${Date.now()}.png`;
  const attachment = new AttachmentBuilder(buffer, { name: filename });

  return {
    attachment,
    filename,
    isBullish
  };
}
