import { SaleRecord, Barber, Product, ShopConfig, Expense, ShareConfig, Payslip } from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Render HTML content inside an isolated offscreen iframe to prevent html2canvas
 * from touching main document stylesheets that contain OKLCH colors.
 */
export async function renderHtmlContentToCanvas(
  htmlContent: string,
  width: number = 840
): Promise<HTMLCanvasElement> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '-9999px';
  iframe.style.width = `${width}px`;
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Unable to access iframe document');
    }

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Allow browser to calculate layout and dimensions
    await new Promise((resolve) => setTimeout(resolve, 150));

    const bodyHeight = Math.max(
      iframeDoc.body.scrollHeight,
      iframeDoc.documentElement.scrollHeight,
      800
    );
    iframe.style.height = `${bodyHeight + 50}px`;

    const canvasPromise = html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: width,
      width: width,
      height: bodyHeight
    });

    // Safety timeout: 10 seconds max
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF Canvas generation timed out')), 10000)
    );

    const canvas = await Promise.race([canvasPromise, timeoutPromise]);
    return canvas;
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Safe wrapper around html2canvas to prevent crashes caused by modern OKLCH CSS colors
 * in Tailwind CSS v4 stylesheets.
 */
export async function renderHtml2CanvasSafely(
  element: HTMLElement,
  options?: any
): Promise<HTMLCanvasElement> {
  const width = options?.windowWidth || options?.width || element.offsetWidth || 840;
  const content = element.outerHTML || element.innerHTML;
  return renderHtmlContentToCanvas(content, width);
}

// Format currency
export function formatBaht(amount: number): string {
  const hasDecimals = Math.abs(amount - Math.round(amount)) > 1e-9;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(amount).replace('฿', '฿ ');
}

export function formatBahtWithDecimals(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('฿', '฿ ');
}

// Convert date to Thai format (e.g. 9 มิถุนายน 2569)
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}

