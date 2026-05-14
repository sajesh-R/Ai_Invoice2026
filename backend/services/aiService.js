const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Intelligent Fallback Mock Analyzer when GEMINI_API_KEY is absent
 * Parsers numbers, pricing, and keywords to create highly convincing item drafts
 */
const parsePromptRuleBased = (prompt) => {
  const lowercasePrompt = prompt.toLowerCase();
  const items = [];

  // 1. Try to extract numbers
  // Regex to find patterns like: "10 hours", "5 days", "3 items", "12 units"
  const qtyRegex = /(\d+)\s*(hour|day|week|month|item|unit|qty|pc|page|license|hr|x)/gi;
  // Regex to find pricing like: "$150", "€200", "150 dollars", "rate of 75"
  const rateRegex = /(?:[\$\€\£\₹]|\brate\s*of\s*|price\s*of\s*)?(\d+(?:\.\d{1,2})?)\s*(?:\/|\bper\b|\bdollar|\beuro|\brupee|\binr)?/gi;
  // Regex to find tax percentages: "18% tax", "12% gst", "5% vat", "tax is 28"
  const taxRegex = /(\d+(?:\.\d{1,2})?)\s*%\s*(?:tax|gst|vat)?/i;

  // Extract Tax if any
  let taxPct = 18.00; // Default fallback
  const taxMatch = lowercasePrompt.match(taxRegex);
  if (taxMatch) {
    const val = parseFloat(taxMatch[1]);
    if ([0, 5, 12, 18, 28].includes(val)) {
      taxPct = val;
    }
  }

  // Look for quantities first
  const quantities = [];
  const quantityValues = [];
  let qMatch;
  while ((qMatch = qtyRegex.exec(lowercasePrompt)) !== null) {
    const qVal = parseInt(qMatch[1]);
    quantities.push(qVal);
    quantityValues.push(qVal);
  }

  // Look for rate/price values, skipping numbers that were already parsed as quantities
  const rates = [];
  let rMatch;
  while ((rMatch = rateRegex.exec(lowercasePrompt)) !== null) {
    const val = parseFloat(rMatch[1]);
    if (val > 0 && val < 500000 && !lowercasePrompt.includes(`${val}%`) && !quantityValues.includes(val)) {
      rates.push(val);
    }
  }

  // Parse common domains
  const categories = [
    { key: 'consulting', keywords: ['consulting', 'advisory', 'consult', 'strategy', 'meeting'], desc: 'Professional Consulting Services' },
    { key: 'development', keywords: ['development', 'developer', 'code', 'coding', 'programming', 'software', 'app', 'website', 'backend', 'frontend'], desc: 'Custom Software Development Services' },
    { key: 'design', keywords: ['design', 'ui', 'ux', 'graphic', 'logo', 'branding', 'wireframe', 'artwork'], desc: 'Creative Branding & UI/UX Design' },
    { key: 'marketing', keywords: ['marketing', 'seo', 'ads', 'campaign', 'social media', 'advertising', 'copywriting'], desc: 'Digital Marketing & SEO Campaign Management' },
    { key: 'retainer', keywords: ['retainer', 'monthly subscription', 'ongoing support', 'maintenance'], desc: 'Monthly Support & Maintenance Retainer' },
    { key: 'license', keywords: ['license', 'subscription', 'software key', 'access code'], desc: 'SaaS Software Enterprise License' },
  ];

  // Try to match keywords to create elegant items
  let matchedCategory = null;
  for (const cat of categories) {
    if (cat.keywords.some(kw => lowercasePrompt.includes(kw))) {
      matchedCategory = cat;
      break;
    }
  }

  // Build the suggested item
  let finalQty = quantities[0] || 1;
  let finalRate = rates[0] || 150; // Default consulting rate
  let finalDesc = matchedCategory ? matchedCategory.desc : 'AI-Suggested Professional Services';

  // Customize description based on specific matches if we can find them
  if (lowercasePrompt.includes('website')) finalDesc = 'Custom Website Development & Hosting';
  else if (lowercasePrompt.includes('logo')) finalDesc = 'Custom Corporate Logo & Brand Identity Package';
  else if (lowercasePrompt.includes('retainer')) finalDesc = 'Monthly Business Consulting Retainer';
  else if (lowercasePrompt.includes('audit')) finalDesc = 'Security & Performance Audit Report';

  items.push({
    description: finalDesc,
    quantity: finalQty,
    rate: finalRate,
    gst_vat_percentage: taxPct
  });

  // If there are multiple items or values mentioned, try to create a secondary line item
  if (rates.length > 1) {
    let secondDesc = 'Supplementary Services & Setup';
    if (lowercasePrompt.includes('design') && lowercasePrompt.includes('development')) {
      items[0].description = 'Enterprise Web Development Services';
      secondDesc = 'UI/UX Visual Design Layouts';
    } else if (lowercasePrompt.includes('marketing') && lowercasePrompt.includes('seo')) {
      items[0].description = 'Comprehensive Search Engine Optimization (SEO)';
      secondDesc = 'Social Media Ads Campaigns Setup';
    }
    
    items.push({
      description: secondDesc,
      quantity: quantities[1] || 1,
      rate: rates[1],
      gst_vat_percentage: taxPct
    });
  }

  // Suggest due date: Check if "due in 30 days" or "due in 7 days" is specified
  let suggestedDueDate = null;
  const daysRegex = /due\s*in\s*(\d+)\s*days/i;
  const daysMatch = lowercasePrompt.match(daysRegex);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const d = new Date();
    d.setDate(d.getDate() + days);
    suggestedDueDate = d.toISOString().split('T')[0];
  }

  return {
    items,
    suggested_due_date: suggestedDueDate
  };
};

