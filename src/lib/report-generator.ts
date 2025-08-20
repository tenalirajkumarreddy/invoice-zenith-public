// Report Generation Utilities
export interface PrintStyles {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

export const defaultPrintStyles: PrintStyles = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: {
    top: '20mm',
    right: '15mm',
    bottom: '20mm',
    left: '15mm',
  }
};

export const reportCSS = `
  /* Print Styles */
  @page {
    size: A4 portrait;
    margin: 20mm 15mm;
  }
  
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      background: white;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    .no-break {
      page-break-inside: avoid;
    }
    
    .header-section {
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .report-table th,
    .report-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      font-size: 11px;
    }
    
    .report-table th {
      background-color: #f5f5f5 !important;
      font-weight: bold;
    }
    
    .summary-card {
      background-color: #f9f9f9 !important;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
    }
    
    .company-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    
    .report-title {
      font-size: 18px;
      color: #666;
      margin-bottom: 10px;
    }
    
    .report-metadata {
      font-size: 12px;
      color: #888;
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .currency {
      font-weight: bold;
      color: #2563eb;
    }
    
    .status-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
    }
    
    .status-completed { background-color: #dcfce7; color: #16a34a; }
    .status-pending { background-color: #fef3c7; color: #d97706; }
    .status-cancelled { background-color: #fee2e2; color: #dc2626; }
    
    .footer-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  }
  
  /* Screen Styles */
  @media screen {
    .print-preview {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      padding: 20mm 15mm;
    }
  }
`;

export const generateReportHeader = (
  companyName: string,
  reportTitle: string,
  reportDate: string,
  additionalInfo?: string
): string => {
  return `
    <div class="header-section">
      <div class="company-header">
        <div class="company-name">${companyName}</div>
        <div class="report-title">${reportTitle}</div>
      </div>
      <div class="report-metadata">
        <span>Generated on: ${reportDate}</span>
        ${additionalInfo ? `<span>${additionalInfo}</span>` : ''}
      </div>
    </div>
  `;
};

export const generateTableHTML = (
  headers: string[],
  rows: (string | number)[][],
  className = 'report-table'
): string => {
  const headerRow = headers.map(header => `<th>${header}</th>`).join('');
  const bodyRows = rows.map(row => 
    `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
  ).join('');
  
  return `
    <table class="${className}">
      <thead>
        <tr>${headerRow}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
};

export const generateSummaryCard = (
  title: string,
  items: { label: string; value: string | number }[]
): string => {
  const itemsHTML = items.map(item => 
    `<p><strong>${item.label}:</strong> ${item.value}</p>`
  ).join('');
  
  return `
    <div class="summary-card no-break">
      <h3>${title}</h3>
      ${itemsHTML}
    </div>
  `;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusBadgeClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'finished':
    case 'paid':
      return 'status-completed';
    case 'pending':
    case 'assigned':
    case 'partial':
      return 'status-pending';
    case 'cancelled':
    case 'failed':
      return 'status-cancelled';
    default:
      return 'status-pending';
  }
};

export const downloadAsHTML = (content: string, filename: string): void => {
  const fullHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${filename}</title>
      <style>${reportCSS}</style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
  
  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadAsCSV = (data: any[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const printReport = (content: string, styles?: Partial<PrintStyles>): void => {
  const printStyles = { ...defaultPrintStyles, ...styles };
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window');
    return;
  }
  
  const fullHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Print Report</title>
      <style>
        ${reportCSS}
        @page {
          size: ${printStyles.pageSize} ${printStyles.orientation};
          margin: ${printStyles.margins.top} ${printStyles.margins.right} ${printStyles.margins.bottom} ${printStyles.margins.left};
        }
      </style>
    </head>
    <body>
      ${content}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(fullHTML);
  printWindow.document.close();
};
