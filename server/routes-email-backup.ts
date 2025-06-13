// AI email generation for leads - CLEAN VERSION
app.post("/api/ai/generate-lead-email", async (req: Request, res: Response) => {
  try {
    const { lead, emailHistory, contentReports, selectedReportIds } = req.body;
    
    if (!lead) {
      return res.status(400).json({ error: "Lead data is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ 
        error: "OpenAI API key not configured. Please provide your API key to enable AI-powered email generation." 
      });
    }

    // Get lead's email history from database if not provided
    let leadEmailHistory = emailHistory;
    if (!leadEmailHistory) {
      leadEmailHistory = await storage.getLeadEmailHistory(lead.id);
    }

    // Get stored summaries for all selected reports
    let selectedReportSummaries = [];
    if (selectedReportIds && selectedReportIds.length > 0) {
      for (const reportId of selectedReportIds) {
        const summary = await storage.getReportSummary(reportId);
        if (summary) {
          selectedReportSummaries.push(summary);
        }
      }
    }

    // Find relevant reports based on lead's interests
    const relevantReports = (contentReports || []).filter((report: any) => 
      report.tags && lead.interest_tags && 
      report.tags.some((tag: string) => lead.interest_tags.includes(tag))
    );

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Prepare report content for the prompt - combine all selected reports
    let combinedReportContent = '';
    let reportTitles = [];
    let allReportTags = [];
    
    if (selectedReportSummaries.length > 0) {
      for (const summary of selectedReportSummaries) {
        // Get the content report from database
        let contentReport = null;
        if (contentReports && contentReports.length > 0) {
          contentReport = contentReports.find((report: any) => report.id === summary.content_report_id);
        } else {
          // Fetch from database if not provided
          const allReports = await storage.getAllContentReports();
          contentReport = allReports.find(report => report.id === summary.content_report_id);
        }
        
        if (contentReport) {
          reportTitles.push(contentReport.title);
          if (contentReport.tags) {
            allReportTags.push(...contentReport.tags);
          }
          
          // Add this report's content with clear separation
          combinedReportContent += `\n\n--- ${contentReport.title} ---\n`;
          combinedReportContent += summary.parsed_summary || '';
        }
      }
    } else if (selectedReportSummaries.length === 0 && (contentReports || []).length > 0) {
      // Fallback to first available report if no specific selection
      const firstReport = contentReports[0];
      reportTitles.push(firstReport.title);
      if (firstReport.tags) {
        allReportTags.push(...firstReport.tags);
      }
    }
    
    const reportTitle = reportTitles.length > 0 ? reportTitles.join(', ') : 'Recent 13D Reports';
    const reportTags = Array.from(new Set(allReportTags)).join(', ');
    const reportSummary = combinedReportContent || '';

    // Extract non-market topics from combined content
    let nonMarketTopics = '';
    
    if (reportSummary) {
      // Look for non-market content indicators in the combined summary
      const hasNonMarketContent = reportSummary.toLowerCase().includes('teenager') || 
                                 reportSummary.toLowerCase().includes('phone') ||
                                 reportSummary.toLowerCase().includes('sustainable') ||
                                 reportSummary.toLowerCase().includes('aesop') ||
                                 reportSummary.toLowerCase().includes('fable') ||
                                 reportSummary.toLowerCase().includes('wisdom') ||
                                 reportSummary.toLowerCase().includes('loneliness') ||
                                 reportSummary.toLowerCase().includes('culture') ||
                                 reportSummary.toLowerCase().includes('philosophy');
      
      if (hasNonMarketContent) {
        nonMarketTopics = `The reports also explore cultural insights and life wisdom to provide readers with perspective beyond the financial world.`;
      }
    }

    // Filter out Article 1 content from summary with enhanced detection
    let filteredSummary = reportSummary;
    if (reportSummary) {
      // Remove entire problematic sections and specific Article 1 phrases
      filteredSummary = filteredSummary
        // Remove core investment thesis section
        .replace(/\*\*Core Investment Thesis:\*\*[\s\S]*?(?=\n\*\*[^*]|\n- \*\*[^*]|$)/gi, '')
        // Remove asset allocation sections
        .replace(/- \*\*Asset allocation recommendations:\*\*[\s\S]*?(?=\n- \*\*[^*]|\n\*\*[^*]|$)/gi, '')
        .replace(/- \*\*Portfolio Allocation Recommendations:\*\*[\s\S]*?(?=\n- \*\*[^*]|\n\*\*[^*]|$)/gi, '')
        .replace(/- \*\*Percentage allocations by sector[\s\S]*?(?=\n- \*\*[^*]|\n\*\*[^*]|$)/gi, '')
        .replace(/- \*\*Strategic positioning advice:\*\*[\s\S]*?(?=\n- \*\*[^*]|\n\*\*[^*]|$)/gi, '')
        // Remove specific problematic phrases
        .replace(/outperform major stock indices/gi, '')
        .replace(/outperform major U\.S\. indices/gi, '')
        .replace(/strategic asset allocation/gi, '')
        .replace(/paradigm shift towards commodities/gi, '')
        .replace(/Gold, silver, and mining stocks \([^)]+\)/gi, '')
        .replace(/commodities and related sectors \([^)]+\)/gi, '')
        .replace(/Chinese equity markets \([^)]+\)/gi, '')
        // Clean up formatting
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/\n\s*$/, '')
        .trim();
    }

    // Prepare streamlined context
    const hasEmailHistory = leadEmailHistory && leadEmailHistory.length > 0;
    const recentEmails = hasEmailHistory ? leadEmailHistory.slice(-2) : []; // Only last 2 emails to avoid prompt bloat
    
    const contextNotes = [];
    if (lead.notes) contextNotes.push(`Notes: ${lead.notes}`);
    if (hasEmailHistory) contextNotes.push(`Previous contact established (${recentEmails.length} recent emails)`);
    if (lead.last_contact_date) contextNotes.push(`Last contact: ${new Date(lead.last_contact_date).toLocaleDateString()}`);

    const emailPrompt = `Generate a personalized, concise prospect email for ${lead.name} at ${lead.company}. This is a ${lead.stage} stage lead with interests in: ${lead.interest_tags?.join(', ') || 'investment research'}.

CONTEXT: ${contextNotes.length > 0 ? contextNotes.join(' | ') : 'First outreach to this lead'}
${hasEmailHistory ? 'IMPORTANT: This is a follow-up email - reference prior relationship naturally and avoid repeating previously covered topics.' : ''}

${selectedReportSummaries.length > 0 ? `Reference the recent 13D reports: "${reportTitle}". ONLY use insights from Article 2 onward. DO NOT use content from Article 1 ('Strategy & Asset Allocation & Performance of High Conviction Ideas'). Here's the combined report content: "${filteredSummary}". The reports cover: ${reportTags}.

