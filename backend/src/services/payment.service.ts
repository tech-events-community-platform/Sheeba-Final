import dotenv from 'dotenv';
import path from 'path';
import { query } from '../config/db';
import { PaymentDestination } from '../types';

export interface VerifyPaymentResult {
  verified: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  provider: string;
  receiverAccount?: string | null;
  receiverName?: string | null;
  payerName?: string | null;
  paymentDate?: string | null;
  rawReceipt?: any;
  error?: string;
  code?: string;
}

export class PaymentService {
  private static BASE_URL = 'https://links.et';

  private static getApiKey(): string {
    let key = (
      process.env.LINKS_ET_API_KEY ||
      process.env.PAYMENT_VERIFICATION_API_KEY ||
      ''
    ).trim();

    if (!key) {
      try {
        dotenv.config({ override: true });
        key = (
          process.env.LINKS_ET_API_KEY ||
          process.env.PAYMENT_VERIFICATION_API_KEY ||
          ''
        ).trim();
      } catch {}
    }

    if (!key) {
      try {
        dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
        key = (
          process.env.LINKS_ET_API_KEY ||
          process.env.PAYMENT_VERIFICATION_API_KEY ||
          ''
        ).trim();
      } catch {}
    }

    return key;
  }

  /**
   * Normalize and extract standardized details from any Links.et provider receipt
   */
  public static extractReceiptDetails(rawInput: any, providerKey?: string): {
    amount: number;
    currency: string;
    transactionId: string;
    status: string;
    receiverAccount?: string | null;
    receiverName?: string | null;
    payerName?: string | null;
    paymentDate?: string | null;
  } {
    if (!rawInput || typeof rawInput !== 'object') {
      throw new Error('Invalid or empty provider receipt structure received from Links.et.');
    }

    // Unwrap if response is { reference, status, receipt: { ... } }
    const receipt = rawInput.receipt && typeof rawInput.receipt === 'object' ? rawInput.receipt : rawInput;
    const source = receipt.source || rawInput.source || '';
    const rawStatus = rawInput.status || receipt.transactionStatus || receipt.status || 'COMPLETED';

    let amount = 0;
    let currency = 'ETB';
    let transactionId = '';
    let status = String(rawStatus).toUpperCase();
    let receiverAccount: string | null = null;
    let receiverName: string | null = null;
    let payerName: string | null = null;
    let paymentDate: string | null = null;

    if (source === 'telebirr-html' || providerKey === 'telebirr') {
      const rawAmt = receipt.settledAmount || receipt.totalPaidAmount || receipt.amount || rawInput.amount || '0';
      const cleanNum = String(rawAmt).replace(/[^0-9.]/g, '');
      amount = parseFloat(cleanNum) || 0;
      currency = 'ETB';
      transactionId = receipt.receiptNo || receipt.reference || rawInput.reference || '';
      receiverAccount = receipt.creditedPartyAccountNo || receipt.receiverAccount || null;
      receiverName = receipt.creditedPartyName || receipt.receiverName || null;
      payerName = receipt.payerName || null;
      paymentDate = receipt.paymentDate || null;
    } else if (source === 'cbe-pdf' || source === 'cbebirr-pdf' || providerKey === 'cbe') {
      const rawAmt = receipt.transferredAmount ?? receipt.totalAmount ?? receipt.amount ?? rawInput.amount ?? '0';
      amount = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
      currency = receipt.currency || rawInput.currency || 'ETB';
      transactionId = receipt.reference || rawInput.reference || receipt.vatReceiptNo || '';
      receiverAccount = receipt.receiverAccount || receipt.creditedAccount || null;
      receiverName = receipt.receiverName || null;
      payerName = receipt.payerName || null;
      paymentDate = receipt.paymentDate || null;
    } else if (source === 'mb-json') {
      const rawAmt = receipt.transferredAmount ?? receipt.creditAmount ?? receipt.amount ?? rawInput.amount ?? '0';
      amount = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
      currency = receipt.currency || rawInput.currency || 'ETB';
      transactionId = receipt.reference || rawInput.reference || receipt.vatReceiptNo || '';
      receiverAccount = receipt.receiverAccount || null;
      receiverName = receipt.receiverName || null;
      payerName = receipt.payerName || null;
      paymentDate = receipt.paymentDate || null;
    } else if (source === 'awash-html' || providerKey === 'awash' || providerKey === 'awashbank') {
      const tx = receipt.transaction || {};
      const rawAmt = tx.amount || receipt.amount || rawInput.amount || '0';
      const cleanNum = String(rawAmt).replace(/[^0-9.]/g, '');
      amount = parseFloat(cleanNum) || 0;
      currency = 'ETB';
      transactionId = tx.transactionId || tx.reference || receipt.reference || rawInput.reference || '';
      receiverAccount = tx.beneficiaryAccount || receipt.receiverAccount || null;
      receiverName = tx.beneficiaryName || receipt.receiverName || null;
      payerName = tx.senderName || receipt.payerName || null;
      paymentDate = tx.transactionTime || receipt.paymentDate || null;
    } else if (source === 'boa-json' || providerKey === 'boa') {
      const rawAmt = receipt.transferredAmount ?? receipt.totalAmount ?? receipt.amount ?? rawInput.amount ?? '0';
      amount = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
      currency = receipt.currency || rawInput.currency || 'ETB';
      transactionId = receipt.transactionReference || receipt.paymentReference || receipt.reference || rawInput.reference || '';
      receiverAccount = receipt.receiverAccount || null;
      receiverName = receipt.receiverName || null;
      payerName = receipt.payerName || null;
      paymentDate = receipt.transactionDate || null;
    } else if (source === 'zemen-pdf' || providerKey === 'zemen') {
      const rawAmt = receipt.settledAmount ?? receipt.totalAmountPaid ?? receipt.amount ?? rawInput.amount ?? '0';
      amount = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
      currency = receipt.currency || rawInput.currency || 'ETB';
      transactionId = receipt.reference || rawInput.reference || receipt.invoiceNo || '';
      receiverAccount = receipt.recipientAccount || null;
      receiverName = receipt.recipientName || null;
      payerName = receipt.payerName || null;
      paymentDate = receipt.date || null;
    } else {
      // Generic fallback for any other Ethiopian banking sources supported by Links.et
      const rawAmt =
        receipt.transferredAmount ??
        receipt.settledAmount ??
        receipt.amount ??
        receipt.totalAmount ??
        rawInput.amount ??
        '0';
      amount = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
      currency = receipt.currency || rawInput.currency || 'ETB';
      transactionId =
        receipt.reference ||
        rawInput.reference ||
        receipt.transactionReference ||
        receipt.receiptNo ||
        receipt.transactionId ||
        rawInput.transactionId ||
        rawInput.id ||
        '';
      receiverAccount =
        receipt.receiverAccount ||
        receipt.recipientAccount ||
        receipt.beneficiaryAccount ||
        receipt.creditedPartyAccountNo ||
        receipt.creditedAccount ||
        null;
      receiverName =
        receipt.receiverName ||
        receipt.recipientName ||
        receipt.beneficiaryName ||
        receipt.creditedPartyName ||
        null;
      payerName = receipt.payerName || receipt.senderName || null;
      paymentDate = receipt.paymentDate || receipt.date || null;
    }

    // Normalize currency (e.g. 'birr' -> 'ETB')
    if (String(currency).toUpperCase() === 'BIRR') {
      currency = 'ETB';
    } else {
      currency = String(currency).toUpperCase();
    }

    return {
      amount,
      currency,
      transactionId,
      status,
      receiverAccount,
      receiverName,
      payerName,
      paymentDate,
    };
  }