/**
 * Core AI Analysis and Draft compiler
 */
const generateInvoiceDraftFromPrompt = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("⚠️  GEMINI_API_KEY is absent. Running smart rule-based local parser in sandbox mode!");
    return parsePromptRuleBased(prompt);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash for speed, structured JSON response configuration
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const systemInstruction = `You are a professional Invoice Generator AI. Analyze the user requirement prompt and compile/suggest structured invoice line items.
Format your response as a valid JSON object containing exactly:
1. "items": An array of objects, where each object has:
   - "description" (string, clear, highly detailed, professional)
   - "quantity" (integer, positive number, default to 1 if not specified)
   - "rate" (number, rate per item, default to a realistic professional value if not specified)
   - "gst_vat_percentage" (number, tax percentage, choose from standard regional brackets [0, 5, 12, 18, 28]. Default is 18.00)
2. "suggested_due_date" (string in "YYYY-MM-DD" format, optional, suggest only if a timeframe like "by end of month", "in 30 days", or a specific date is mentioned or implied in the prompt. Otherwise, return null)

Examples of prompts and pricing options:
- Prompt: "consulting for 5 hours at $200 with 18% vat" -> items: [{description: "Professional Consulting Services", quantity: 5, rate: 200, gst_vat_percentage: 18}]
- Prompt: "logo branding project for $1500" -> items: [{description: "Creative Logo Design & Corporate Branding Package", quantity: 1, rate: 1500, gst_vat_percentage: 18}]

Ensure the JSON output is strictly valid and contains no markdown tags or notes outside the JSON object.`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `User Prompt: "${prompt}"\n\nPlease compile the draft.` }] }
      ],
      systemInstruction: systemInstruction
    });

    const responseText = result.response.text().trim();
    const data = JSON.parse(responseText);

    // Guard rails / standard format normalization
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Invalid output layout: items list is empty or absent.");
    }

    const cleanedItems = data.items.map(item => {
      let tax = parseFloat(item.gst_vat_percentage);
      if (isNaN(tax) || ![0, 5, 12, 18, 28].includes(tax)) {
        tax = 18.00;
      }
      return {
        description: String(item.description || "AI Consulting Support"),
        quantity: parseInt(item.quantity) || 1,
        rate: parseFloat(item.rate) || 100.00,
        gst_vat_percentage: tax
      };
    });

    return {
      items: cleanedItems,
      suggested_due_date: data.suggested_due_date || null
    };

  } catch (error) {
    console.error(`AI Model Generation failed: ${error.message}. Dropping back to local rules parser...`);
    return parsePromptRuleBased(prompt);
  }
};

module.exports = {
  generateInvoiceDraftFromPrompt
};
