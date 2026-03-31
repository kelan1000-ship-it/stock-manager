// ESC/POS Printer Service — singleton, no React dependency
// Communicates via Web Serial API for label printers with RJ12 cash drawer

import { EposTransaction } from '../types';

const PAPER_WIDTH = 32; // 58mm label printer = 32 chars per line

// ESC/POS command bytes
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD = {
  INIT: [ESC, 0x40],                       // Initialize printer
  BOLD_ON: [ESC, 0x45, 0x01],              // Bold on
  BOLD_OFF: [ESC, 0x45, 0x00],             // Bold off
  ALIGN_CENTER: [ESC, 0x61, 0x01],         // Center alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],           // Left alignment
  ALIGN_RIGHT: [ESC, 0x61, 0x02],          // Right alignment
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],        // Double height
  NORMAL_SIZE: [ESC, 0x21, 0x00],          // Normal size
  CUT: [GS, 0x56, 0x01],                   // Partial cut
  CASH_DRAWER: [ESC, 0x70, 0x00, 25, 250], // Pulse pin 2: 50ms on, 500ms off
  FEED_LINES: (n: number) => [ESC, 0x64, n], // Feed n lines
};

// Module-level singleton state
let port: SerialPort | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let usbDevice: USBDevice | null = null;

export function isConnected(): boolean {
  return (port !== null && writer !== null) || (usbDevice?.opened === true);
}

export function connectionType(): 'serial' | 'usb' | null {
  if (port !== null && writer !== null) return 'serial';
  if (usbDevice?.opened === true) return 'usb';
  return null;
}

export async function connectPrinter(baudRate = 9600): Promise<void> {
  if (!navigator.serial) {
    throw new Error('Web Serial API not supported in this browser');
  }
  if (isConnected()) return;

  port = await navigator.serial.requestPort();
  await port.open({ baudRate });
  if (port.writable) {
    writer = port.writable.getWriter();
  } else {
    throw new Error('Port opened but writable stream not available');
  }
}

export async function connectPrinterUSB(): Promise<void> {
  if (!navigator.usb) {
    throw new Error('WebUSB API not supported in this browser');
  }
  if (isConnected()) return;

  usbDevice = await navigator.usb.requestDevice({
    filters: [{ vendorId: 0x1FC9 }],
  });
  await usbDevice.open();
  await usbDevice.selectConfiguration(1);
  await usbDevice.claimInterface(0);
}

export async function disconnectPrinter(): Promise<void> {
  try {
    if (writer) {
      writer.releaseLock();
      writer = null;
    }
    if (port) {
      await port.close();
      port = null;
    }
    if (usbDevice) {
      await usbDevice.close();
      usbDevice = null;
    }
  } catch {
    writer = null;
    port = null;
    usbDevice = null;
  }
}

async function sendBytes(data: number[]): Promise<void> {
  const bytes = new Uint8Array(data);
  if (writer) {
    await writer.write(bytes);
  } else if (usbDevice?.opened) {
    await usbDevice.transferOut(1, bytes);
  } else {
    throw new Error('Printer not connected');
  }
}

const textEncoder = new TextEncoder();

/** Encode text for ESC/POS printers (CP437). Fixes multi-byte UTF-8 chars like £. */
function encodeForPrinter(text: string): number[] {
  const utf8 = Array.from(textEncoder.encode(text));
  const result: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    // £ (U+00A3) encodes as UTF-8 [0xC2, 0xA3] — replace with CP437 byte 0x9C
    if (utf8[i] === 0xC2 && i + 1 < utf8.length && utf8[i + 1] === 0xA3) {
      result.push(0x9C);
      i++; // skip next byte
    } else {
      result.push(utf8[i]);
    }
  }
  return result;
}

async function sendText(text: string): Promise<void> {
  const bytes = textEncoder.encode(text);
  if (writer) {
    await writer.write(bytes);
  } else if (usbDevice?.opened) {
    await usbDevice.transferOut(1, bytes);
  } else {
    throw new Error('Printer not connected');
  }
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;
}

function centerText(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  const pad = Math.floor((width - str.length) / 2);
  return ' '.repeat(pad) + str;
}

function dashedLine(): string {
  return '-'.repeat(PAPER_WIDTH);
}

export async function openCashDrawer(): Promise<void> {
  await sendBytes(CMD.CASH_DRAWER);
}

interface BranchDetails {
  name: string;
  address: string;
  phone: string;
}