// Convert month string YYYY-MM to Thai month (e.g. มิถุนายน 2569)
export function formatThaiMonth(yearMonth: string): string {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  const thYear = parseInt(year, 10) + 543;
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${months[monthIndex]} ${thYear}`;
}

// Calculate split payment cash vs transfer breakdown safely for any sale record
export function getSalePaymentBreakdown(s: Partial<SaleRecord>, excludeTip: boolean = false): { cashAmount: number; transferAmount: number; memberCreditAmount: number } {
  if (!s) return { cashAmount: 0, transferAmount: 0, memberCreditAmount: 0 };
  const totalPaid = s.customerPaid ?? 0;
  const memberCredit = s.memberCreditUsed || s.memberCreditAmount || 0;

  let cashAmount = 0;
  let transferAmount = 0;
  let memberCreditAmount = memberCredit;

  if (s.paymentMethod === 'member_credit') {
    cashAmount = typeof s.cashAmount === 'number' && !isNaN(s.cashAmount) ? s.cashAmount : 0;
    transferAmount = typeof s.transferAmount === 'number' && !isNaN(s.transferAmount) ? s.transferAmount : 0;
    memberCreditAmount = memberCredit || Math.max(0, totalPaid - cashAmount - transferAmount);
  } else if (s.paymentMethod === 'split') {
    cashAmount = typeof s.cashAmount === 'number' && !isNaN(s.cashAmount) ? s.cashAmount : 0;
    transferAmount = typeof s.transferAmount === 'number' && !isNaN(s.transferAmount) ? s.transferAmount : Math.max(0, totalPaid - cashAmount - memberCredit);
  } else if (s.paymentMethod === 'cash') {
    cashAmount = totalPaid;
    transferAmount = 0;
  } else if (s.paymentMethod === 'transfer') {
    cashAmount = 0;
    transferAmount = totalPaid;
  } else {
    // Fallback: if memberCreditUsed is set and no cash/transfer specified, don't invent transfer
    if (memberCredit > 0 && !s.cashAmount && !s.transferAmount) {
      cashAmount = 0;
      transferAmount = 0;
    } else {
      cashAmount = 0;
      transferAmount = totalPaid;
    }
  }

  if (excludeTip && s.tip && s.tip > 0) {
    let remainingTip = s.tip;
    if (s.paymentMethod === 'cash') {
      cashAmount = Math.max(0, cashAmount - remainingTip);
    } else if (s.paymentMethod === 'transfer') {
      transferAmount = Math.max(0, transferAmount - remainingTip);
    } else {
      // split, member_credit, or fallback
      if (transferAmount >= remainingTip) {
        transferAmount -= remainingTip;
      } else {
        remainingTip -= transferAmount;
        transferAmount = 0;
        cashAmount = Math.max(0, cashAmount - remainingTip);
      }
    }
  }

  return { cashAmount, transferAmount, memberCreditAmount };
}

// Generate MS Excel (XML Spreadsheet or CSV with BOM)
export function downloadExcelReport(title: string, dataRows: string[][], headers: string[]): void {
  // Use UTF-8 with BOM (\uFEFF) so Excel opens Thai characters correctly
  const bom = '\uFEFF';
  const csvContent = [
    headers.join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate Word Report (.doc as formatted HTML)
export function downloadWordReport(title: string, htmlContent: string): void {
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><title>${title}</title><style>body { font-family: 'Sarabun', 'Helvetica', sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head><body>`;
  const footer = "</body></html>";
  const sourceHTML = header + htmlContent + footer;
  
  const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Report.doc`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate plain text / SVG mock image download (PNG / JPG / PDF)
// To fully satisfy "PDF, JPG, PNG", we create downloadables that can be saved directly, 
// and we'll also recommend beautiful native print modes.
export function downloadPlainReport(
  title: string, 
  textSummary: string, 
  extension: 'txt' | 'pdf' | 'jpg' | 'png' | 'html', 
  htmlContent?: string,
  shopName: string = "ทองหล่อ บาร์เบอร์ สตูดิโอ"
): void {
  const shopNameInCaps = (shopName || "ทองหล่อ บาร์เบอร์ สตูดิโอ").toUpperCase();
  if (extension === 'html') {
    const finalContent = htmlContent || `
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; background: #f9fafb; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 45px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          h1 { color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; font-size: 24px; }
          pre { white-space: pre-wrap; font-family: monospace; background: #f3f4f6; padding: 20px; border-radius: 6px; font-size: 14px; overflow-x: auto; }
          .footer { margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
          @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${title}</h1>
          <pre>${textSummary}</pre>
          <div class="footer">พิมพ์รายงานเมื่อ: ${new Date().toLocaleString('th-TH')} • ระบบคิดเงินร้านตัดผม ${shopName} POS</div>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + finalContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Document.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (extension === 'pdf') {
    const finalContent = htmlContent || `
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; background: #f9fafb; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 45px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          h1 { color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; font-size: 24px; }
          pre { white-space: pre-wrap; font-family: monospace; background: #f3f4f6; padding: 20px; border-radius: 6px; font-size: 14px; overflow-x: auto; }
          .footer { margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
          @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${title}</h1>
          <pre>${textSummary}</pre>
          <div class="footer">พิมพ์รายงานเมื่อ: ${new Date().toLocaleString('th-TH')} • ระบบคิดเงินร้านตัดผม ${shopName} POS</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตให้สิทธิ์เปิดหน้าต่างภายนอก (Popups) ในเบราว์เซอร์ของคุณ เพื่อจำลองและสั่งพิมพ์บันทึกรายงานเป็น PDF');
      return;
    }
    printWindow.document.write(finalContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else if (extension === 'png' || extension === 'jpg') {
    // Generate a beautiful, genuine high-resolution PNG or JPG image using html2canvas!
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '800px';
    tempContainer.style.background = '#0f172a';
    tempContainer.style.padding = '35px';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.borderRadius = '24px';
    
    const formattedDateString = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    tempContainer.innerHTML = `
      <div style="background: #ffffff; border-radius: 16px; border: 2px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="background: #4f46e5; padding: 30px; color: white;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.025em; font-family: system-ui, sans-serif;">${shopNameInCaps}</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: bold; color: #c7d2fe; letter-spacing: 0.05em; text-transform: uppercase; font-family: system-ui, sans-serif;">OFFICIAL FINANCIAL STATEMENT REPORT</p>
          <p style="margin: 12px 0 0 0; font-size: 11px; color: #e0e7ff; opacity: 0.9; font-family: system-ui, sans-serif;">จัดพิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
        </div>
        <div style="padding: 30px; background: white;">
          <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; font-family: system-ui, sans-serif;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a;">${title.replace(/_/g, ' ')}</h2>
            <span style="font-size: 11px; font-weight: bold; background-color: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 99px;">ตรวจสอบแล้ว</span>
          </div>
          <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 22px; white-space: pre-wrap; font-family: monospace; font-size: 13px; color: #334155; line-height: 1.6; overflow-x: auto;">${textSummary.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        <div style="padding: 20px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-family: system-ui, sans-serif;">
          <span style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">รายงานตรวจบัญชีและสถิติดิจิทัล • ${shopNameInCaps} POS</span>
          <span style="font-size: 10px; font-weight: bold; color: #4f46e5; letter-spacing: 0.05em;">STABLE ARCHIVE</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(tempContainer);
    
    renderHtml2CanvasSafely(tempContainer, {
      scale: 2, // High DPI for crisp look
      useCORS: true,
      backgroundColor: '#0f172a',
      logging: false
    }).then((canvas) => {
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
      
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }
        
        // Create Object URL with precise content type
        const blobUrl = URL.createObjectURL(blob);
        
        // 1. Open the image directly in a new tab for seamless in-browser preview
        const previewWindow = window.open(blobUrl, '_blank');
        if (!previewWindow) {
          console.log('Popup blocked, falling back to direct download');
        }
        
        // 2. Perform automated file download
        const link = document.createElement('a');
        link.setAttribute('href', blobUrl);
        link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Report_Backup.${extension === 'png' ? 'png' : 'jpg'}`);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup DOM and memory
        document.body.removeChild(link);
        document.body.removeChild(tempContainer);
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      }, mimeType, 0.95);
    }).catch((err) => {
      console.error('Error rendering report image:', err);
      // Fallback: If html2canvas fails, download as SVG
      const bgGradient = extension === 'png' ? '#0f172a' : '#1e293b';
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="900" height="980" viewBox="0 0 900 980">
          <rect width="900" height="980" fill="${bgGradient}"/>
          <rect x="35" y="35" width="830" height="910" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
          <rect x="35" y="35" width="830" height="150" rx="20" fill="#4f46e5"/>
          <text x="70" y="95" font-family="system-ui, sans-serif" font-weight="900" font-size="28" fill="#ffffff">${shopNameInCaps}</text>
          <text x="70" y="130" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#c7d2fe">OFFICIAL FINANCIAL STATEMENT REPORT</text>
          <text x="830" y="115" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="end">พิมพ์: ${formattedDateString}</text>
          <foreignObject x="70" y="205" width="760" height="690">
            <div xmlns="http://www.w3.org/1999/xhtml" style="color: #1e293b; font-family: 'Helvetica Neue', Helvetica, 'Sarabun', Arial, sans-serif; font-size: 13px; line-height: 1.6;">
              <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">${title.replace(/_/g, ' ')}</h2>
                <span style="font-size: 12px; font-weight: bold; background-color: #e0e7ff; color: #4f46e5; padding: 4px 10px; border-radius: 99px;">ตรวจสอบแล้ว</span>
              </div>
              <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 22px; white-space: pre-wrap; font-family: monospace; font-size: 12.5px; color: #334155; max-height: 580px; overflow-y: auto;">${textSummary.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          </foreignObject>
          <line x1="70" y1="910" x2="830" y2="910" stroke="#e2e8f0" stroke-width="1.5"/>
          <text x="70" y="930" font-family="system-ui, sans-serif" font-weight="bold" font-size="11" fill="#94a3b8">รายงานตรวจบัญชีและสถิติดิจิทัล • ${shopNameInCaps} POS</text>
          <text x="830" y="930" font-family="system-ui, sans-serif" font-weight="bold" font-size="11" fill="#4f46e5" text-anchor="end">STABLE ARCHIVE</text>
        </svg>
      `;
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Report_Backup.svg`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      document.body.removeChild(tempContainer);
    });
  } else {
    // Plain text
    const blob = new Blob(['\ufeff' + textSummary], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Plain_Text.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Generate beautiful DAILY styled HTML report in highly professional, formal corporate accounting style
export function generateDailyHtmlReport(
  shopName: string,
  dateStr: string,
  barberStats: any[],
  paymentStats: any,
  sales: any[],
  expensesList: any[] = []
): string {
  const formattedDate = formatThaiDate(dateStr);
  const totalReceived = paymentStats.cashAmount + paymentStats.transferAmount;
  
  const formatLocalTime = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  const barberRows = barberStats.map((b) => `
    <tr>
      <td style="padding: 10px 12px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #cbd5e1; text-align: left;">ช่าง ${b.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #cbd5e1; text-align: center; font-weight: 600;">${b.cutsCount}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${formatBaht(b.haircutCom)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${formatBaht(b.chemicalCom)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${formatBaht(b.productCom)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #b91c1c; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${formatBaht(b.tipTotal)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold; background-color: #f8fafc; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${formatBaht(b.grandTotal)}</td>
    </tr>
  `).join('');

  // Summarize overall barber commissions & tips
  const totalHaircutCom = barberStats.reduce((sum, b) => sum + b.haircutCom, 0);
  const totalChemicalCom = barberStats.reduce((sum, b) => sum + b.chemicalCom, 0);
  const totalProductCom = barberStats.reduce((sum, b) => sum + b.productCom, 0);
  const totalTipTotal = barberStats.reduce((sum, b) => sum + b.tipTotal, 0);
  const totalGrandTotal = barberStats.reduce((sum, b) => sum + b.grandTotal, 0);

  const saleRows = sales.map((sale, idx) => {
    const isTransfer = sale.paymentMethod === 'transfer';
    const breakDowns = [];
    if (sale.haircutPrice > 0) breakDowns.push(`ตัดผม: ${formatBaht(sale.haircutPrice)}`);
    if (sale.chemicalPrice > 0) {
      if (sale.chemicalDiscountAmount && sale.chemicalDiscountAmount > 0) {
        breakDowns.push(`งานเคมี: ${formatBaht(sale.chemicalPrice)} (ลด -${formatBaht(sale.chemicalDiscountAmount)})`);
      } else {
        breakDowns.push(`งานเคมี: ${formatBaht(sale.chemicalPrice)}`);
      }
    }
    if (sale.productName && sale.productPrice > 0) breakDowns.push(`สินค้า: ${sale.productName} (${formatBaht(sale.productPrice)})`);
    if (sale.tip > 0) breakDowns.push(`ทิป: ${formatBaht(sale.tip)}`);
    if (sale.useDiscountPct10) breakDowns.push(`ลด 10%`);
    if (sale.useVoucherValue > 0) breakDowns.push(`วอยเชอร์: -${formatBaht(sale.useVoucherValue)}`);

    return `
      <tr>
        <td style="padding: 8px 10px; text-align: center; color: #64748b; font-family: 'JetBrains Mono', monospace; border-bottom: 1px solid #e2e8f0; font-size: 12px;">${sales.length - idx}</td>
        <td style="padding: 8px 10px; font-family: 'JetBrains Mono', monospace; color: #334155; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${formatLocalTime(sale.timestamp)}</td>
        <td style="padding: 8px 10px; color: #1e293b; font-weight: 500; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
          <div>ช่าง ${sale.barberName}</div>
          ${sale.customerName ? `<div style="font-size: 10px; color: #64748b; font-weight: bold; margin-top: 3px; background-color: #f1f5f9; padding: 1px 4px; border-radius: 3px; display: inline-block;">👤 ${sale.customerName}</div>` : ''}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
          <span style="font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid ${isTransfer ? '#cbd5e1; background-color: #f1f5f9; color: #0284c7;' : '#d1fae5; background-color: #f0fdf4; color: #166534;'}">
            ${isTransfer ? '📘 โอนผ่านบัญชี' : '💵 ชำระเงินสด'}
          </span>
        </td>
        <td style="padding: 8px 10px; color: #475569; font-size: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 500;">${breakDowns.join(' / ')}</div>
          ${sale.notes ? `<div style="margin-top: 4px; color: #ca8a04; font-size: 11px; font-style: italic; background-color: #fffbeb; padding: 2px 6px; border-radius: 4px; border: 1px solid #fef3c7; display: inline-block;">⚠️ หมายเหตุ: ${sale.notes}</div>` : ''}
        </td>
        <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #0f172a; font-family: 'JetBrains Mono', monospace; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${formatBaht(sale.customerPaid)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>รายงานทางการเงินประจำวัน ${formattedDate}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        body { 
          font-family: 'Sarabun', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
          padding: 30px; 
          color: #0f172a; 
          line-height: 1.5; 
          background-color: #f1f5f9; 
        }
        .container { 
          max-width: 950px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          padding: 40px; 
          border-radius: 4px; 
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); 
          border: 1px solid #cbd5e1; 
        }
        .company-letterhead { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          border-bottom: 3px double #0f172a; 
          padding-bottom: 16px; 
          margin-bottom: 24px; 
        }
        .company-title { 
          font-size: 22px; 
          font-weight: 700; 
          color: #0f172a; 
          margin: 0 0 6px 0; 
          letter-spacing: 0.5px;
        }
        .document-type { 
          font-size: 14px; 
          font-weight: 700; 
          color: #475569; 
          text-transform: uppercase; 
          margin: 0; 
          letter-spacing: 1px; 
        }
        .document-meta { 
          text-align: right; 
          font-size: 12px; 
          color: #334155; 
          line-height: 1.6; 
        }
        .document-meta b {
          color: #0d172a;
        }
        .report-title-section { 
          text-align: center; 
          margin-top: 10px;
          margin-bottom: 24px; 
        }
        .report-title { 
          font-size: 18px; 
          font-weight: 700; 
          color: #0f172a; 
          margin: 0 0 4px 0; 
          text-transform: uppercase;
        }
        .report-date { 
          font-size: 13px; 
          color: #475569; 
          margin: 0; 
          font-weight: 500; 
        }
        
        /* Corporate Balance Sheet Style Cards */
        .summary-balance-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .summary-balance-table td {
          padding: 12px 14px;
          border: 1px solid #94a3b8;
          font-size: 13px;
        }
        .summary-title {
          font-weight: 700;
          background-color: #f8fafc;
          color: #1e293b;
        }
        .summary-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px !important;
          font-weight: bold;
          text-align: right;
          color: #0f172a;
        }
        
        .section-title-bar { 
          font-size: 13px; 
          font-weight: 700; 
          color: #0f172a; 
          margin: 24px 0 10px 0; 
          border-bottom: 2px solid #0f172a; 
          padding-bottom: 4px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px;
        }
        .table-data { 
          width: 100%;
          border-collapse: collapse; 
          text-align: left; 
          font-size: 12px; 
          margin-bottom: 24px;
        }
        .table-data th { 
          background-color: #0f172a; 
          color: #ffffff; 
          font-weight: 600; 
          padding: 8px 10px; 
          border: 1px solid #0f172a;
          font-size: 11px;
          text-transform: uppercase;
        }
        .table-data td { 
          padding: 8px 10px;
          border: 1px solid #cbd5e1; 
        }
        .total-row {
          background-color: #f8fafc;
          font-weight: bold;
        }
        .total-row td {
          border-top: 1px solid #0f172a;
          border-bottom: 3px double #0f172a !important; /* Standard Accounting Double Underline */
        }
        
        .audit-footer-section { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 60px; 
          margin-top: 50px; 
          padding-top: 20px; 
          border-top: 1px solid #cbd5e1; 
        }
        .signature-container { 
          text-align: center; 
        }
        .signature-line-placeholder { 
          width: 200px; 
          border-bottom: 1px solid #475569; 
          margin: 40px auto 8px auto; 
        }
        .signature-title-label { 
          font-size: 11px; 
          color: #475569; 
          font-weight: 600; 
        }
        
        @media print {
          body { background-color: #ffffff; padding: 0; }
          .container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <!-- Company Header (Official Letterhead style) -->
        <div class="company-letterhead">
          <div>
            <h1 class="company-title">${shopName}</h1>
            <p class="document-type">เอกสารประกอบระบบบัญชีและการจัดเก็บรายได้หลัก</p>
          </div>
          <div class="document-meta">
            <div>หมายเลขสรุป: <b>BIL-${dateStr.replace(/-/g, '')}-DAILY</b></div>
            <div>ประเภทรายงาน: วันทำการต่อวัน (Daily Financial Statement)</div>
            <div>วันและเวลาประมวลผล: ${new Date().toLocaleString('th-TH')} น.</div>
          </div>
        </div>
        
        <!-- Document Title -->
        <div class="report-title-section">
          <h2 class="report-title">รายงานสรุปสาระสำคัญ ยอดรับชำระส่วนแบ่งช่างตัดผมประจำวัน</h2>
          <p class="report-date">สำหรับรอบการดำเนินงาน ประจำวันที่ ${formattedDate}</p>
        </div>
        
        <!-- Professional Corporate Accounting Grid Table -->
        <table class="summary-balance-table">
          <tr>
            <td class="summary-title" style="width: 25%;">รวมรายรับสะสมทั้งหมด (Gross Sales)</td>
            <td class="summary-value" style="width: 25%; font-size: 16px;">${formatBaht(totalReceived)}</td>
            <td class="summary-title" style="width: 25%;">ยอดชำระโดยผ่านการโอนบัญชี</td>
            <td class="summary-value" style="width: 25%; color: #0284c7;">${formatBaht(paymentStats.transferAmount)} (${paymentStats.transferCount || 0} ยอด)</td>
          </tr>
          <tr>
            <td class="summary-title">รวมบิลธุรกรรมทั้งหมด (Transaction Count)</td>
            <td class="summary-value" style="font-family: sans-serif;">${sales.length} รายการบิล</td>
            <td class="summary-title">ยอดชำระโดยใช้เหรียญเงินสด</td>
            <td class="summary-value" style="color: #166534;">${formatBaht(paymentStats.cashAmount)} (${paymentStats.cashCount || 0} ยอด)</td>
          </tr>
          <tr>
            <td class="summary-title">จำนวนสิทธิลดหย่อนที่ใช้ (Promo / Voucher)</td>
            <td class="summary-value" style="font-family: sans-serif; color: #b91c1c;">${paymentStats.discountUsedCount} ครั้ง</td>
            <td class="summary-title">เอกสารเทียบเคียงสมุดบัญชี</td>
            <td class="summary-value" style="font-family: sans-serif; font-size: 11px; color: #64748b;">คู่เคียงสลิปรายการเงินจริง</td>
          </tr>
          <tr>
            <td class="summary-title" style="color: #991b1b; font-weight: bold;">ยอดจ่ายออก/เบิกเงินถอนวันนี้</td>
            <td class="summary-value" style="color: #991b1b; font-family: 'JetBrains Mono', monospace;">${formatBaht(expensesList.reduce((sum, e) => sum + e.amount, 0))}</td>
            <td class="summary-title" style="color: #1e3a8a; font-weight: bold;">เงินสดหน้าร้านคงเหลือนำส่ง</td>
            <td class="summary-value" style="color: #1e3a8a; font-size: 15px; font-weight: 800;">${formatBaht(paymentStats.cashAmount - expensesList.reduce((sum, e) => sum + e.amount, 0))}</td>
          </tr>
        </table>
        
        <!-- Section 1: Barber Commission Ledger -->
        <div class="section-title-bar">บัญชีงบปันผลคอมมิชชั่นช่างรายบุคคล (BARBER COMMISSION SUBSIDIARY LEDGER)</div>
        <table class="table-data">
          <thead>
            <tr>
              <th style="text-align: left; width: 22%;">ช่างตัดผมผู้รับเงิน</th>
              <th style="text-align: center; width: 10%;">จำนวนงาน (หัว)</th>
              <th style="text-align: right; width: 14%;">ส่วนแบ่งบริการตัด</th>
              <th style="text-align: right; width: 14%;">ส่วนแบ่งงานเคมี</th>
              <th style="text-align: right; width: 14%;">ส่วนแบ่งงานผลิตภัณฑ์</th>
              <th style="text-align: right; width: 12%;">ยอดทิปช่างได้รับ</th>
              <th style="text-align: right; width: 14%;">รวมปันคงเหลือจริง</th>
            </tr>
          </thead>
          <tbody>
            ${barberRows}
            <tr class="total-row">
              <td style="text-align: left;">รวมส่วนปันบัญชีหลัก (Total)</td>
              <td style="text-align: center;">${barberStats.reduce((sum, b) => sum + b.cutsCount, 0)} หัว</td>
              <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalHaircutCom)}</td>
              <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalChemicalCom)}</td>
              <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalProductCom)}</td>
              <td style="text-align: right; color: #b91c1c; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalTipTotal)}</td>
              <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalGrandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Section: Store Cash Expenses & Withdrawals -->
        <div class="section-title-bar" style="background-color: #991b1b; color: #ffffff;">บัญชีงบเบิกถอนและรายจ่ายหน้าร้าน (STORE EXPENSES & CASH WITHDRAWAL JOURNAL)</div>
        <table class="table-data" style="font-size: 11px;">
          <thead>
            <tr style="background-color: #fef2f2;">
              <th style="text-align: center; width: 8%; color: #991b1b; border-color: #fecaca; background-color: #fef2f2;">ลำดับ</th>
              <th style="text-align: left; width: 22%; color: #991b1b; border-color: #fecaca; background-color: #fef2f2;">หมวดหมู่รายจ่าย</th>
              <th style="text-align: left; width: 20%; color: #991b1b; border-color: #fecaca; background-color: #fef2f2;">ผู้รับเงิน/ผู้เบิก</th>
              <th style="text-align: left; width: 35%; color: #991b1b; border-color: #fecaca; background-color: #fef2f2;">รายละเอียด/บันทึกงบทหารเสือ</th>
              <th style="text-align: right; width: 15%; color: #991b1b; border-color: #fecaca; background-color: #fef2f2;">จำนวนเงินสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            ${expensesList.length === 0 ? `
              <tr>
                <td colspan="5" style="text-align: center; padding: 15px; color: #64748b; font-family: sans-serif;">-- ไม่มีบันทึกรายจ่ายหรือยอดเบิกเงินสดในวันนี้ --</td>
              </tr>
            ` : expensesList.map((e, idx) => {
              let catText = '';
              if (e.category === 'supplies') catText = 'ซื้อวัสดุ/อุปกรณ์เข้าร้าน';
              else if (e.category === 'utilities') catText = 'ค่าน้ำ-ไฟ-อินเทอร์เน็ต';
              else if (e.category === 'rent') catText = 'ค่าเช่าร้าน/สถานที่';
              else if (e.category === 'marketing') catText = 'ค่าทำโฆษณา/โปรโมท';
              else if (e.category === 'salary') catText = 'สวัสดิการ/ค่าจ้างช่างพิเศษ';
              else if (e.category === 'loans') catText = 'เบิกถอนจากเจ้าของร้าน';
              else catText = 'อื่น ๆ/เบ็ดเตล็ด';
              
              return `
                <tr>
                  <td style="padding: 8px 10px; border-bottom: 1px solid #fecaca; text-align: center; color: #64748b;">${idx + 1}</td>
                  <td style="padding: 8px 10px; border-bottom: 1px solid #fecaca; font-weight: 600; color: #991b1b;">${catText}</td>
                  <td style="padding: 8px 10px; border-bottom: 1px solid #fecaca; color: #334155;">${e.payee || 'ทางหักร้านทั่วไป'}</td>
                  <td style="padding: 8px 10px; border-bottom: 1px solid #fecaca; font-style: italic; color: #475569;">${e.notes || '-'}</td>
                  <td style="padding: 8px 10px; border-bottom: 1px solid #fecaca; text-align: right; font-weight: bold; color: #991b1b; font-family: 'JetBrains Mono', monospace;">${formatBaht(e.amount)}</td>
                </tr>
              `;
            }).join('')}
            <tr style="background-color: #fef2f2; font-weight: bold; border-top: 2px solid #f9a8d4;">
              <td colspan="4" style="text-align: left; padding: 10px; color: #991b1b;">รวมยอดถอนและรายจ่ายสะสมรายวัน (Total Expenses Amount)</td>
              <td style="text-align: right; padding: 10px; color: #991b1b; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${formatBaht(expensesList.reduce((sum, e) => sum + e.amount, 0))}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Section 2: Audit Trail Transaction Matches -->
        <div class="section-title-bar">ข้อมูลบันทึกธุรกรรมโดยละเอียด (DETAILED TRANSACTION LIST FOR INTERNAL AUDITING)</div>
        <table class="table-data" style="font-size: 11px;">
          <thead>
            <tr>
              <th style="text-align: center; width: 7%;">ลำดับ</th>
              <th style="text-align: center; width: 12%;">เวลาทำรายการ</th>
              <th style="text-align: left; width: 15%;">ช่างปฏิบัติงาน</th>
              <th style="text-align: center; width: 15%;">ประเภทช่องทาง</th>
              <th style="text-align: left; width: 39%;">คำอธิบายรายการ / บริการเสริม / โปรโมชั่น / หมายเหตุ</th>
              <th style="text-align: right; width: 12%;">จำนวนสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            ${saleRows}
          </tbody>
        </table>
        
        <!-- Official Corporate Signatures Section -->
        <div class="audit-footer-section">
          <div class="signature-container">
            <div class="signature-line-placeholder"></div>
            <div class="signature-title-label">ผู้บันทึกงบการเงินและรวบรวมบิล</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">ฝ่ายต้อนรับ / แคชเชียร์ประจำสาขา</div>
          </div>
          <div class="signature-container">
            <div class="signature-line-placeholder"></div>
            <div class="signature-title-label">ผู้ตรวจสอบความถูกต้องและอนุมัติยอดประจำวัน</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">ลงนามกรรมการตรวจสอบ / ผู้บริหารสูงสุด</div>
          </div>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

