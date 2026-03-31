import emailjs from '@emailjs/browser';
import { EposTransaction } from '../types';
import { BRANCH_DETAILS, BranchId } from '../types/auth';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

const LOGO_URL = 'https://i.postimg.cc/9F0JcWHq/Greenchem-Logo-Official.png';

export async function sendReceiptEmail(
  toEmail: string,
  transaction: EposTransaction,
  branchId: BranchId
) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY || SERVICE_ID.includes('xxx') || TEMPLATE_ID.includes('xxx') || PUBLIC_KEY.includes('xxx')) {
    throw new Error('EmailJS not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in .env');
  }

  const branch = BRANCH_DETAILS[branchId];
  const txDate = new Date(transaction.timestamp);
  const dateStr = txDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = txDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const itemsHtml = transaction.items
    .map(item => {
      const refundedStyle = item.refunded ? 'text-decoration: line-through; color: #999;' : '';
      return `<tr style="${refundedStyle}">
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">£${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">£${item.lineTotal.toFixed(2)}${item.refunded ? ' (Refunded)' : ''}</td>
      </tr>`;
    })
    .join('');

  const templateParams = {
    to_email: toEmail,
    logo_url: LOGO_URL,
    branch_name: branch.name,
    branch_address: branch.address,
    branch_phone: branch.phone,
    date: dateStr,
    time: timeStr,
    tx_id: transaction.id.slice(0, 8).toUpperCase(),
    items_html: itemsHtml,
    subtotal: `£${transaction.subtotal.toFixed(2)}`,
    discount_percent: transaction.discountPercent ? `${transaction.discountPercent}%` : '',
    discount_amount: transaction.discountAmount ? `£${transaction.discountAmount.toFixed(2)}` : '',
    has_discount: (transaction.discountPercent && transaction.discountPercent > 0) ? 'yes' : '',
    total: `£${transaction.total.toFixed(2)}`,
    payment_method: transaction.paymentMethod.toUpperCase(),
    change_due: transaction.changeDue > 0 ? `£${transaction.changeDue.toFixed(2)}` : '—',
  };

  await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
}