${selectedReportIds && selectedReportIds.length > 1 ? 
`MANDATORY REQUIREMENT: You MUST end every single bullet point with (REPORT_TITLE - Article X) where REPORT_TITLE is the specific report name and X is the specific article number from that report. Use exactly 3 DIFFERENT article numbers from potentially different reports - never repeat the same article number twice. This is absolutely required - no exceptions.

CRITICAL DISTRIBUTION RULE: When multiple reports are available, you MUST pull insights from DIFFERENT reports. Do NOT take all 3 bullet points from the same report. Mix insights across the available reports to show breadth of coverage.

Available reports and their articles:
${selectedReportSummaries.map(summary => {
  const contentReport = contentReports?.find((report: any) => report.id === summary.content_report_id);
  return contentReport ? `${contentReport.title}:
Article 2 = Critical minerals supply chain
Article 3 = AI tech infrastructure  
Article 4 = Mining stocks performance
Article 5 = Teenagers phone experiment
Article 6 = Loneliness investment theme
Article 7 = Russia analysis
Article 8 = European agriculture` : '';
}).join('\n\n')}

Example format (MANDATORY - notice 3 DIFFERENT citations from DIFFERENT reports):
• China controls 78% of critical minerals needed for U.S. weapons production, creating national security vulnerabilities (WILTW_2025-06-05 - Article 2).
• Mining sector outperforms due to reshoring challenges and decades of underinvestment in domestic capacity (WILTW_2025-05-29 - Article 4).
• Russia's geopolitical strategies are often misunderstood by analysts who lack perspective on Russian national interests (WILTW_2025-05-22 - Article 7).

CRITICAL: Each bullet point MUST include the specific report title and a DIFFERENT article number. Distribute insights across different reports when multiple are available.` :
`IMPORTANT: Since only one report is selected, DO NOT include article citations or reference numbers. Present the insights naturally without any (Article X) citations.`}` : ''}

GOALS:
• Greet the reader warmly with a short intro that references any prior context appropriately
• Acknowledge their stated investment interests (from ${lead.interest_tags?.join(', ') || 'general investment research'}${lead.notes ? ` or Notes: ${lead.notes}` : ''} if applicable)
• If this is a follow-up email, reference previous conversations naturally without being repetitive
• Explain why this specific report is relevant to their strategy and interests
• Summarize 2–3 high-impact insights using concise bullets that complement (don't repeat) previous communications
• End with a conclusion summarizing 13D's market view and how our research helps investors stay ahead
• Include a clear CTA appropriate for their lead stage (${lead.stage}) and relationship history

HARD RULES:
• TOTAL word count must not exceed **280 words**
• Use **friendly but professional tone**
• Paragraph format is fine, but use bullets for the insights section
• DO NOT use phrases like "Article 1," "titled," or "the report outlines"
• Include a short paragraph (~30 words) about non-market topics from the report${nonMarketTopics ? `: "${nonMarketTopics}"` : ' — such as culture, values, or timeless ideas — to provide readers with perspective beyond the financial world'}

STRUCTURE TO FOLLOW:

---

**Subject**: [Natural, conversational subject line – max 8 words]

Hi ${lead.name},

[Natural greeting with seasonal/personal touch] I was going through one of our latest reports and [conversational transition about why this matters to them based on their interests].

[Present 3 market insights as bullet points with detailed analysis and implications]

More broadly, [broader market perspective in casual, natural language].

[If non-market topics exist, weave them in naturally like: "The report also includes an unexpected section on [topic] and how [relevance]—definitely not your typical market writeup, but pretty fascinating."]

Let me know if you'd like me to dig up anything specific or send over past reports that line up with this view.

Best,
Spencer

---

TONE GUIDELINES:
• Write like Spencer is personally sharing insights with a colleague
• Use natural, conversational language: "Hope you're doing well", "I was going through", "thought you might find this interesting"
• Vary sentence structure - mix short punchy statements with longer explanatory ones
• Include casual transitions: "More broadly", "And", "Plus"
• Present 3 market insights as clear bullet points with substantive detail
• End casually: "Let me know if you'd like me to dig up anything specific"
• Avoid corporate speak - sound human and approachable
• Use seasonal references: "Hope you're enjoying the start of summer"
• Include conversational connectors: "And", "Plus", "More broadly"
• Mix sentence lengths for natural rhythm
• End with casual helpfulness rather than formal CTAs

EXAMPLE:

**Subject**: Gold, USD Weakness, and China Tailwinds

Hi Monica,

I hope you're doing well. Based on our recent discussion around precious metals and geopolitics, I wanted to share a few key insights from a report that closely aligns with your strategic focus:

• Gold miners are outperforming major U.S. indices, reflecting rising inflation expectations and growing demand for hard asset hedges.
• The U.S. dollar's downtrend is driving increased interest in commodities as a diversification tool.
• China's domestic pivot and global partnerships are reinforcing economic resilience — a compelling case for exposure to Chinese equities.

We're seeing a broad rotation into hard assets and geopolitically resilient markets. At 13D, our research is designed to help investors like you get ahead of these structural shifts before they become consensus.

Let me know if you would like me to pull some older reports on specific topics of interest.

Spencer`;

    const emailResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Spencer from 13D Research. MANDATORY FORMATTING: After the opening line, you MUST use bullet points with '•' symbols for market insights. Example format:\n\nHope you're enjoying the start of summer! I was reviewing one of our latest reports and thought a few insights might resonate with your focus on [interests]:\n\n• First market insight with analysis.\n• Second market insight with implications.\n• Third market insight with strategic perspective.\n\nMore broadly, we're seeing a meaningful shift into [theme]. At 13D, our work centers on helping investors anticipate structural trends like these—before they hit the mainstream narrative.\n\nOn a different note, the report also explores [cultural topic]—an unexpected but thought-provoking angle.\n\nLet me know if you'd like me to send over past reports aligned with any of these themes.\n\nBest,\nSpencer\n\nDO NOT write paragraph format. USE BULLETS."
        },
        {
          role: "user",
          content: emailPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    let emailSuggestion = emailResponse.choices[0].message.content || "Follow-up email";
    
    // Red flag safeguard: Check for Article 1 content leakage
    const article1Indicators = [
      'outperform major stock indices',
      'outperform major U.S. indices', 
      'paradigm shift towards commodities',
      'high conviction ideas',
      'Gold, silver, and mining stocks \\(',
      'commodities and related sectors \\(',
      'Chinese equity markets \\('
    ];
    
    const hasArticle1Content = article1Indicators.some(indicator => 
      new RegExp(indicator, 'i').test(emailSuggestion)
    );
    
    if (hasArticle1Content) {
      console.warn('⚠️ Article 1 content may have leaked into the email. Check prompt filtering.');
      console.warn('Email content:', emailSuggestion.substring(0, 200) + '...');
    }
    
    // Enforce strict 280-word limit with post-processing
    const words = emailSuggestion.split(/\s+/);
    if (words.length > 280) {
      // Truncate to 280 words and ensure proper ending
      const truncated = words.slice(0, 278).join(' ');
      emailSuggestion = truncated + "... Let me know if you'd like to discuss further.";
    }
    
    res.json({ emailSuggestion });
  } catch (error) {
    console.error("Generate lead email error:", error);
    res.status(500).json({ 
      message: "Failed to generate AI email",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});