// Generate beautiful MONTHLY styled HTML report in highly professional, formal corporate accounting style
// Generate beautiful MONTHLY styled HTML report in highly professional, formal corporate accounting style
export function generateMonthlyHtmlReport(
  shopName: string,
  monthStr: string,
  barberStats: any[],
  overallStats: any,
  expensesList: any[] = [],
  dailyBreakdown: any[] = [],
  shopConfig?: ShopConfig,
  billingRange?: { startDate: string; endDate: string }
): string {
  const formattedMonth = formatThaiMonth(monthStr);
  const totalExpenses = expensesList.reduce((sum, e) => sum + e.amount, 0);
  const netOperatingProfit = (overallStats.shopRevenue || 0) - totalExpenses;
  const grossSales = overallStats.totalCustomerPaid || 0;
  const netShopRevenue = overallStats.shopRevenue || 0;

  // Calculate Barber Totals
  const totalCuts = barberStats.reduce((sum, b) => sum + (b.cutsCount || 0), 0);
  const totalHaircutCom = barberStats.reduce((sum, b) => sum + (b.haircutCom || 0), 0);
  const totalChemicalCom = barberStats.reduce((sum, b) => sum + (b.chemicalCom || 0), 0);
  const totalProductCom = barberStats.reduce((sum, b) => sum + (b.productCom || 0), 0);
  const totalTipTotal = barberStats.reduce((sum, b) => sum + (b.tipTotal || 0), 0);
  const totalGrandTotal = barberStats.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

  // Calculate Daily Totals
  const totalDailyBills = dailyBreakdown.reduce((sum, d) => sum + (d.totalBills || 0), 0);
  const totalDailyCash = dailyBreakdown.reduce((sum, d) => sum + (d.cashAmount || 0), 0);
  const totalDailyTransfer = dailyBreakdown.reduce((sum, d) => sum + (d.transferAmount || 0), 0);
  const totalDailyRevenue = dailyBreakdown.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalDailyExpenses = dailyBreakdown.reduce((sum, d) => sum + (d.expenseAmount || 0), 0);
  const totalDailyNetCash = dailyBreakdown.reduce((sum, d) => sum + (d.netCash || 0), 0);

  // Financial ratios
  const profitMargin = grossSales > 0 ? (netOperatingProfit / grossSales) * 100 : 0;
  const laborCostRatio = grossSales > 0 ? (totalGrandTotal / grossSales) * 100 : 0;
  const cashRatio = grossSales > 0 ? ((overallStats.cashAmount || 0) / grossSales) * 100 : 0;
  const transferRatio = grossSales > 0 ? ((overallStats.transferAmount || 0) / grossSales) * 100 : 0;

  const cycleText = billingRange
    ? `${formatThaiDate(billingRange.startDate)} - ${formatThaiDate(billingRange.endDate)}`
    : `1 - ${new Date(parseInt(monthStr.split('-')[0]), parseInt(monthStr.split('-')[1]), 0).getDate()} ${formattedMonth}`;

  const barberRows = barberStats.map((b, idx) => `
    <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
      <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; text-align: left; border-bottom: 1px solid #e2e8f0;">
        ช่าง ${b.name}
      </td>
      <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">
        ${b.cutsCount} หัว
      </td>
      <td style="padding: 10px 12px; text-align: right; font-family: 'Inter', monospace; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(b.haircutCom)}
      </td>
      <td style="padding: 10px 12px; text-align: right; font-family: 'Inter', monospace; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(b.chemicalCom)}
      </td>
      <td style="padding: 10px 12px; text-align: right; font-family: 'Inter', monospace; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(b.productCom)}
      </td>
      <td style="padding: 10px 12px; text-align: right; font-family: 'Inter', monospace; font-size: 13px; color: #b91c1c; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(b.tipTotal)}
      </td>
      <td style="padding: 10px 12px; text-align: right; font-family: 'Inter', monospace; font-size: 13px; font-weight: 800; color: #4338ca; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(b.grandTotal)}
      </td>
    </tr>
  `).join('');

  const sortedExpenses = [...expensesList].sort((a, b) => a.date.localeCompare(b.date));
  const expenseRows = sortedExpenses.length === 0 ? `
    <tr>
      <td colspan="6" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">
        -- ไม่พบรายการรายจ่ายหรือการเบิกเงินถอนในงบประจำเดือนนี้ --
      </td>
    </tr>
  ` : sortedExpenses.map((e, idx) => {
    let catName = 'อื่น ๆ';
    let catBg = '#f1f5f9';
    let catColor = '#475569';

    if (e.category === 'supplies') { catName = '🛒 อุปกรณ์เข้าร้าน'; catBg = '#fef3c7'; catColor = '#92400e'; }
    else if (e.category === 'utilities') { catName = '⚡ ค่าน้ำ-ไฟ-เน็ต'; catBg = '#e0f2fe'; catColor = '#075985'; }
    else if (e.category === 'rent') { catName = '🏢 ค่าเช่าสถานที่'; catBg = '#f3e8ff'; catColor = '#6b21a8'; }
    else if (e.category === 'marketing') { catName = '📢 ค่าโฆษณา'; catBg = '#e0e7ff'; catColor = '#3730a3'; }
    else if (e.category === 'salary') { catName = '🧑‍🔧 ค่าจ้างช่างพิเศษ'; catBg = '#dcfce7'; catColor = '#166534'; }
    else if (e.category === 'loans') { catName = '💰 เบิกถอนเจ้าของ'; catBg = '#ffe4e6'; catColor = '#9f1239'; }

    return `
      <tr style="${idx % 2 === 1 ? 'background-color: #fff1f2;' : ''}">
        <td style="padding: 8px 10px; text-align: center; color: #64748b; font-size: 11px; border-bottom: 1px solid #fecdd3;">${idx + 1}</td>
        <td style="padding: 8px 10px; font-weight: 700; color: #334155; font-size: 12px; border-bottom: 1px solid #fecdd3;">${formatThaiDate(e.date)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #fecdd3;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background-color: ${catBg}; color: ${catColor};">
            ${catName}
          </span>
        </td>
        <td style="padding: 8px 10px; color: #1e293b; font-weight: 600; font-size: 12px; border-bottom: 1px solid #fecdd3;">${e.payee || 'ทางหักร้านทั่วไป'}</td>
        <td style="padding: 8px 10px; color: #475569; font-size: 11.5px; border-bottom: 1px solid #fecdd3;">${e.notes || '-'}</td>
        <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #e11d48; font-family: 'Inter', monospace; font-size: 12.5px; border-bottom: 1px solid #fecdd3;">
          -${formatBaht(e.amount)}
        </td>
      </tr>
    `;
  }).join('');

  const dailyRows = dailyBreakdown.map((d, idx) => `
    <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
      <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${formatThaiDate(d.date)}</td>
      <td style="padding: 7px 10px; text-align: center; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">${d.totalBills} บิล</td>
      <td style="padding: 7px 10px; text-align: right; color: #15803d; font-family: 'Inter', monospace; font-size: 12px; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(d.cashAmount)} <span style="font-size: 10px; color: #166534;">(${d.cashCount})</span>
      </td>
      <td style="padding: 7px 10px; text-align: right; color: #0369a1; font-family: 'Inter', monospace; font-size: 12px; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(d.transferAmount)} <span style="font-size: 10px; color: #0284c7;">(${d.transferCount})</span>
      </td>
      <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0f172a; font-family: 'Inter', monospace; font-size: 12.5px; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(d.totalAmount)}
      </td>
      <td style="padding: 7px 10px; text-align: right; color: #e11d48; font-family: 'Inter', monospace; font-size: 12px; border-bottom: 1px solid #e2e8f0;">
        ${d.expenseAmount > 0 ? `-${formatBaht(d.expenseAmount)}` : '0 ฿'}
      </td>
      <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #4338ca; font-family: 'Inter', monospace; font-size: 12.5px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
        ${formatBaht(d.netCash)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>รายงานปิดสัปดาห์ / สรุปบัญชีรายเดือน ${formattedMonth}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
        }

        body { 
          font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif; 
          padding: 24px; 
          color: #0f172a; 
          line-height: 1.5; 
          background-color: #f1f5f9; 
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .container { 
          max-width: 980px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          padding: 36px 40px; 
          border-radius: 12px; 
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); 
          border: 1px solid #e2e8f0; 
        }

        /* Letterhead Header */
        .company-letterhead { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          border-bottom: 3px double #0f172a; 
          padding-bottom: 20px; 
          margin-bottom: 24px; 
        }
        .company-title { 
          font-family: 'Prompt', sans-serif;
          font-size: 26px; 
          font-weight: 700; 
          color: #0f172a; 
          margin: 0 0 4px 0; 
          letter-spacing: -0.5px;
        }
        .document-type { 
          font-family: 'Prompt', sans-serif;
          font-size: 13px; 
          font-weight: 600; 
          color: #4f46e5; 
          text-transform: uppercase; 
          margin: 0; 
          letter-spacing: 0.8px; 
        }
        .document-meta { 
          text-align: right; 
          font-size: 11.5px; 
          color: #475569; 
          line-height: 1.6; 
        }
        .document-meta b {
          font-family: 'JetBrains Mono', monospace;
          color: #0f172a;
        }

        .report-title-section { 
          text-align: center; 
          margin-bottom: 28px; 
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          padding: 18px 24px;
          border-radius: 10px;
        }
        .report-title { 
          font-family: 'Prompt', sans-serif;
          font-size: 19px; 
          font-weight: 700; 
          margin: 0 0 6px 0; 
          letter-spacing: 0.2px;
        }
        .report-date { 
          font-size: 13.5px; 
          color: #cbd5e1; 
          margin: 0; 
          font-weight: 400; 
        }

        /* Summary KPI Cards Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }
        .kpi-card {
          border-radius: 8px;
          padding: 14px 16px;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }
        .kpi-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .kpi-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        .kpi-sub {
          font-size: 10.5px;
          color: #64748b;
          margin-top: 4px;
        }

        .section-title-bar { 
          font-family: 'Prompt', sans-serif;
          font-size: 13px; 
          font-weight: 700; 
          color: #ffffff; 
          background-color: #0f172a;
          margin: 28px 0 12px 0; 
          padding: 8px 14px; 
          border-radius: 6px;
          letter-spacing: 0.3px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .table-data { 
          width: 100%;
          border-collapse: collapse; 
          text-align: left; 
          font-size: 11.5px; 
          margin-bottom: 24px;
        }
        .table-data th { 
          font-family: 'Prompt', sans-serif;
          background-color: #1e293b; 
          color: #ffffff; 
          font-weight: 600; 
          padding: 9px 10px; 
          border: 1px solid #1e293b;
          font-size: 11px;
        }
        .table-data td { 
          padding: 8px 10px;
          border: 1px solid #cbd5e1; 
        }
        .total-row td {
          background-color: #f1f5f9;
          font-weight: 700;
          border-top: 2px solid #0f172a;
          border-bottom: 3px double #0f172a !important; /* Accounting Double Underline */
        }

        .accounting-auditing-box {
          background-color: #f8fafc; 
          border: 1px solid #cbd5e1; 
          border-radius: 8px; 
          padding: 18px; 
          margin-bottom: 32px; 
          color: #1e293b;
        }
        .accounting-auditing-title {
          font-family: 'Prompt', sans-serif;
          font-size: 13px;
          font-weight: 700;
          margin: 0 0 10px 0;
          color: #0f172a;
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 6px;
        }

        .audit-footer-section { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 60px; 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #cbd5e1; 
        }
        .signature-container { 
          text-align: center; 
        }
        .signature-line-placeholder { 
          width: 220px; 
          border-bottom: 1px solid #475569; 
          margin: 45px auto 8px auto; 
        }
        .signature-title-label { 
          font-family: 'Prompt', sans-serif;
          font-size: 11.5px; 
          color: #334155; 
          font-weight: 600; 
        }

        @media print {
          body { background-color: #ffffff; padding: 0; }
          .container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <!-- Company Header (Official Letterhead style) -->
        <div class="company-letterhead">
          <div>
            <h1 class="company-title">${shopName}</h1>
            <p class="document-type">สรุปยอดบัญชีกระแสเงินสดและสถิติปันส่วนแบ่งช่างประจำเดือน</p>
          </div>
          <div class="document-meta">
            <div>หมายเลขเอกสาร: <b>BIL-M-${monthStr.replace('-', '')}-LEDGER</b></div>
            <div>ประเภทรายงาน: งบปิดรอบบัญชีประจำเดือน (Monthly Statement of Revenue)</div>
            <div>ประมวลผลเมื่อ: ${new Date().toLocaleString('th-TH')} น.</div>
          </div>
        </div>
        
        <!-- Document Title -->
        <div class="report-title-section">
          <h2 class="report-title">รายงานแสดงฐานะการเงินและผลการดำเนินงานประจำเดือน</h2>
          <p class="report-date">สำหรับรอบบัญชีประจำเดือน: ${formattedMonth} (${cycleText})</p>
        </div>
        
        <!-- KPI Dashboard Cards -->
        <div class="kpi-grid">
          <div class="kpi-card" style="border-left: 4px solid #166534; background-color: #f0fdf4;">
            <div class="kpi-title" style="color: #166534;">💵 ยอดรายรับเงินสด + เงินโอนจริง</div>
            <div class="kpi-value" style="color: #166534;">${formatBaht(overallStats.cashAmount + overallStats.transferAmount)}</div>
            <div class="kpi-sub">ไม่รวมเครดิตสมาชิกเหมาจ่ายล่วงหน้า</div>
          </div>
          
          <div class="kpi-card" style="border-left: 4px solid #0284c7; background-color: #f0f9ff;">
            <div class="kpi-title" style="color: #0369a1;">📱 ยอดโอนสแกนธนาคาร</div>
            <div class="kpi-value" style="color: #0369a1;">${formatBaht(overallStats.transferAmount)}</div>
            <div class="kpi-sub">รวมทั้งสิ้น ${overallStats.transferCount || 0} รายการ</div>
          </div>

          <div class="kpi-card" style="border-left: 4px solid #15803d; background-color: #f2fbf4;">
            <div class="kpi-title" style="color: #15803d;">💵 ยอดรับชำระด้วยเงินสด</div>
            <div class="kpi-value" style="color: #15803d;">${formatBaht(overallStats.cashAmount)}</div>
            <div class="kpi-sub">รวมทั้งสิ้น ${overallStats.cashCount || 0} รายการ</div>
          </div>

          <div class="kpi-card" style="border-left: 4px solid #7e22ce; background-color: #faf5ff;">
            <div class="kpi-title" style="color: #7e22ce;">👑 ยอดใช้บริการด้วยเครดิตสมาชิก</div>
            <div class="kpi-value" style="color: #7e22ce;">${formatBaht(overallStats.totalMemberCreditUsed || 0)}</div>
            <div class="kpi-sub">รับชำระแพคเกจล่วงหน้าไปแล้ว</div>
          </div>

          <div class="kpi-card" style="border-left: 4px solid #be123c; background-color: #fff1f2;">
            <div class="kpi-title" style="color: #be123c;">💸 รายจ่ายและยอดถอนสะสม</div>
            <div class="kpi-value" style="color: #be123c;">${formatBaht(totalExpenses)}</div>
            <div class="kpi-sub">รวม ${expensesList.length} รายการรายจ่าย</div>
          </div>

          <div class="kpi-card" style="border-left: 4px solid #1e3a8a; background-color: #eff6ff;">
            <div class="kpi-title" style="color: #1e3a8a;">🏦 กำไรสุทธิของร้านค้า</div>
            <div class="kpi-value" style="color: #1e3a8a;">${formatBaht(overallStats.shopRevenue - totalExpenses)}</div>
            <div class="kpi-sub">สุทธิส่วนแบ่งร้านหลังหักรายจ่าย</div>
          </div>
        </div>

        <!-- Section 1: Barber Payroll Summary Report -->
        <div class="section-title-bar">
          <span>1. บัญชีงบสรุปค่าแรงและส่วนปันผลตอบแทนช่างตัดผม (BARBER PAYROLL SUMMARY REPORT)</span>
          <span style="font-size: 11px; font-weight: 400; opacity: 0.9;">รวมช่าง ${barberStats.length} ท่าน</span>
        </div>
        <table class="table-data">
          <thead>
            <tr>
              <th style="text-align: left; width: 22%;">ช่างตัดผมผู้รับเงิน</th>
              <th style="text-align: center; width: 10%;">จำนวนงาน (หัว)</th>
              <th style="text-align: right; width: 14%;">ส่วนปันตัดผม</th>
              <th style="text-align: right; width: 14%;">ส่วนปันงานเคมี</th>
              <th style="text-align: right; width: 14%;">ส่วนปันขายสินค้า</th>
              <th style="text-align: right; width: 12%;">ยอดทิปสะสม</th>
              <th style="text-align: right; width: 14%; background-color: #0f172a;">สุทธิค่าจ้างรวมทิป</th>
            </tr>
          </thead>
          <tbody>
            ${barberRows}
            <tr class="total-row">
              <td style="text-align: left; font-family: 'Prompt', sans-serif;">รวมผลตอบแทนช่างทั้งหมด (Total Payroll)</td>
              <td style="text-align: center;">${totalCuts} หัว</td>
              <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalHaircutCom)}</td>
              <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalChemicalCom)}</td>
              <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalProductCom)}</td>
              <td style="text-align: right; color: #b91c1c; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalTipTotal)}</td>
              <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #4338ca;">${formatBaht(totalGrandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Section 2: Daily Payment Breakdown Table -->
        ${dailyBreakdown.length > 0 ? `
        <div class="section-title-bar" style="background-color: #0369a1;">
          <span>2. ตารางสรุปยอดรับชำระเงิน แยกรายวันประจำเดือน (DAILY PAYMENT BREAKDOWN SHEET)</span>
          <span style="font-size: 11px; font-weight: 400; opacity: 0.9;">${dailyBreakdown.length} วันทำการ</span>
        </div>
        <table class="table-data" style="font-size: 11px;">
          <thead>
            <tr style="background-color: #f0f9ff;">
              <th style="text-align: center; width: 12%; color: #0369a1; border-color: #bae6fd; background-color: #f0f9ff;">วันที่</th>
              <th style="text-align: center; width: 9%; color: #0369a1; border-color: #bae6fd; background-color: #f0f9ff;">จำนวนบิล</th>
              <th style="text-align: right; width: 15%; color: #15803d; border-color: #bae6fd; background-color: #f0f9ff;">💵 ยอดเงินสด</th>
              <th style="text-align: right; width: 15%; color: #0284c7; border-color: #bae6fd; background-color: #f0f9ff;">📱 ยอดเงินโอน</th>
              <th style="text-align: right; width: 15%; color: #7e22ce; border-color: #bae6fd; background-color: #f0f9ff;">👑 เครดิตสมาชิก</th>
              <th style="text-align: right; width: 15%; color: #0f172a; border-color: #bae6fd; background-color: #f0f9ff;">💰 รวมรายรับจริง</th>
              <th style="text-align: right; width: 12%; color: #be123c; border-color: #bae6fd; background-color: #f0f9ff;">💸 รายจ่าย</th>
              <th style="text-align: right; width: 15%; color: #4338ca; border-color: #bae6fd; background-color: #f0f9ff;">🏦 เงินสดคงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            ${dailyBreakdown.map((d, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #334155;">${formatThaiDate(d.date)}</td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${d.totalBills} บิล</td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #166534; font-family: 'JetBrains Mono', monospace;">${formatBaht(d.cashAmount)} <span style="font-size: 9px; color: #64748b;">(${d.cashCount})</span></td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #0369a1; font-family: 'JetBrains Mono', monospace;">${formatBaht(d.transferAmount)} <span style="font-size: 9px; color: #64748b;">(${d.transferCount})</span></td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #7e22ce; font-family: 'JetBrains Mono', monospace;">${formatBaht(d.memberCreditAmount || 0)}</td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a; font-family: 'JetBrains Mono', monospace;">${formatBaht(d.cashAmount + d.transferAmount)}</td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600; color: #be123c; font-family: 'JetBrains Mono', monospace;">${formatBaht(d.expenseAmount)}</td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #4338ca; font-family: 'JetBrains Mono', monospace;">${formatBaht(d.cashAmount - d.expenseAmount)}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f0f9ff; font-weight: bold; border-top: 2px solid #0284c7;">
              <td style="text-align: center; padding: 9px 10px; color: #0369a1; font-family: 'Prompt', sans-serif;">รวมสะสมทั้งเดือน</td>
              <td style="text-align: center; padding: 9px 10px; color: #0369a1;">${totalDailyBills} บิล</td>
              <td style="text-align: right; padding: 9px 10px; color: #166534; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalDailyCash)}</td>
              <td style="text-align: right; padding: 9px 10px; color: #0369a1; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalDailyTransfer)}</td>
              <td style="text-align: right; padding: 9px 10px; color: #7e22ce; font-family: 'JetBrains Mono', monospace;">${formatBaht(dailyBreakdown.reduce((sum, d) => sum + (d.memberCreditAmount || 0), 0))}</td>
              <td style="text-align: right; padding: 9px 10px; color: #0f172a; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalDailyCash + totalDailyTransfer)}</td>
              <td style="text-align: right; padding: 9px 10px; color: #be123c; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalDailyExpenses)}</td>
              <td style="text-align: right; padding: 9px 10px; color: #4338ca; font-family: 'JetBrains Mono', monospace;">${formatBaht(totalDailyCash - totalDailyExpenses)}</td>
            </tr>
          </tbody>
        </table>
        ` : ''}

        <!-- Section 3: Monthly Expenses Detail -->
        <div class="section-title-bar" style="background-color: #be123c;">
          <span>3. บัญชีงบรายจ่ายและเบิกถอนเงินสดรายเดือนสะสม (MONTHLY EXPENSES & WITHDRAWAL JOURNAL)</span>
          <span style="font-size: 11px; font-weight: 400; opacity: 0.9;">รวม ${expensesList.length} รายการ</span>
        </div>
        <table class="table-data" style="font-size: 11px;">
          <thead>
            <tr style="background-color: #fff1f2;">
              <th style="text-align: center; width: 8%; color: #be123c; border-color: #fecdd3; background-color: #fff1f2;">ลำดับ</th>
              <th style="text-align: left; width: 15%; color: #be123c; border-color: #fecdd3; background-color: #fff1f2;">วันที่บันทึก</th>
              <th style="text-align: left; width: 20%; color: #be123c; border-color: #fecdd3; background-color: #fff1f2;">หมวดหมู่รายจ่าย</th>
              <th style="text-align: left; width: 20%; color: #be123c; border-color: #fecdd3; background-color: #fff1f2;">ผู้ลงนามเบิก/รับเงิน</th>
              <th style="text-align: left; width: 22%; color: #be123c; border-color: #fecdd3; background-color: #fff1f2;">รายละเอียดหมายเหตุ</th>
              <th style="text-align: right; width: 15%; color: #be123c; border-color: #fecdd3; background-color: #fff1f2;">ยอดถอน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRows}
            <tr style="background-color: #fff1f2; font-weight: bold; border-top: 2px solid #be123c;">
              <td colspan="5" style="text-align: left; padding: 10px; color: #be123c; font-family: 'Prompt', sans-serif;">รวมยอดถอนและรายจ่ายสะสมตลอดช่วงเดือน (Total Monthly Expenses)</td>
              <td style="text-align: right; padding: 10px; color: #be123c; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${formatBaht(totalExpenses)}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Section 4: Accounting Notes & Commentary -->
        <div class="accounting-auditing-box">
          <h4 class="accounting-auditing-title">📝 ภาคผนวกและรายงานการวิเคราะห์ด้านบัญชีรายรับ (Accounting Notes and Commentary)</h4>
          <ul style="font-size: 12px; margin: 0; padding-left: 20px; line-height: 1.8; color: #334155;">
            <li>ยอดรวมค่าส่วนปันผลตอบแทนที่ถอนจ่ายจากธนาคารฝั่งร้าน (ไม่รวมทิปส่วนตัว): <b>${formatBaht(totalGrandTotal - totalTipTotal)}</b> (ถือเป็นต้นทุนแรงงานโดยตรงเพื่อหักงบกำไรขาดทุน)</li>
            <li>ยอดรวมรายจ่ายและการเบิกเงินของร้านค้าทั้งหมดตลอดเดือนนี้: <b style="color: #be123c;">${formatBaht(totalExpenses)}</b></li>
            <li><b>กำไรบริสุทธิ์สะสมของทางร้าน (Net Shop Profit after Payroll and Expenses)</b>: <b style="color: #1e3a8a; font-size: 13.5px;">${formatBaht(netShopRevenue - totalExpenses)}</b></li>
            <li>รายการชำระรับเงินสดสะสมมีสัดส่วน <b>${(((overallStats.cashAmount || 0) / ((overallStats.cashAmount || 0) + (overallStats.transferAmount || 0) || 1)) * 100).toFixed(1)}%</b> เมื่อเทียบช่องทางการสแกนจ่ายโอน</li>
            <li>สถิติตัวคูณความคุ้มทุนสะสม (Vouchers/Discounts Activated): ทั้งหมด <b>${overallStats.totalDiscountsCount || 0} ครั้ง</b> ตลอดรอบเดือนทำการ</li>
          </ul>
        </div>
        
        <!-- Official Signatures Section -->
        <div class="audit-footer-section">
          <div class="signature-container">
            <div class="signature-line-placeholder"></div>
            <div class="signature-title-label">ผู้ตรวจสอบงบบัญชีปิดงบประจำเดือน</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">ลงนามสำนักงานประมวลผลบัญชี / แคชเชียร์</div>
          </div>
          <div class="signature-container">
            <div class="signature-line-placeholder"></div>
            <div class="signature-title-label">กรรมการบริษัท / เจ้าของร้านผู้มีอำนาจ</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">ลงนามอนุมัติงบการเงินประจำเดือน</div>
          </div>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

// Dynamically calculates the start and end dates of a billing cycle based on selected month and shop cutoff day.
export function getBillingCycleRange(selectedMonthStr: string, cutoffDay: number): { startDate: string, endDate: string } {
  const [year, month] = selectedMonthStr.split('-').map(Number);
  
  if (!cutoffDay || cutoffDay === 1) {
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startDate: `${selectedMonthStr}-01`,
      endDate: `${selectedMonthStr}-${String(lastDay).padStart(2, '0')}`
    };
  }
  
  // Cutoff is X (e.g., 25).
  // End date is current month, day X. E.g. 2026-06-25
  const endTargetDate = new Date(year, month - 1, cutoffDay);
  const endYear = endTargetDate.getFullYear();
  const endMonth = endTargetDate.getMonth() + 1;
  const endDay = endTargetDate.getDate();
  const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  
  // Start date is the day after the cutoff of the previous month.
  // Previous month index is month - 2. Day is cutoffDay + 1.
  const startTargetDate = new Date(year, month - 2, cutoffDay + 1);
  const startYear = startTargetDate.getFullYear();
  const startMonth = startTargetDate.getMonth() + 1;
  const startDay = startTargetDate.getDate();
  const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
  
  return { startDate: startDateStr, endDate: endDateStr };
}

// Generate crisp A4 PDF file download specifically tailored for accountants
export async function exportAsyncMonthlyPdfReport(
  shopName: string,
  monthStr: string,
  barberStats: any[],
  overallStats: any,
  expensesList: any[] = [],
  dailyBreakdown: any[] = [],
  shopConfig?: ShopConfig,
  billingRange?: { startDate: string; endDate: string }
): Promise<void> {
  const formattedMonth = formatThaiMonth(monthStr);
  const fileName = `รายงานสรุปบัญชีรายเดือน_${formattedMonth.replace(/\s+/g, '_')}_OFFICIAL.pdf`;

  const htmlContent = generateMonthlyHtmlReport(
    shopName,
    monthStr,
    barberStats,
    overallStats,
    expensesList,
    dailyBreakdown,
    shopConfig,
    billingRange
  );

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  tempContainer.style.width = '880px';
  tempContainer.style.background = '#ffffff';
  tempContainer.style.padding = '0px';
  tempContainer.style.boxSizing = 'border-box';
  tempContainer.style.color = '#0f172a';
  tempContainer.style.fontFamily = `'Sarabun', 'Helvetica Neue', Helvetica, Arial, sans-serif`;

  tempContainer.innerHTML = htmlContent;
  document.body.appendChild(tempContainer);

  try {
    const canvas = await renderHtml2CanvasSafely(tempContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const margin = 10; // 10mm margins
    const imgWidth = pdfWidth - (margin * 2); // 190mm
    const printableHeightMM = pdfHeight - (margin * 2); // 277mm

    // Calculate height of 1 A4 printable page in canvas pixels
    const pxPageHeight = (canvas.width / imgWidth) * printableHeightMM;
    const totalCanvasHeight = canvas.height;

    let srcY = 0;
    let pageCount = 0;

    while (srcY < totalCanvasHeight) {
      if (pageCount > 0) {
        pdf.addPage();
      }

      const sliceHeight = Math.min(pxPageHeight, totalCanvasHeight - srcY);

      // Create offscreen canvas slice
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          srcY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );
      }

      const sliceData = sliceCanvas.toDataURL('image/png');
      const renderedImgHeightMM = (sliceHeight * imgWidth) / canvas.width;

      pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, renderedImgHeightMM);

      srcY += sliceHeight;
      pageCount++;
    }

    pdf.save(fileName);
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF โปรดลองอีกครั้ง');
  } finally {
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
}

/**
 * Generate full, clean HTML template for 12-Month Annual Accounting Audit PDF
 * Styled exclusively with pure inline CSS (Hex colors only, strictly no OKLCH/Tailwind classes).
 */
export function generateAnnualHtmlReport(
  shopName: string,
  targetYear: number,
  sales: SaleRecord[],
  expenses: Expense[] = [],
  barbers: Barber[] = [],
  userEmail: string = ''
): string {
  const thaiBuddhistYear = targetYear + 543;
  const cleanShop = (shopName || 'ร้านบาร์เบอร์').trim();

  const THAI_MONTH_NAMES_FULL = [
    'มกราคม (Jan)', 'กุมภาพันธ์ (Feb)', 'มีนาคม (Mar)', 'เมษายน (Apr)',
    'พฤษภาคม (May)', 'มิถุนายน (Jun)', 'กรกฎาคม (Jul)', 'สิงหาคม (Aug)',
    'กันยายน (Sep)', 'ตุลาคม (Oct)', 'พฤศจิกายน (Nov)', 'ธันวาคม (Dec)'
  ];

  // 12-Month schedule aggregation
  const monthlyData = Array.from({ length: 12 }, (_, idx) => {
    const monthNum = idx + 1;
    const monthStr = `${targetYear}-${String(monthNum).padStart(2, '0')}`;

    const monthSales = sales.filter(s => {
      const sDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
      return sDate && sDate.startsWith(monthStr);
    });

    const monthExpenses = expenses.filter(e => {
      const eDate = e.date || (e.timestamp ? e.timestamp.split('T')[0] : '');
      return eDate && eDate.startsWith(monthStr);
    });

    let haircutRevenue = 0;
    let chemicalRevenue = 0;
    let productRevenue = 0;
    let discountTotal = 0;
    let customerPaidTotal = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    let barberShareTotal = 0;
    let shopShareTotal = 0;

    monthSales.forEach(s => {
      haircutRevenue += s.haircutPrice || 0;
      chemicalRevenue += s.chemicalPrice || 0;
      productRevenue += s.productPrice || 0;
      discountTotal += s.discountAmount || 0;
      customerPaidTotal += s.customerPaid || 0;
      barberShareTotal += s.barberTotalShare || 0;
      shopShareTotal += s.shopTotalShare || 0;

      const breakdown = getSalePaymentBreakdown(s);
      cashTotal += breakdown.cashAmount;
      transferTotal += breakdown.transferAmount;
    });

    const expenseTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = shopShareTotal - expenseTotal;

    return {
      monthNum,
      monthNameTh: THAI_MONTH_NAMES_FULL[idx],
      salesCount: monthSales.length,
      haircutRevenue,
      chemicalRevenue,
      productRevenue,
      discountTotal,
      customerPaidTotal,
      cashTotal,
      transferTotal,
      barberShareTotal,
      shopShareTotal,
      expenseTotal,
      netProfit
    };
  });

  const totalBills = monthlyData.reduce((sum, m) => sum + m.salesCount, 0);
  const totalHaircut = monthlyData.reduce((sum, m) => sum + m.haircutRevenue, 0);
  const totalChemical = monthlyData.reduce((sum, m) => sum + m.chemicalRevenue, 0);
  const totalProduct = monthlyData.reduce((sum, m) => sum + m.productRevenue, 0);
  const totalDiscounts = monthlyData.reduce((sum, m) => sum + m.discountTotal, 0);
  const totalCustomerPaid = monthlyData.reduce((sum, m) => sum + m.customerPaidTotal, 0);
  const totalCash = monthlyData.reduce((sum, m) => sum + m.cashTotal, 0);
  const totalTransfer = monthlyData.reduce((sum, m) => sum + m.transferTotal, 0);
  const totalBarberShare = monthlyData.reduce((sum, m) => sum + m.barberShareTotal, 0);
  const totalShopShare = monthlyData.reduce((sum, m) => sum + m.shopShareTotal, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenseTotal, 0);
  const totalNetProfit = totalShopShare - totalExpenses;
  const profitMarginPct = totalCustomerPaid > 0 ? (totalNetProfit / totalCustomerPaid) * 100 : 0;

  // Year sales for barber breakdown
  const yearSales = sales.filter(s => {
    const sDate = s.date || (s.timestamp ? s.timestamp.split('T')[0] : '');
    return sDate && sDate.startsWith(String(targetYear));
  });

  const barberStats = barbers.map(b => {
    const bSales = yearSales.filter(s => s.barberId === b.id);
    const bHaircut = bSales.reduce((sum, s) => sum + (s.haircutPrice || 0), 0);
    const bChemical = bSales.reduce((sum, s) => sum + (s.chemicalPrice || 0), 0);
    const bProduct = bSales.reduce((sum, s) => sum + (s.productPrice || 0), 0);
    const bCommissions = bSales.reduce((sum, s) => sum + (s.barberTotalShare || 0), 0);
    const bTips = bSales.reduce((sum, s) => sum + (s.tip || 0), 0);
    return {
      barber: b,
      clientsCount: bSales.length,
      haircutTotal: bHaircut,
      chemicalTotal: bChemical,
      productTotal: bProduct,
      commissionTotal: bCommissions,
      tipTotal: bTips
    };
  }).filter(b => b.clientsCount > 0 || b.commissionTotal > 0);

  // Expense categories
  const yearExpenses = expenses.filter(e => {
    const eDate = e.date || (e.timestamp ? e.timestamp.split('T')[0] : '');
    return eDate && eDate.startsWith(String(targetYear));
  });

  const categoryMap: Record<string, { count: number; total: number }> = {};
  yearExpenses.forEach(e => {
    const cat = e.category || 'ค่าใช้จ่ายทั่วไป';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, total: 0 };
    categoryMap[cat].count += 1;
    categoryMap[cat].total += e.amount || 0;
  });

  const expenseCategoryList = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    count: data.count,
    total: data.total
  })).sort((a, b) => b.total - a.total);

  return `
    <div style="background-color: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 24px; box-sizing: border-box; line-height: 1.4;">
      
      <!-- HEADER -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px;">
            เอกสารทางการสำหรับทำบัญชี & ยื่นภาษี (Official Accounting Report)
          </span>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #020617; letter-spacing: -0.02em;">
            ${cleanShop}
          </h1>
          <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 700; color: #b45309;">
            รายงานสรุปผลประกอบการและยอดขายประจำปี (รอบ 12 เดือน มกราคม – ธันวาคม)
          </p>
          <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 500; color: #64748b;">
            ANNUAL FINANCIAL & SALES AUDIT STATEMENT • ประจำปี พ.ศ. ${thaiBuddhistYear} (ค.ศ. ${targetYear})
          </p>
        </div>

        <div style="text-align: right; font-size: 11px; color: #475569;">
          <div style="background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; text-align: right;">
            <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">รอบระยะเวลาบัญชี (Fiscal Period)</div>
            <div style="font-weight: 800; color: #0f172a; font-size: 12px;">1 มกราคม – 31 ธันวาคม ${thaiBuddhistYear}</div>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
            รหัสบัญชีร้าน: <strong style="color: #334155;">${userEmail || 'POS-SYSTEM'}</strong>
          </div>
          <div style="font-size: 10px; color: #94a3b8;">
            วันที่จัดทำ: <strong style="color: #334155;">${formatThaiDate(new Date().toISOString().split('T')[0])}</strong>
          </div>
        </div>
      </div>

      <!-- 4 EXECUTIVE KPI SUMMARY BOXES -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
        <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center;">
          <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">1. ยอดขายรวมทั้งปี</span>
          <span style="font-size: 16px; font-weight: 900; color: #15803d; margin-top: 2px; display: block;">${formatBaht(totalCustomerPaid)}</span>
          <span style="font-size: 9px; color: #64748b;">${totalBills.toLocaleString()} รายการบิล</span>
        </div>

        <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center;">
          <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">2. ส่วนแบ่งช่าง (ต้นทุน)</span>
          <span style="font-size: 16px; font-weight: 900; color: #ea580c; margin-top: 2px; display: block;">${formatBaht(totalBarberShare)}</span>
          <span style="font-size: 9px; color: #64748b;">ค่าคอมมิชชั่นสะสม</span>
        </div>

        <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center;">
          <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">3. ค่าใช้จ่ายดำเนินงานร้าน</span>
          <span style="font-size: 16px; font-weight: 900; color: #e11d48; margin-top: 2px; display: block;">${formatBaht(totalExpenses)}</span>
          <span style="font-size: 9px; color: #64748b;">${yearExpenses.length} รายการจ่าย</span>
        </div>

        <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center;">
          <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">4. กำไรสุทธิของร้าน</span>
          <span style="font-size: 16px; font-weight: 900; color: ${totalNetProfit >= 0 ? '#0f766e' : '#be123c'}; margin-top: 2px; display: block;">${formatBaht(totalNetProfit)}</span>
          <span style="font-size: 9px; font-weight: 700; color: #475569;">Margin: ${profitMarginPct.toFixed(1)}%</span>
        </div>
      </div>

      <!-- STATEMENT OF COMPREHENSIVE INCOME -->
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc; margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 900; color: #020617; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>งบกำไรขาดทุนเบื้องต้น (Statement of Comprehensive Income)</span>
          <span style="font-weight: 400; color: #64748b;">หน่วย: บาท (THB)</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 11px;">
          <!-- Left Column -->
          <div style="border-right: 1px solid #e2e8f0; padding-right: 12px;">
            <div style="font-weight: 800; color: #1e293b; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">I. รายได้จากการประกอบกิจการ (Revenues)</div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0 2px 8px; color: #334155;">
              <span>- ค่าบริการตัดผม (Haircut Services)</span>
              <span style="font-weight: 600;">${formatBaht(totalHaircut)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0 2px 8px; color: #334155;">
              <span>- ค่าบริการเคมี (Chemical Treatments)</span>
              <span style="font-weight: 600;">${formatBaht(totalChemical)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0 2px 8px; color: #334155;">
              <span>- ขายผลิตภัณฑ์ (Retail Products)</span>
              <span style="font-weight: 600;">${formatBaht(totalProduct)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0 2px 8px; color: #be123c;">
              <span>- หัก: ส่วนลดและโปรโมชั่น</span>
              <span style="font-weight: 600;">-${formatBaht(totalDiscounts)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 8px; font-weight: 800; background-color: #ecfdf5; border-radius: 4px; color: #065f46; margin-top: 4px;">
              <span>รวมรายได้สุทธิจากลูกค้า (Gross Turnover)</span>
              <span>${formatBaht(totalCustomerPaid)}</span>
            </div>

            <div style="margin-top: 8px;">
              <div style="font-weight: 800; color: #1e293b; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">II. ต้นทุนค่าบริการช่าง (Direct Labor Cost)</div>
              <div style="display: flex; justify-content: space-between; padding: 2px 0 2px 8px; color: #c2410c;">
                <span>- ส่วนแบ่งช่างตัดผม (Barber Share)</span>
                <span style="font-weight: 600;">-${formatBaht(totalBarberShare)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 8px; font-weight: 800; background-color: #eff6ff; border-radius: 4px; color: #1e40af; margin-top: 4px;">
                <span>กำไรขั้นต้นส่วนของร้าน (Shop Gross Revenue)</span>
                <span>${formatBaht(totalShopShare)}</span>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div style="padding-left: 4px;">
            <div style="font-weight: 800; color: #1e293b; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">III. ค่าใช้จ่ายในการดำเนินงาน (Operating Expenses)</div>
            ${expenseCategoryList.slice(0, 4).map(c => `
              <div style="display: flex; justify-content: space-between; padding: 2px 0 2px 8px; color: #334155;">
                <span>- ${c.category} (${c.count} รายการ)</span>
                <span style="font-weight: 600;">-${formatBaht(c.total)}</span>
              </div>
            `).join('')}
            ${expenseCategoryList.length > 4 ? `
              <div style="display: flex; justify-content: space-between; padding: 2px 0 2px 8px; color: #334155;">
                <span>- หมวดหมู่อื่นๆ (${expenseCategoryList.slice(4).reduce((s, x) => s + x.count, 0)} รายการ)</span>
                <span style="font-weight: 600;">-${formatBaht(expenseCategoryList.slice(4).reduce((s, x) => s + x.total, 0))}</span>
              </div>
            ` : ''}
            ${expenseCategoryList.length === 0 ? '<div style="font-size: 10px; color: #94a3b8; padding: 4px 8px; font-style: italic;">ไม่มีบันทึกรายการค่าใช้จ่ายดำเนินงาน</div>' : ''}

            <div style="display: flex; justify-content: space-between; padding: 4px 8px; font-weight: 800; background-color: #fff1f2; border-radius: 4px; color: #9f1239; margin-top: 4px;">
              <span>รวมค่าใช้จ่ายดำเนินงานทั้งสิ้น (Total Expenses)</span>
              <span>-${formatBaht(totalExpenses)}</span>
            </div>

            <div style="margin-top: 8px;">
              <div style="font-weight: 800; color: #1e293b; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">IV. สรุปผลกำไรสุทธิประจำปี (Net Income)</div>
              <div style="display: flex; justify-content: space-between; padding: 6px 10px; font-weight: 900; background-color: #0f172a; color: #ffffff; border-radius: 6px; font-size: 12px; margin-top: 4px;">
                <span>กำไรสุทธิก่อนภาษี (Net Profit Before Tax)</span>
                <span style="color: #fde047;">${formatBaht(totalNetProfit)}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748b; margin-top: 6px; padding: 0 4px;">
              <span>💵 เงินสด: <strong>${formatBaht(totalCash)}</strong></span>
              <span>📲 โอน/QR: <strong>${formatBaht(totalTransfer)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 12-MONTH SCHEDULE TABLE -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 900; color: #020617; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>ตารางสรุปรายรับ-รายจ่าย 12 เดือน (มกราคม – ธันวาคม ${thaiBuddhistYear})</span>
          <span style="font-weight: 400; color: #64748b; font-size: 9px;">12-Month Master Accounting Schedule</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background-color: #1e293b; color: #ffffff; text-align: center; font-weight: bold;">
              <th style="padding: 4px 6px; text-align: left; border: 1px solid #334155;">เดือน</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">ยอดขายรวม</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">ตัดผม</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">เคมี</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">สินค้า</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">ส่วนลด</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">เงินสด</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">เงินโอน</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">ส่วนแบ่งช่าง</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">รายจ่ายร้าน</th>
              <th style="padding: 4px 6px; text-align: right; border: 1px solid #334155;">กำไรสุทธิ</th>
              <th style="padding: 4px 6px; text-align: center; border: 1px solid #334155;">บิล</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyData.map((m, idx) => `
              <tr style="border-bottom: 1px solid #cbd5e1; text-align: right; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 3px 6px; text-align: left; font-weight: bold; border-right: 1px solid #cbd5e1; color: #0f172a;">${idx + 1}. ${m.monthNameTh.split(' ')[0]}</td>
                <td style="padding: 3px 6px; font-weight: bold; border-right: 1px solid #cbd5e1; color: #0f172a;">${m.customerPaidTotal > 0 ? formatBaht(m.customerPaidTotal) : '-'}</td>
                <td style="padding: 3px 6px; border-right: 1px solid #cbd5e1; color: #334155;">${m.haircutRevenue > 0 ? formatBaht(m.haircutRevenue) : '-'}</td>
                <td style="padding: 3px 6px; border-right: 1px solid #cbd5e1; color: #334155;">${m.chemicalRevenue > 0 ? formatBaht(m.chemicalRevenue) : '-'}</td>
                <td style="padding: 3px 6px; border-right: 1px solid #cbd5e1; color: #334155;">${m.productRevenue > 0 ? formatBaht(m.productRevenue) : '-'}</td>
                <td style="padding: 3px 6px; border-right: 1px solid #cbd5e1; color: #e11d48;">${m.discountTotal > 0 ? `-${formatBaht(m.discountTotal)}` : '-'}</td>
                <td style="padding: 3px 6px; border-right: 1px solid #cbd5e1; color: #334155;">${m.cashTotal > 0 ? formatBaht(m.cashTotal) : '-'}</td>
                <td style="padding: 3px 6px; border-right: 1px solid #cbd5e1; color: #334155;">${m.transferTotal > 0 ? formatBaht(m.transferTotal) : '-'}</td>
                <td style="padding: 3px 6px; border-right: 1px solid #cbd5e1; color: #c2410c;">${m.barberShareTotal > 0 ? formatBaht(m.barberShareTotal) : '-'}</td>
                <td style="padding: 3px 6px; border-right: 1px solid #cbd5e1; color: #be123c;">${m.expenseTotal > 0 ? formatBaht(m.expenseTotal) : '-'}</td>
                <td style="padding: 3px 6px; font-weight: bold; border-right: 1px solid #cbd5e1; color: ${m.netProfit >= 0 ? '#0f766e' : '#be123c'};">${m.customerPaidTotal > 0 || m.expenseTotal > 0 ? formatBaht(m.netProfit) : '-'}</td>
                <td style="padding: 3px 6px; text-align: center; color: #64748b; font-family: monospace;">${m.salesCount > 0 ? m.salesCount : '-'}</td>
              </tr>
            `).join('')}

            <!-- TOTAL ROW -->
            <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold; text-align: right; border-top: 2px solid #0f172a;">
              <td style="padding: 5px 6px; text-align: left; border-right: 1px solid #334155;">รวมทั้งปี (12 เดือน)</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155; color: #fde047;">${formatBaht(totalCustomerPaid)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155;">${formatBaht(totalHaircut)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155;">${formatBaht(totalChemical)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155;">${formatBaht(totalProduct)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155; color: #fda4af;">-${formatBaht(totalDiscounts)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155;">${formatBaht(totalCash)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155;">${formatBaht(totalTransfer)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155; color: #fdba74;">${formatBaht(totalBarberShare)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155; color: #fda4af;">${formatBaht(totalExpenses)}</td>
              <td style="padding: 5px 6px; border-right: 1px solid #334155; color: #86efac;">${formatBaht(totalNetProfit)}</td>
              <td style="padding: 5px 6px; text-align: center; font-family: monospace;">${totalBills}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- BARBER SUMMARY TABLE -->
      ${barberStats.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 900; color: #020617; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>สรุปค่าคอมมิชชั่นและการให้บริการของช่างรายบุคคลตลอดปี (Barber Commission Audit)</span>
            <span style="font-weight: 400; color: #64748b; font-size: 9px;">รวมช่าง ${barberStats.length} ท่าน</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background-color: #f1f5f9; color: #1e293b; font-weight: bold; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 4px 6px; text-align: left; border-right: 1px solid #cbd5e1;">ชื่อช่าง</th>
                <th style="padding: 4px 6px; text-align: left; border-right: 1px solid #cbd5e1;">ตำแหน่ง</th>
                <th style="padding: 4px 6px; text-align: center; border-right: 1px solid #cbd5e1;">จำนวนลูกค้า</th>
                <th style="padding: 4px 6px; text-align: right; border-right: 1px solid #cbd5e1;">ยอดตัดผม</th>
                <th style="padding: 4px 6px; text-align: right; border-right: 1px solid #cbd5e1;">ยอดเคมี</th>
                <th style="padding: 4px 6px; text-align: right; border-right: 1px solid #cbd5e1;">ยอดสินค้า</th>
                <th style="padding: 4px 6px; text-align: right; border-right: 1px solid #cbd5e1;">ส่วนแบ่งที่จ่ายจริง</th>
                <th style="padding: 4px 6px; text-align: right;">ทิปสะสม</th>
              </tr>
            </thead>
            <tbody>
              ${barberStats.map((b, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 3px 6px; font-weight: bold; border-right: 1px solid #cbd5e1; color: #0f172a;">${b.barber.name}</td>
                  <td style="padding: 3px 6px; color: #64748b; border-right: 1px solid #cbd5e1;">${b.barber.position || 'ช่างประจำ'}</td>
                  <td style="padding: 3px 6px; text-align: center; font-weight: bold; border-right: 1px solid #cbd5e1; color: #334155; font-family: monospace;">${b.clientsCount}</td>
                  <td style="padding: 3px 6px; text-align: right; border-right: 1px solid #cbd5e1; color: #334155;">${formatBaht(b.haircutTotal)}</td>
                  <td style="padding: 3px 6px; text-align: right; border-right: 1px solid #cbd5e1; color: #334155;">${formatBaht(b.chemicalTotal)}</td>
                  <td style="padding: 3px 6px; text-align: right; border-right: 1px solid #cbd5e1; color: #334155;">${formatBaht(b.productTotal)}</td>
                  <td style="padding: 3px 6px; text-align: right; font-weight: bold; border-right: 1px solid #cbd5e1; color: #c2410c;">${formatBaht(b.commissionTotal)}</td>
                  <td style="padding: 3px 6px; text-align: right; color: #15803d;">${formatBaht(b.tipTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- SIGNATURE BLOCKS -->
      <div style="border-top: 2px solid #0f172a; padding-top: 14px; margin-top: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: center; font-size: 11px; color: #334155;">
          <div style="padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc;">
            <div style="font-weight: bold; color: #0f172a; margin-bottom: 24px;">ผู้จัดทำบัญชี / สมุห์บัญชี (Prepared by)</div>
            <div style="border-bottom: 1px solid #94a3b8; width: 180px; margin: 0 auto 6px auto;"></div>
            <div>( .......................................................................... )</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 4px;">วันที่ ........ / .................... / พ.ศ. ........</div>
          </div>

          <div style="padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; background-color: #f8fafc;">
            <div style="font-weight: bold; color: #0f172a; margin-bottom: 24px;">ผู้มีอำนาจลงนาม / เจ้าของกิจการ (Approved by)</div>
            <div style="border-bottom: 1px solid #94a3b8; width: 180px; margin: 0 auto 6px auto;"></div>
            <div>( .......................................................................... )</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 4px;">วันที่ ........ / .................... / พ.ศ. ........</div>
          </div>
        </div>

        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8;">
          <span>รายงานนี้สร้างขึ้นโดยระบบ POS Barbershop Cloud • ข้อมูลผ่านการคำนวณและตรวจสอบความถูกต้องอัตโนมัติ</span>
          <span>หน้า 1 จาก 1 • ออกเอกสารเมื่อ ${new Date().toLocaleString('th-TH')}</span>
        </div>
      </div>

    </div>
  `;
}

/**
 * Export Annual Accountant 12-Month Statement as High-Resolution A4 PDF.
 * Safe from OKLCH CSS parser issues.
 */
export async function exportAsyncAnnualPdfReport(
  shopName: string,
  targetYear: number,
  sales: SaleRecord[],
  expenses: Expense[] = [],
  barbers: Barber[] = [],
  userEmail: string = ''
): Promise<void> {
  const thaiBuddhistYear = targetYear + 543;
  const cleanShop = (shopName || 'ร้านบาร์เบอร์').trim().replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
  const fileName = `รายงานการเงินสรุปยอดขาย12เดือน_มค-ธค_${targetYear}_ร้าน${cleanShop}.pdf`;

  const htmlContent = generateAnnualHtmlReport(
    shopName,
    targetYear,
    sales,
    expenses,
    barbers,
    userEmail
  );

  const canvas = await renderHtmlContentToCanvas(htmlContent, 840);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const margin = 8;
  const imgWidth = pdfWidth - (margin * 2);
  const printableHeightMM = pdfHeight - (margin * 2);

  const pxPageHeight = (canvas.width / imgWidth) * printableHeightMM;
  const totalCanvasHeight = canvas.height;

  let srcY = 0;
  let pageCount = 0;

  while (srcY < totalCanvasHeight) {
    if (pageCount > 0) {
      pdf.addPage();
    }

    const sliceHeight = Math.min(pxPageHeight, totalCanvasHeight - srcY);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;

    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        srcY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );
    }

    const sliceData = sliceCanvas.toDataURL('image/png');
    const renderedImgHeightMM = (sliceHeight * imgWidth) / canvas.width;

    pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, renderedImgHeightMM);

    srcY += sliceHeight;
    pageCount++;
  }

  pdf.save(fileName);
}

// Barber Visual Palette & Emojis
export interface BarberTheme {
  emoji: string;
  avatarBg: string;
  badgeBg: string;
  badgeText: string;
  activeBorder: string;
  activeBg: string;
  inactiveBorder: string;
  inactiveBg: string;
  accentText: string;
  glow: string;
  ring: string;
}

const BARBER_THEMES: BarberTheme[] = [
  {
    emoji: '💈',
    avatarBg: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'text-indigo-600',
    activeBorder: 'border-indigo-500 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/70',
    activeBg: 'bg-gradient-to-b from-indigo-50/80 to-white text-indigo-950',
    inactiveBorder: 'border-indigo-100 hover:border-indigo-300',
    inactiveBg: 'bg-white hover:bg-indigo-50/30 text-slate-700',
    accentText: 'text-indigo-600',
    glow: 'shadow-indigo-500/25',
    ring: 'ring-indigo-400'
  },
  {
    emoji: '✂️',
    avatarBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'text-emerald-600',
    activeBorder: 'border-emerald-500 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/70',
    activeBg: 'bg-gradient-to-b from-emerald-50/80 to-white text-emerald-950',
    inactiveBorder: 'border-emerald-100 hover:border-emerald-300',
    inactiveBg: 'bg-white hover:bg-emerald-50/30 text-slate-700',
    accentText: 'text-emerald-600',
    glow: 'shadow-emerald-500/25',
    ring: 'ring-emerald-400'
  },
  {
    emoji: '💇‍♂️',
    avatarBg: 'bg-gradient-to-br from-sky-500 to-cyan-600 text-white',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'text-sky-600',
    activeBorder: 'border-sky-500 shadow-md shadow-sky-500/20 ring-2 ring-sky-400/70',
    activeBg: 'bg-gradient-to-b from-sky-50/80 to-white text-sky-950',
    inactiveBorder: 'border-sky-100 hover:border-sky-300',
    inactiveBg: 'bg-white hover:bg-sky-50/30 text-slate-700',
    accentText: 'text-sky-600',
    glow: 'shadow-sky-500/25',
    ring: 'ring-sky-400'
  },
  {
    emoji: '🧔',
    avatarBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'text-amber-600',
    activeBorder: 'border-amber-500 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/70',
    activeBg: 'bg-gradient-to-b from-amber-50/80 to-white text-amber-950',
    inactiveBorder: 'border-amber-100 hover:border-amber-300',
    inactiveBg: 'bg-white hover:bg-amber-50/30 text-slate-700',
    accentText: 'text-amber-600',
    glow: 'shadow-amber-500/25',
    ring: 'ring-amber-400'
  },
  {
    emoji: '👑',
    avatarBg: 'bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'text-purple-600',
    activeBorder: 'border-purple-500 shadow-md shadow-purple-500/20 ring-2 ring-purple-400/70',
    activeBg: 'bg-gradient-to-b from-purple-50/80 to-white text-purple-950',
    inactiveBorder: 'border-purple-100 hover:border-purple-300',
    inactiveBg: 'bg-white hover:bg-purple-50/30 text-slate-700',
    accentText: 'text-purple-600',
    glow: 'shadow-purple-500/25',
    ring: 'ring-purple-400'
  },
  {
    emoji: '🌟',
    avatarBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'text-rose-600',
    activeBorder: 'border-rose-500 shadow-md shadow-rose-500/20 ring-2 ring-rose-400/70',
    activeBg: 'bg-gradient-to-b from-rose-50/80 to-white text-rose-950',
    inactiveBorder: 'border-rose-100 hover:border-rose-300',
    inactiveBg: 'bg-white hover:bg-rose-50/30 text-slate-700',
    accentText: 'text-rose-600',
    glow: 'shadow-rose-500/25',
    ring: 'ring-rose-400'
  },
  {
    emoji: '✨',
    avatarBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'text-teal-600',
    activeBorder: 'border-teal-500 shadow-md shadow-teal-500/20 ring-2 ring-teal-400/70',
    activeBg: 'bg-gradient-to-b from-teal-50/80 to-white text-teal-950',
    inactiveBorder: 'border-teal-100 hover:border-teal-300',
    inactiveBg: 'bg-white hover:bg-teal-50/30 text-slate-700',
    accentText: 'text-teal-600',
    glow: 'shadow-teal-500/25',
    ring: 'ring-teal-400'
  },
  {
    emoji: '🎩',
    avatarBg: 'bg-gradient-to-br from-violet-600 to-indigo-800 text-white',
    badgeBg: 'bg-violet-100 text-violet-800 border-violet-200',
    badgeText: 'text-violet-600',
    activeBorder: 'border-violet-500 shadow-md shadow-violet-500/20 ring-2 ring-violet-400/70',
    activeBg: 'bg-gradient-to-b from-violet-50/80 to-white text-violet-950',
    inactiveBorder: 'border-violet-100 hover:border-violet-300',
    inactiveBg: 'bg-white hover:bg-violet-50/30 text-slate-700',
    accentText: 'text-violet-600',
    glow: 'shadow-violet-500/25',
    ring: 'ring-violet-400'
  }
];

export function getBarberTheme(barberIdOrName: string | number, index?: number): BarberTheme {
  if (typeof index === 'number' && index >= 0) {
    return BARBER_THEMES[index % BARBER_THEMES.length];
  }
  const str = String(barberIdOrName || 'barber');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % BARBER_THEMES.length;
  return BARBER_THEMES[idx];
}

// Full 1-Year System Backup Data Structure
export interface SystemBackupData {
  version: string;
  backupDate: string;
  backupType: '1-year-annual' | 'manual' | 'pre-reset-auto';
  userEmail: string;
  shopName: string;
  firstLoginDate?: string;
  daysActive?: number;
  totalSalesCount: number;
  totalIncome: number;
  data: {
    shopConfig?: any;
    shareConfig?: any;
    barbers?: any[];
    products?: any[];
    chemicalPromos?: any[];
    vouchers?: any[];
    sales?: any[];
    expenses?: any[];
    payslips?: any[];
    cashCounter?: any;
    members?: any[];
    memberPackages?: any[];
  };
}

// Download Full System JSON Backup File
export function exportFullSystemBackupJson(
  backupData: SystemBackupData,
  customFilename?: string
): void {
  try {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const cleanShopName = (backupData.shopName || 'BarberPOS').replace(/[/\\?%*:|"<>]/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = customFilename || `สำรองข้อมูลระบบ1ปี_ร้าน${cleanShopName}_${dateStr}.json`;

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', jsonString);
    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (err) {
    console.error('Failed to export full system JSON backup:', err);
  }
}