  /**
   * Verify transaction using Links.et POST /api/verify
   */
  public static async verifyViaLinksEt(params: {
    reference?: string;
    url?: string;
    paymentMethod?: string;
    waitMs?: number;
  }): Promise<{ ok: boolean; providerKey?: string; receipt?: any; error?: any; httpStatus?: number }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Links.et API key is not configured in backend environment (LINKS_ET_API_KEY).');
    }

    const { reference, url, paymentMethod, waitMs = 15000 } = params;

    let payload: Record<string, any>;
    if (url && url.startsWith('http')) {
      payload = { url, waitMs };
    } else if (reference) {
      const cleanRef = reference.trim();
      const pMethod = (paymentMethod || '').toLowerCase();

      // If telebirr or short reference: telebirr allows direct reference field
      if (pMethod.includes('telebirr') || !cleanRef.startsWith('http')) {
        payload = { reference: cleanRef, waitMs };
      } else {
        payload = { url: cleanRef, waitMs };
      }
    } else {
      throw new Error('Please provide a transaction reference or receipt URL.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), waitMs + 5000);

    try {
      const response = await fetch(`${this.BASE_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        return {
          ok: false,
          httpStatus: response.status,
          error: data?.error || { message: `Verification failed with HTTP ${response.status}` },
        };
      }

      return {
        ok: true,
        httpStatus: response.status,
        providerKey: data.providerKey,
        receipt: data.receipt,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutErr: any = new Error('The bank verification service timed out waiting for upstream bank confirmation. Please try again.');
        timeoutErr.statusCode = 504;
        timeoutErr.code = 'PROVIDER_TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Verify screenshot using Links.et POST /api/verify-image
   */
  public static async verifyScreenshotViaLinksEt(params: {
    imageBase64: string;
    waitMs?: number;
  }): Promise<{ ok: boolean; providerKey?: string; receipt?: any; error?: any; httpStatus?: number; reason?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Links.et API key is not configured in backend environment (LINKS_ET_API_KEY).');
    }

    let rawBase64 = params.imageBase64.trim();
    if (rawBase64.startsWith('data:')) {
      const commaIdx = rawBase64.indexOf(',');
      if (commaIdx !== -1) {
        rawBase64 = rawBase64.substring(commaIdx + 1);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (params.waitMs || 25000) + 5000);

    try {
      const response = await fetch(`${this.BASE_URL}/api/verify-image`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: rawBase64 }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        return {
          ok: false,
          httpStatus: response.status,
          error: data?.error || { message: `Screenshot verification failed with HTTP ${response.status}` },
        };
      }

      // Check whether upstream verification against the bank succeeded
      const upstream = data.upstream;
      if (!upstream || !upstream.attempted) {
        const reason = upstream?.reason || 'unsupported_screenshot';
        let humanReason = 'Could not verify payment upstream from the screenshot alone.';
        if (reason === 'provider_needs_full_url') {
          humanReason = 'This bank receipt requires the full receipt URL or reference code to verify upstream. Please enter the transaction reference or URL.';
        } else if (reason === 'no_reference') {
          humanReason = 'No clear transaction reference number was legible on this receipt image. Please enter your transaction reference number.';
        } else if (reason === 'unsupported_provider') {
          humanReason = 'The screenshot does not match a supported Ethiopian bank receipt format. Please enter your transaction reference number.';
        }

        return {
          ok: false,
          httpStatus: 422,
          reason,
          error: { message: humanReason, code: reason },
        };
      }

      if (!upstream.result?.ok || !upstream.result?.receipt) {
        return {
          ok: false,
          httpStatus: 400,
          error: upstream.result?.error || { message: 'Bank upstream verification failed for this receipt.' },
        };
      }

      return {
        ok: true,
        providerKey: upstream.result.providerKey || data.detected?.provider,
        receipt: upstream.result.receipt,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutErr: any = new Error('Screenshot verification timed out. Please try entering the transaction reference directly.');
        timeoutErr.statusCode = 504;
        timeoutErr.code = 'PROVIDER_TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Complete payment verification against authoritative event ticket price and receiving accounts
   */
  public static async verifyPayment(params: {
    event: {
      id: string;
      title: string;
      ticketPrice: number;
      currency?: string;
      paymentMethods?: PaymentDestination[];
    };
    paymentReference?: string;
    paymentMethod?: string;
    screenshotUrl?: string;
    screenshotBase64?: string;
  }): Promise<VerifyPaymentResult> {
    const { event, paymentReference, paymentMethod, screenshotBase64 } = params;

    const expectedAmount = Number(event.ticketPrice);
    if (isNaN(expectedAmount) || expectedAmount <= 0) {
      throw new Error('Event does not have a valid ticket price.');
    }

    // Step 1: Execute verification with Links.et
    let verifyResponse: { ok: boolean; providerKey?: string; receipt?: any; error?: any; httpStatus?: number; reason?: string };

    if (paymentReference && paymentReference.trim().length > 0) {
      verifyResponse = await this.verifyViaLinksEt({
        reference: paymentReference.trim(),
        paymentMethod,
      });
    } else if (screenshotBase64 && screenshotBase64.trim().length > 0) {
      verifyResponse = await this.verifyScreenshotViaLinksEt({
        imageBase64: screenshotBase64,
      });
    } else {
      const err: any = new Error('Please provide either a valid transaction reference or a verifiable receipt screenshot.');
      err.statusCode = 400;
      err.code = 'PAYMENT_EVIDENCE_REQUIRED';
      throw err;
    }

    if (!verifyResponse.ok || !verifyResponse.receipt) {
      const errMsg =
        verifyResponse.error?.message ||
        verifyResponse.error?.code ||
        'Payment could not be verified with the issuing bank or wallet.';
      const err: any = new Error(errMsg);
      err.statusCode = verifyResponse.httpStatus === 422 ? 422 : 400;
      err.code = verifyResponse.reason || 'PAYMENT_VERIFICATION_FAILED';
      throw err;
    }

    // Step 2: Normalize receipt data
    const details = this.extractReceiptDetails(verifyResponse.receipt, verifyResponse.providerKey);

    // Step 3: Validate status
    const validStatuses = ['COMPLETED', 'SUCCESS', 'SETTLED', 'PAID', 'TRANSFERRED'];
    if (!validStatuses.includes(details.status)) {
      const err: any = new Error(`Transaction is not completed (current status: ${details.status}). Only completed payments qualify for registration.`);
      err.statusCode = 400;
      err.code = 'TRANSACTION_NOT_COMPLETED';
      throw err;
    }

    // Step 4: Validate authoritative ticket price amount (reject underpayment!)
    if (details.amount < expectedAmount) {
      const err: any = new Error(
        `Underpayment detected: Insufficient payment amount. The ticket price is ${expectedAmount} ETB, but the verified transaction was only for ${details.amount} ETB.`
      );
      err.statusCode = 422;
      err.code = 'INSUFFICIENT_AMOUNT';
      throw err;
    }

    // Step 5: Validate currency
    const normalizedCurrency = details.currency.toUpperCase();
    if (normalizedCurrency !== 'ETB' && normalizedCurrency !== 'BIRR') {
      const err: any = new Error(`Currency mismatch: Invalid transaction currency ${details.currency}. Expected Ethiopian Birr (ETB).`);
      err.statusCode = 422;
      err.code = 'INVALID_CURRENCY';
      throw err;
    }

    // Step 6: Validate recipient account if available and configured
    const resolvedTxId = details.transactionId || paymentReference || '';
    if (!resolvedTxId) {
      const err: any = new Error('Could not resolve authoritative transaction ID from the provider receipt.');
      err.statusCode = 400;
      err.code = 'MISSING_TRANSACTION_ID';
      throw err;
    }

    const configuredDestinations = event.paymentMethods || [];
    if (configuredDestinations.length > 0 && details.receiverAccount) {
      const cleanReceiver = details.receiverAccount.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
      
      const isAccountMatched = configuredDestinations.some((dest) => {
        const cleanDest = (dest.accountNumber || '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
        if (!cleanDest) return false;
        // If unmasked exact match
        if (cleanReceiver === cleanDest) return true;
        // If masked (e.g. 1****0000 or 251********), check if unmasked prefix/suffix match
        if (cleanReceiver.includes('*')) {
          const parts = cleanReceiver.split('*').filter(Boolean);
          if (parts.length > 0) {
            return parts.every((p) => cleanDest.includes(p));
          }
        }
        return false;
      });

      if (!isAccountMatched) {
        // If receiver is explicitly present and clearly doesn't match any configured account
        const isReceiverMaskedCompletely = /^[*]+$/.test(cleanReceiver);
        if (!isReceiverMaskedCompletely) {
          const err: any = new Error(
            `Recipient mismatch: Transaction was sent to an unauthorized recipient account (${details.receiverAccount}) which does not match any configured organizer destination.`
          );
          err.statusCode = 422;
          err.code = 'RECIPIENT_MISMATCH';
          throw err;
        }
      }
    }

    // Step 7: Prevent duplicate transaction reuse across Sheeba registrations
    const existingPayment = await query(
      'SELECT id, event_id FROM payments WHERE transaction_id = $1 LIMIT 1',
      [resolvedTxId]
    );

    if (existingPayment.rowCount && existingPayment.rowCount > 0) {
      const err: any = new Error(
        `Transaction ${resolvedTxId} has already been used for an existing ticket registration. Transactions cannot be reused.`
      );
      err.statusCode = 409;
      err.code = 'TRANSACTION_ALREADY_USED';
      throw err;
    }

    const existingReg = await query(
      'SELECT id FROM registrations WHERE payment_reference = $1 LIMIT 1',
      [resolvedTxId]
    );

    if (existingReg.rowCount && existingReg.rowCount > 0) {
      const err: any = new Error(
        `Transaction ${resolvedTxId} has already been registered in the system. Duplicate submissions are not allowed.`
      );
      err.statusCode = 409;
      err.code = 'TRANSACTION_ALREADY_USED';
      throw err;
    }

    return {
      verified: true,
      transactionId: resolvedTxId,
      amount: details.amount,
      currency: details.currency,
      provider: verifyResponse.providerKey || paymentMethod || 'bank',
      receiverAccount: details.receiverAccount,
      receiverName: details.receiverName,
      payerName: details.payerName,
      paymentDate: details.paymentDate,
      rawReceipt: verifyResponse.receipt,
    };
  }
}