export async function printReceipt(
  transaction: EposTransaction,
  branchDetails: BranchDetails,
  options?: { showVat?: boolean }
): Promise<void> {
  const lines: number[] = [];
  const push = (...bytes: number[]) => lines.push(...bytes);
  const pushText = (text: string) => {
    lines.push(...encodeForPrinter(text));
  };
  const pushLine = (text: string = '') => {
    pushText(text);
    push(LF);
  };

  const isRefund = transaction.type === 'refund';

  // Initialize
  push(...CMD.INIT);

  // Header - centered, bold
  push(...CMD.ALIGN_CENTER);
  push(...CMD.BOLD_ON);
  push(...CMD.DOUBLE_HEIGHT);
  pushLine(branchDetails.name.split(' - ')[0]); // "Greenchem Pharmacy"
  push(...CMD.NORMAL_SIZE);
  push(...CMD.BOLD_OFF);
  const branchLabel = branchDetails.name.split(' - ')[1] || '';
  if (branchLabel) pushLine(branchLabel);
  pushLine(branchDetails.address);
  pushLine(`Tel: ${branchDetails.phone}`);
  pushLine('');

  // Transaction type
  if (isRefund) {
    push(...CMD.BOLD_ON);
    pushLine('*** REFUND ***');
    push(...CMD.BOLD_OFF);
  }

  // Date/time and reference
  const date = new Date(transaction.timestamp);
  const dateStr = date.toLocaleDateString('en-GB');
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  pushLine(`${dateStr}  ${timeStr}`);
  pushLine(`Ref: ${transaction.id.slice(0, 8).toUpperCase()}`);
  pushLine(dashedLine());

  // Items
  for (const item of transaction.items) {
    const priceStr = `£${item.lineTotal.toFixed(2)}`;
    if (item.quantity === 1) {
      const nameWidth = PAPER_WIDTH - priceStr.length - 1;
      pushLine(padRight(item.name, nameWidth) + padLeft(priceStr, priceStr.length + 1));
    } else {
      pushLine(item.name);
      const qtyLine = `  ${item.quantity} x £${item.unitPrice.toFixed(2)}`;
      pushLine(padRight(qtyLine, PAPER_WIDTH - priceStr.length - 1) + padLeft(priceStr, priceStr.length + 1));
    }
  }

  pushLine(dashedLine());

  // Subtotal
  const subtotalStr = `£${transaction.subtotal.toFixed(2)}`;
  pushLine(padRight('SUBTOTAL', PAPER_WIDTH - subtotalStr.length) + subtotalStr);

  // VAT
  if (options?.showVat && transaction.vatAmount !== undefined) {
    const vatStr = `£${transaction.vatAmount.toFixed(2)}`;
    pushLine(padRight('VAT (20%)', PAPER_WIDTH - vatStr.length) + vatStr);
  }

  // Discount
  if (transaction.discountPercent && transaction.discountAmount) {
    const discStr = `-£${transaction.discountAmount.toFixed(2)}`;
    const discLabel = `DISCOUNT (${transaction.discountPercent}%)`;
    pushLine(padRight(discLabel, PAPER_WIDTH - discStr.length) + discStr);
  }

  // Total
  push(...CMD.BOLD_ON);
  push(...CMD.DOUBLE_HEIGHT);
  const totalStr = `£${transaction.total.toFixed(2)}`;
  pushLine(padRight('TOTAL', PAPER_WIDTH - totalStr.length) + totalStr);
  push(...CMD.NORMAL_SIZE);
  push(...CMD.BOLD_OFF);

  pushLine(dashedLine());

  // Payment details
  const methodLabel = transaction.paymentMethod.toUpperCase();
  pushLine(padRight('PAID', PAPER_WIDTH - methodLabel.length) + methodLabel);

  if (transaction.paymentMethod !== 'card') {
    const tenderedStr = `£${transaction.amountTendered.toFixed(2)}`;
    pushLine(padRight('TENDERED', PAPER_WIDTH - tenderedStr.length) + tenderedStr);
    if (transaction.changeDue > 0) {
      const changeStr = `£${transaction.changeDue.toFixed(2)}`;
      pushLine(padRight('CHANGE', PAPER_WIDTH - changeStr.length) + changeStr);
    }
  }

  pushLine('');

  // Footer
  push(...CMD.ALIGN_CENTER);
  pushLine('Thank you for your custom');
  if (options?.showVat) {
    pushLine('VAT no. 344 6242 64');
  } else {
    pushLine('This is NOT a VAT receipt');
  }
  pushLine('');

  // Feed and cut
  push(...CMD.FEED_LINES(4));
  push(...CMD.CUT);

  // Cash drawer kick at end of receipt
  push(...CMD.CASH_DRAWER);

  // Send everything at once
  await sendBytes(lines);
}

