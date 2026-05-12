import { SHARED_DOC_CSS, HEADER_HTML, FOOTER_HTML } from './shared-css'

export function paySlipHTML(data: Record<string, any>): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pay Slip – The Beyond Headlines</title>
  <style>${SHARED_DOC_CSS}</style>
  <style>
    .body {
      flex: 1;
      padding: 8px 20px 8px 20px;
    }
    .payslip-title {
      text-align: center;
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #111;
      margin-bottom: 1px;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .payslip-subtitle {
      text-align: center;
      font-size: 13px;
      font-weight: 800;
      color: #111;
      margin-bottom: 8px;
    }
    .ref-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 10.5px;
      background: #f5f5f5;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 5px 12px;
    }
    .ref-row span {
      font-weight: 700;
      color: #333;
    }
    .emp-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .emp-table td {
      border: 1px solid #ccc;
      padding: 3px 8px;
      vertical-align: middle;
    }
    .emp-table .label {
      font-weight: 700;
      color: #555;
      white-space: nowrap;
      background: #f9f9f9;
    }
    .emp-table .value {
      font-weight: 600;
      color: #111;
    }
    .tables-row {
      display: flex;
      gap: 14px;
      margin-bottom: 6px;
    }
    .tables-row .table-col {
      flex: 1;
    }
    .tables-row table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 0;
    }
    .tables-row thead tr {
      background: transparent;
    }
    .tables-row thead th {
      padding: 4px 8px;
      text-align: left;
      font-weight: 700;
      border: 1px solid #999;
      border-bottom: 2px solid #333;
      font-size: 10px;
      color: #111;
    }
    .tables-row thead th.right {
      text-align: right;
    }
    .tables-row tbody td {
      padding: 3px 8px;
      border: 1px solid #ddd;
      vertical-align: middle;
    }
    .tables-row tbody tr:nth-child(even) {
      background: #f5f5f5;
    }
    .tables-row td.right {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .tables-row td.label-cell {
      font-weight: 600;
      color: #444;
    }
    .tables-row .summary-row td {
      border: 1px solid #ddd;
      padding: 5px 8px;
    }
    .tables-row .summary-row td.label {
      font-weight: 700;
      text-align: right;
      padding-right: 8px;
    }
    .net-payment-box {
      background: transparent;
      border: 2px solid #333;
      border-radius: 6px;
      padding: 6px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .net-payment-box .net-label {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      color: #333;
      letter-spacing: 0.04em;
    }
    .net-payment-box .net-amount {
      font-size: 16px;
      font-weight: 800;
      color: #111;
    }
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
      margin-bottom: 30px;
    }
    .breakdown-table thead tr {
      background: transparent;
    }
    .breakdown-table thead th {
      padding: 4px 8px;
      text-align: left;
      font-weight: 700;
      border: 1px solid #999;
      border-bottom: 2px solid #333;
      font-size: 10px;
      color: #111;
    }
    .breakdown-table thead th.right {
      text-align: right;
    }
    .breakdown-table tbody td {
      padding: 3px 8px;
      border: 1px solid #ddd;
    }
    .breakdown-table td.right {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .breakdown-table td.label-cell {
      font-weight: 600;
      color: #444;
    }
    .breakdown-table .summary-row td {
      border: 1px solid #ddd;
      padding: 5px 8px;
    }
    .breakdown-table .summary-row td.label {
      font-weight: 700;
      text-align: right;
      padding-right: 8px;
    }
    .breakdown-table .summary-row.total-row {
      background: transparent;
    }
    .breakdown-table .summary-row.total-row td {
      font-weight: 800;
      border: 2px solid #333;
      color: #111;
    }
    .sig-section {
      margin-top: 4px;
      border-top: 2px solid #333;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }
    .sig-box {
      flex: 1;
      text-align: center;
    }
    .sig-box .sig-label {
      font-size: 10px;
      font-weight: 700;
      color: #555;
      margin-bottom: 4px;
    }
    .sig-line {
      border-top: 1.5px solid #333;
      margin-top: 90px;
      padding-top: 4px;
      font-size: 9px;
      color: #666;
    }
  </style>
</head>
<body>
<div class="page">
  ${HEADER_HTML()}
  <div class="body">
    <div class="payslip-title">Pay Slip</div>
    <div class="payslip-subtitle">For the Period of ${data.period || ''}</div>
    <div class="ref-row">
      <div><span>Ref:</span> Pay Slip-${data.ref_code || data.employee_id || ''}</div>
      <div><span>Date:</span> ${data.date_fmt || ''}</div>
    </div>
    <table class="emp-table">
      <tr>
        <td class="label" style="width:22%">Employee ID:</td>
        <td class="value" style="width:28%">${data.ref_code || data.employee_id || ''}</td>
        <td class="label" style="width:22%">Name:</td>
        <td class="value" style="width:28%">${data.name || ''}</td>
      </tr>
      <tr>
        <td class="label">Department:</td>
        <td class="value">${data.department || 'N/A'}</td>
        <td class="label">Designation:</td>
        <td class="value">${data.designation || ''}</td>
      </tr>
      <tr>
        <td class="label">Date of Joining:</td>
        <td class="value">${data.joining_date_fmt || ''}</td>
        <td class="label">PF Account No:</td>
        <td class="value">N/A</td>
      </tr>
      <tr>
        <td class="label">Days Worked:</td>
        <td class="value">${data.days_worked || '30'}</td>
        <td class="label">Casual leave:</td>
        <td class="value">N/A</td>
      </tr>
      <tr>
        <td class="label">Bank Account:</td>
        <td class="value">${data.bank_account || 'N/A'}</td>
        <td class="label">Earned Leave:</td>
        <td class="value">N/A</td>
      </tr>
    </table>
    <div class="tables-row">
      <div class="table-col">
        <table>
          <thead><tr><th>Earnings</th><th class="right">Amount (BDT)</th></tr></thead>
          <tbody>
            <tr><td class="label-cell">Basic</td><td class="right">${data.basic_fmt || ''}</td></tr>
            <tr><td class="label-cell">House Rent Allowance</td><td class="right">${data.house_rent_fmt || ''}</td></tr>
            <tr><td class="label-cell">Conveyance Allowance</td><td class="right">${data.conveyance_fmt || ''}</td></tr>
            <tr><td class="label-cell">Medical Allowance</td><td class="right">${data.medical_fmt || ''}</td></tr>
            <tr><td class="label-cell">Mobile &amp; Other Allowance</td><td class="right">${data.food_mobile_fmt || ''}</td></tr>
            <tr class="summary-row"><td class="label">Total Earned</td><td class="right" style="font-weight:700;">${data.total_earnings_fmt || ''}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="table-col">
        <table>
          <thead><tr><th>Deductions</th><th class="right">Amount (BDT)</th></tr></thead>
          <tbody>
            <tr><td class="label-cell">Absent Amount</td><td class="right">-</td></tr>
            <tr><td class="label-cell">Mobile Deduction</td><td class="right">-</td></tr>
            <tr><td class="label-cell">Advance</td><td class="right">-</td></tr>
            <tr><td class="label-cell">PF Fund</td><td class="right">-</td></tr>
            <tr><td class="label-cell">Source Tax</td><td class="right">${data.tax_fmt || '-'}</td></tr>
            <tr class="summary-row"><td class="label">Total Deduction</td><td class="right" style="font-weight:700;">${data.total_deductions_fmt || ''}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="net-payment-box">
      <div class="net-label">Net Payment</div>
      <div class="net-amount">BDT ${data.net_payment_fmt || ''}</div>
    </div>
    <table class="breakdown-table">
      <thead><tr><th style="width:50%">Breakdown</th><th class="right" style="width:50%">Amount (BDT)</th></tr></thead>
      <tbody>
        <tr><td class="label-cell">Bank</td><td class="right">${data.bank_total_fmt || ''}</td></tr>
        <tr><td class="label-cell">Cash</td><td class="right">${data.cash_fmt || ''}</td></tr>
        <tr class="summary-row total-row"><td class="label">Total</td><td class="right">${data.net_payment_fmt || ''}</td></tr>
      </tbody>
    </table>
    <div class="sig-section">
      <div class="sig-box">
        <div class="sig-label">Authorized By</div>
        <div class="sig-line">Signature &amp; Seal</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">Signature of Employee</div>
        <div class="sig-line">Signature</div>
      </div>
    </div>
  </div>
  ${FOOTER_HTML(1, 1)}
</div>
</body>
</html>`
}
