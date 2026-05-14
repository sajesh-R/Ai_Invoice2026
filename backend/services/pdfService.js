const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Reads the logo image file from frontend assets and converts to Base64 data URL
 * @returns {string|null} Base64 image data URL or null
 */
const getLogoBase64 = () => {
  try {
    const logoPath = path.join(__dirname, '../../frontend/src/components/logo.png');
    if (fs.existsSync(logoPath)) {
      const fileBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${fileBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.error("Error reading logo file in pdfService:", err);
  }
  return null;
};

/**
 * Generates a pixel-perfect HTML template for the invoice
 * @param {object} invoice - Invoice details
 * @param {array} items - Invoice line items
 * @param {object} client - Client details
 * @param {object} user - User/Business owner details
 * @returns {string} - Complete HTML document
 */
const getInvoiceHTMLTemplate = (invoice, items, client, user) => {
  const logoBase64 = getLogoBase64();
  const formattedDueDate = new Date(invoice.due_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const formattedIssueDate = new Date(invoice.created_at || new Date()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const itemsRows = items.map((item, index) => `
    <tr class="item-row">
      <td class="text-center">${index + 1}</td>
      <td class="text-left font-medium text-slate-800">${escapeHtml(item.description)}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">₹${parseFloat(item.rate).toFixed(2)}</td>
      <td class="text-center">${parseFloat(item.gst_vat_percentage)}%</td>
      <td class="text-right font-medium">₹${parseFloat(item.amount).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoice_number}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact;
        }
        .invoice-container {
          width: 210mm;
          height: 297mm;
          padding: 20mm;
          margin: auto;
          box-sizing: border-box;
          position: relative;
        }
        .item-row {
          border-bottom: 1px solid #f1f5f9;
        }
        .item-row:last-child {
          border-bottom: 2px solid #cbd5e1;
        }
        .header-gradient {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        }
      </style>
    </head>
    <body>
      <div class="invoice-container flex flex-col justify-between">
        <div>
          <!-- Header Card -->
          <div class="header-gradient text-white p-8 rounded-2xl flex justify-between items-center shadow-lg mb-8">
            <div>
              <div class="flex items-center gap-2 mb-2">
                ${logoBase64 ? `
                  <div class="bg-white px-4 py-2.5 rounded-xl shadow-sm inline-flex items-center justify-center">
                    <img src="${logoBase64}" alt="anraone" class="h-8 object-contain" style="display: block;" />
                  </div>
                ` : `
                  <span class="text-2xl font-extrabold tracking-tight bg-white text-indigo-600 px-3.5 py-1 rounded-lg shadow-sm">A</span>
                  <h1 class="text-2xl font-extrabold tracking-tight">anraone</h1>
                `}
              </div>
              <p class="text-indigo-100 text-sm font-medium">Billed by ${escapeHtml(user.name)}</p>
              <p class="text-indigo-200 text-xs mt-1">${escapeHtml(user.email)}</p>
            </div>
            <div class="text-right">
              <span class="bg-indigo-500 bg-opacity-30 text-indigo-100 font-semibold px-4 py-1.5 rounded-full text-xs uppercase tracking-wider border border-indigo-400 border-opacity-30">
                ${invoice.status}
              </span>
              <h2 class="text-3xl font-extrabold mt-3">${invoice.invoice_number}</h2>
              <p class="text-indigo-100 text-sm font-medium mt-1">Due Date: ${formattedDueDate}</p>
            </div>
          </div>

          <!-- Invoice Details / Meta -->
          <div class="grid grid-cols-2 gap-12 mb-10 px-2">
            <div>
              <h4 class="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Sender Details</h4>
              <div class="space-y-1 text-sm text-slate-600">
                <p class="font-bold text-slate-800">${escapeHtml(user.name)}</p>
                <p>${escapeHtml(user.email)}</p>
                <p class="text-xs text-slate-400 mt-2">Authorized Representative</p>
              </div>
            </div>
            <div>
              <h4 class="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Invoiced To</h4>
              <div class="space-y-1 text-sm text-slate-600">
                <p class="font-bold text-slate-800">${escapeHtml(client.name)}</p>
                <p class="text-indigo-600 font-medium">${escapeHtml(client.email)}</p>
                ${client.phone ? `<p>${escapeHtml(client.phone)}</p>` : ''}
                ${client.address ? `<p class="whitespace-pre-line text-xs mt-1 text-slate-500">${escapeHtml(client.address)}</p>` : ''}
              </div>
            </div>
          </div>

          <!-- Key Dates Banner -->
          <div class="bg-slate-50 rounded-xl p-4 flex justify-between text-xs text-slate-500 font-medium mb-8 px-6">
            <div>Invoice Date: <span class="text-slate-800 font-semibold">${formattedIssueDate}</span></div>
            <div>Payment Term: <span class="text-slate-800 font-semibold">Immediate</span></div>
            <div>Currency: <span class="text-slate-800 font-semibold">INR (₹)</span></div>
          </div>

          <!-- Items Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-100 text-slate-600 uppercase text-xxs font-bold tracking-wider rounded-lg">
                  <th class="py-3 px-4 text-center rounded-l-lg" style="width: 8%">#</th>
                  <th class="py-3 px-4 text-left" style="width: 47%">Description</th>
                  <th class="py-3 px-4 text-center" style="width: 10%">Qty</th>
                  <th class="py-3 px-4 text-right" style="width: 12%">Rate</th>
                  <th class="py-3 px-4 text-center" style="width: 10%">Tax %</th>
                  <th class="py-3 px-4 text-right rounded-r-lg" style="width: 13%">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Calculations and Totals Section -->
        <div>
          <div class="flex justify-end mt-8">
            <div class="w-1/3 space-y-3 text-sm">
              <div class="flex justify-between text-slate-400 font-medium">
                <span>Subtotal (excluding tax):</span>
                <span class="font-medium text-slate-800">₹${(parseFloat(invoice.total_amount) - parseFloat(invoice.gst_vat_amount)).toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-slate-400 font-medium">
                <span>GST / VAT Tax Amount:</span>
                <span class="font-medium text-indigo-600">+₹${parseFloat(invoice.gst_vat_amount).toFixed(2)}</span>
              </div>
              <div class="border-b border-slate-200/60 my-1"></div>
              <div class="flex justify-between text-slate-800 font-extrabold mt-1">
                <span>Invoiced Total:</span>
                <span class="text-lg text-slate-900">₹${parseFloat(invoice.total_amount).toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-emerald-600 font-bold mt-1">
                <span>Total Paid Amount:</span>
                <span>₹${parseFloat(invoice.paid_amount).toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-red-600 font-extrabold border-t border-slate-200/60 pt-2 text-sm mt-1">
                <span>Remaining Balance:</span>
                <span>₹${parseFloat(invoice.balance_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Footer -->
          <div class="border-t border-slate-100 pt-10 mt-12 text-center text-xs text-slate-400">
            <p class="font-semibold text-slate-500 mb-1">Thank you for your business!</p>
            <p>If you have any questions concerning this invoice, contact us at ${escapeHtml(user.email)}.</p>
            <p class="mt-4 text-xxs tracking-wider text-slate-300">Generated automatically by anraone System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Simple HTML escaping helper to prevent script injection in the generated PDF
const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Fallback PDF generation using PDFKit (handles failures in headless browser sandbox environments)
 */
const generatePDFKitFallback = (invoice, items, client, user, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // --- Color Palette ---
      const primaryColor = '#4f46e5';
      const secondaryColor = '#7c3aed';
      const darkSlate = '#1e293b';
      const lightSlate = '#f1f5f9';
      const mutedGrey = '#64748b';

      // --- Title & Header ---
      const logoPath = path.join(__dirname, '../../frontend/src/components/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { height: 26 });
      } else {
        doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold').text('anraone', 50, 50);
      }
      doc.fillColor(mutedGrey).fontSize(10).font('Helvetica').text(`Billed by ${user.name} (${user.email})`, 50, 80);

      // --- Status Badge & Invoice Details (Right Aligned) ---
      doc.fillColor(secondaryColor).fontSize(12).font('Helvetica-Bold').text(`STATUS: ${invoice.status.toUpperCase()}`, 380, 50, { align: 'right' });
      doc.fillColor(darkSlate).fontSize(14).font('Helvetica-Bold').text(invoice.invoice_number, 380, 70, { align: 'right' });
      doc.fillColor(mutedGrey).fontSize(10).font('Helvetica').text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 380, 90, { align: 'right' });

      // Divider
      doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#cbd5e1').lineWidth(1).stroke();

      // --- Billing Details ---
      doc.fillColor(mutedGrey).fontSize(10).font('Helvetica-Bold').text('SENDER DETAILS', 50, 140);
      doc.fillColor(darkSlate).fontSize(11).font('Helvetica-Bold').text(user.name, 50, 155);
      doc.fillColor(mutedGrey).fontSize(10).font('Helvetica').text(user.email, 50, 170);

      doc.fillColor(mutedGrey).fontSize(10).font('Helvetica-Bold').text('INVOICED TO', 300, 140);
      doc.fillColor(darkSlate).fontSize(11).font('Helvetica-Bold').text(client.name, 300, 155);
      doc.fillColor(mutedGrey).fontSize(10).font('Helvetica').text(client.email, 300, 170);
      if (client.phone) doc.text(client.phone, 300, 185);
      if (client.address) doc.fontSize(9).text(client.address, 300, 200, { width: 245 });

      // --- Items Table ---
      const tableTop = 270;
      doc.fillColor(darkSlate).fontSize(10).font('Helvetica-Bold');
      doc.text('#', 50, tableTop, { width: 30 });
      doc.text('Description', 80, tableTop, { width: 220 });
      doc.text('Qty', 300, tableTop, { width: 40, align: 'center' });
      doc.text('Rate', 340, tableTop, { width: 60, align: 'right' });
      doc.text('Tax %', 410, tableTop, { width: 50, align: 'center' });
      doc.text('Amount', 470, tableTop, { width: 75, align: 'right' });

      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor(darkSlate).lineWidth(1.5).stroke();

      let currentY = tableTop + 25;
      items.forEach((item, index) => {
        doc.fillColor(darkSlate).fontSize(9).font('Helvetica');
        doc.text(index + 1, 50, currentY, { width: 30 });
        doc.text(item.description, 80, currentY, { width: 220 });
        doc.text(item.quantity, 300, currentY, { width: 40, align: 'center' });
        doc.text(`₹${parseFloat(item.rate).toFixed(2)}`, 340, currentY, { width: 60, align: 'right' });
        doc.text(`${parseFloat(item.gst_vat_percentage)}%`, 410, currentY, { width: 50, align: 'center' });
        doc.font('Helvetica-Bold').text(`₹${parseFloat(item.amount).toFixed(2)}`, 470, currentY, { width: 75, align: 'right' });

        currentY += 20;
        doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      });

      // --- Totals Summary ---
      currentY += 15;
      const subtotal = parseFloat(invoice.total_amount) - parseFloat(invoice.gst_vat_amount);
      
      doc.fillColor(mutedGrey).fontSize(9).font('Helvetica');
      doc.text('Subtotal (excluding tax):', 300, currentY, { width: 160, align: 'right' });
      doc.fillColor(darkSlate).font('Helvetica-Bold').text(`₹${subtotal.toFixed(2)}`, 470, currentY, { width: 75, align: 'right' });

      currentY += 15;
      doc.fillColor(mutedGrey).font('Helvetica-Bold').text('GST / VAT Tax Amount:', 300, currentY, { width: 160, align: 'right' });
      doc.fillColor(secondaryColor).font('Helvetica-Bold').text(`+₹${parseFloat(invoice.gst_vat_amount).toFixed(2)}`, 470, currentY, { width: 75, align: 'right' });

      currentY += 20;
      doc.moveTo(340, currentY - 5).lineTo(545, currentY - 5).strokeColor('#cbd5e1').lineWidth(1).stroke();

      doc.fillColor(darkSlate).fontSize(11).font('Helvetica-Bold');
      doc.text('Total Amount:', 340, currentY, { width: 120, align: 'right' });
      doc.text(`₹${parseFloat(invoice.total_amount).toFixed(2)}`, 470, currentY, { width: 75, align: 'right' });

      currentY += 15;
      doc.fillColor('#16a34a').fontSize(10).font('Helvetica-Bold');
      doc.text('Paid Amount:', 340, currentY, { width: 120, align: 'right' });
      doc.text(`₹${parseFloat(invoice.paid_amount).toFixed(2)}`, 470, currentY, { width: 75, align: 'right' });

      currentY += 18;
      doc.fillColor('#dc2626').fontSize(11).font('Helvetica-Bold');
      doc.text('Balance Due:', 340, currentY, { width: 120, align: 'right' });
      doc.text(`₹${parseFloat(invoice.balance_amount).toFixed(2)}`, 470, currentY, { width: 75, align: 'right' });

      // --- Footer ---
      doc.fillColor(mutedGrey).fontSize(10).font('Helvetica-Bold').text('Thank you for your business!', 50, 720, { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`If you have any questions concerning this invoice, contact us at ${user.email}.`, 50, 735, { align: 'center' });
      doc.fillColor('#cbd5e1').fontSize(7).text('Generated automatically by anraone System', 50, 760, { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        console.log("PDFKit Fallback PDF generated successfully!");
        resolve(outputPath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * High-performance PDF generation service
 * Tries to generate via Puppeteer, falls back to PDFKit if headless chromium fails
 * @param {object} invoice - Database invoice record
 * @param {array} items - Invoice line items array
 * @param {object} client - Client record
 * @param {object} user - User record (business owner)
 * @returns {Promise<string>} - Absolute path to the generated PDF file
 */
const generateInvoicePDF = async (invoice, items, client, user) => {
  const tempDir = path.join(__dirname, '../temp_pdfs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileName = `invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9-_]/g, '_')}_${Date.now()}.pdf`;
  const outputPath = path.join(tempDir, fileName);

  try {
    console.log(`Starting PDF generation for invoice ${invoice.invoice_number}...`);
    const htmlContent = getInvoiceHTMLTemplate(invoice, items, client, user);

    // Launch Puppeteer with sandbox-friendly arguments
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Pixel-perfect A4 PDF setting
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        bottom: '0px',
        left: '0px',
        right: '0px'
      }
    });

    await browser.close();
    console.log("Puppeteer PDF generated successfully!");
    return outputPath;
  } catch (error) {
    console.error(`Puppeteer PDF generation failed: ${error.message}`);
    console.log("Attempting PDFKit fallback generation...");
    try {
      return await generatePDFKitFallback(invoice, items, client, user, outputPath);
    } catch (fallbackError) {
      console.error(`PDFKit fallback generation also failed: ${fallbackError.message}`);
      throw new Error(`Failed to generate PDF: ${fallbackError.message}`);
    }
  }
};

module.exports = {
  generateInvoicePDF
};