// Safe wrappers that catch errors

export async function safeOpenCashDrawer(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!isConnected()) return { ok: true }; // Silently skip if not connected
    await openCashDrawer();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to open cash drawer' };
  }
}

export async function safePrintReceipt(
  transaction: EposTransaction,
  branchDetails: BranchDetails,
  options?: { showVat?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!isConnected()) return { ok: false, error: 'Printer not connected' };
    await printReceipt(transaction, branchDetails, options);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Print failed' };
  }
}

// Browser-based print fallback — works on ChromeOS and any browser
export function printReceiptViaBrowser(
  transaction: EposTransaction,
  branchDetails: BranchDetails,
  options?: { showVat?: boolean }
): { ok: boolean; error?: string } {
  try {
    const isRefund = transaction.type === 'refund';
    const date = new Date(transaction.timestamp);
    const dateStr = date.toLocaleDateString('en-GB');
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    let itemsHtml = '';
    for (const item of transaction.items) {
      const lineTotal = `&pound;${item.lineTotal.toFixed(2)}`;
      if (item.quantity === 1) {
        itemsHtml += `<tr><td>${item.name}</td><td class="right">${lineTotal}</td></tr>`;
      } else {
        itemsHtml += `<tr><td>${item.name}<br><span class="qty">${item.quantity} x &pound;${item.unitPrice.toFixed(2)}</span></td><td class="right">${lineTotal}</td></tr>`;
      }
    }

    const discountHtml = transaction.discountPercent && transaction.discountAmount
      ? `<tr><td>DISCOUNT (${transaction.discountPercent}%)</td><td class="right">-&pound;${transaction.discountAmount.toFixed(2)}</td></tr>`
      : '';

    const vatHtml = options?.showVat && transaction.vatAmount !== undefined
      ? `<tr><td>VAT (20%)</td><td class="right">&pound;${transaction.vatAmount.toFixed(2)}</td></tr>`
      : '';

    const tenderedHtml = transaction.paymentMethod !== 'card'
      ? `<tr><td>TENDERED</td><td class="right">&pound;${transaction.amountTendered.toFixed(2)}</td></tr>` +
        (transaction.changeDue > 0 ? `<tr><td>CHANGE</td><td class="right">&pound;${transaction.changeDue.toFixed(2)}</td></tr>` : '')
      : '';

    const branchName = branchDetails.name.split(' - ')[0];
    const branchLabel = branchDetails.name.split(' - ')[1] || '';

    const html = `<!DOCTYPE html>
<html><head><title>Receipt</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 58mm; margin: 0 auto; padding: 4mm; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .big { font-size: 14px; font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  .qty { font-size: 10px; color: #555; }
  .total-row td { font-size: 14px; font-weight: bold; padding-top: 4px; }
</style>
</head><body>
  <div class="center big">${branchName}</div>
  ${branchLabel ? `<div class="center">${branchLabel}</div>` : ''}
  <div class="center">${branchDetails.address}</div>
  <div class="center">Tel: ${branchDetails.phone}</div>
  ${isRefund ? '<div class="center bold" style="margin-top:4px">*** REFUND ***</div>' : ''}
  <div class="center" style="margin-top:4px">${dateStr} &nbsp; ${timeStr}</div>
  <div class="center">Ref: ${transaction.id.slice(0, 8).toUpperCase()}</div>
  <div class="divider"></div>
  <table>${itemsHtml}</table>
  <div class="divider"></div>
  <table>
    <tr><td>SUBTOTAL</td><td class="right">&pound;${transaction.subtotal.toFixed(2)}</td></tr>
    ${vatHtml}
    ${discountHtml}
    <tr class="total-row"><td>TOTAL</td><td class="right">&pound;${transaction.total.toFixed(2)}</td></tr>
  </table>
  <div class="divider"></div>
  <table>
    <tr><td>PAID</td><td class="right">${transaction.paymentMethod.toUpperCase()}</td></tr>
    ${tenderedHtml}
  </table>
  <div class="center" style="margin-top:8px">Thank you for your custom</div>
  ${options?.showVat 
    ? '<div class="center" style="margin-top:4px">VAT no. 344 6242 64</div>' 
    : '<div class="center" style="margin-top:4px">This is NOT a VAT receipt</div>'
  }
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return { ok: false, error: 'Failed to create print frame' };
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();

    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Browser print failed' };
  }
}
