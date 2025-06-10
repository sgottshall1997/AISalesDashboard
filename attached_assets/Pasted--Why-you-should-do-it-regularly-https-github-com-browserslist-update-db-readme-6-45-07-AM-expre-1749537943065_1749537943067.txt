 Why you should do it regularly: https://github.com/browserslist/update-db#readme
6:45:07 AM [express] GET /api/dashboard/stats 304 in 710ms :: {"outstandingInvoices":539700,"overdue…
6:45:09 AM [express] GET /api/ai/content-suggestions 200 in 10ms
6:45:09 AM [express] GET /api/content-reports 304 in 82ms :: [{"id":16,"title":"WILTW_2025-06-05","t…
6:45:09 AM [express] GET /api/clients 304 in 316ms :: [{"id":1,"name":"Sarah Johnson","email":"sarah…
Parsing debug - using original PDF content: {
  requestedReportId: '17',
  availableReports: [
    { id: 16, title: 'WILTW_2025-06-05', hasContent: true },
    { id: 17, title: 'WILTW_2025-05-29', hasContent: true }
  ],
  foundReport: {
    id: 17,
    title: 'WILTW_2025-05-29',
    hasContent: true,
    contentPreview: 'WILTW Weekly Report - Investment Research Insights\n' +
      '\n' +
      'Table of Contents:\n' +
      '01 Strategy & Asset Allocatio'
  }
}
Full content check: {
  reportId: 17,
  reportTitle: 'WILTW_2025-05-29',
  hasFullContent: true,
  fullContentLength: 2394,
  fullContentPreview: 'WILTW Weekly Report - Investment Research Insights\n' +
    '\n' +
    'Table of Contents:\n' +
    '01 Strategy & Asset Allocation & Performance of High Conviction Ideas\n' +
    '02 China Market Analysis - Recent Findings from Regional Visit\n' +
    '03 USD Index Risks and "Revenge Tax" Implications for Foreign Asset Holders\n' +
    '04 Religious Resurge',
  containsChina: true,
  containsCriticalMinerals: false,
  containsMining: true,
  willUsePDFContent: true
}
Content being sent to AI: {
  contentLength: 2394,
  contentPreview: 'WILTW Weekly Report - Investment Research Insights\n' +
    '\n' +
    'Table of Contents:\n' +
    '01 Strategy & Asset Allocation & Performance of High Conviction Ideas\n' +
    '02 China Market Analysis - Recent Findings from Regional Visit\n' +
    '03 USD Index Risks and "Revenge Tax" Implications for Foreign Asset Holders\n' +
    '04 Religious Resurgence Among Gen Z and Young Demographics\n' +
    '05 European Union Barriers and Potential Trump Policy Impacts\n' +
    '06 Terrorism and Future Warfare Considerations\n' +
    '07 U.S. Critical Minerals Partnerships - Gulf States',
  contentMiddle: ' Analysis Part I\n' +
    '08 AI Adoption Productivity Gaps and Revenue Implications\n' +
    '09 Chinese Shareholder Movement and Emerging Dividend Culture\n' +
    '10 Global Water Crisis - Peak Water and Groundwater Depletion\n' +
    '11 Greek Mythology Lessons for Modern Markets\n' +
    '12 Essential Reading for Young Investors\n' +
    '\n' +
    'Article Summaries:\n' +
    '\n' +
    'Strategy & Asset Allocation Analysis:\n' +
    'Our high conviction portfolio shows 19.6% YTD gains vs S&P 500, driven by 35.5% allocation to precious metals and 15% to Chinese equities. Commodity leader',
  contentEnd: '\n' +
    'AI Productivity Analysis:\n' +
    'Widespread adoption shows scattered productivity gains with limited revenue impact. Implementation challenges across enterprise sectors remain significant.\n' +
    '\n' +
    'Investment Implications:\n' +
    '- Increase commodity exposure, particularly precious metals\n' +
    '- Consider Chinese equity allocation amid dividend culture shift\n' +
    '- Monitor USD risks and alternative reserve currency trends\n' +
    '- Focus on critical minerals supply chain opportunities\n' +
    '- Evaluate AI infrastructure investments carefully',
  isUsingFullContent: true,
  containsActualTopics: {
    criticalMinerals: true,
    chinaWeaponization: false,
    miningStocks: true,
    loneliness: false,
    hasArticleContent: false,
    justTableOfContents: false
  }
}
