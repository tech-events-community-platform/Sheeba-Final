/**
 * Sheeba Phone Number Utility
 * Standard: Exactly 10 digits starting with 0 (e.g., 0912345678, 0712345678)
 */

/**
 * Formats user input in real-time:
 * - Strips all non-digit characters
 * - Converts leading Ethiopian country code (251) to leading 0
 * - Automatically ensures first digit is '0'
 * - Restricts length to a maximum of 10 digits
 */
export const formatPhoneInput = (input: string): string => {
  if (!input) return '';

  let digits = input.replace(/\D/g, '');
  if (!digits) return '';

  // If user pasted/typed +251... convert 2519... to 09...
  if (digits.startsWith('251') && digits.length > 3) {
    digits = '0' + digits.slice(3);
  }

  // Ensure first digit is always '0'
  if (!digits.startsWith('0')) {
    digits = '0' + digits;
  }

  // Cap at 10 digits
  return digits.slice(0, 10);
};

/**
 * Validates whether the given phone string conforms to the 10-digit rule starting with 0.
 */
export const isValidPhoneNumber = (phone?: string | null): boolean => {
  if (!phone) return false;
  return /^0\d{9}$/.test(phone.trim());
};

export const PHONE_NUMBER_PLACEHOLDER = '0912345678';
export const PHONE_NUMBER_HINT = '10 digits starting with 0 (e.g. 0912345678)';
export const PHONE_NUMBER_REGEX = /^0\d{9}$/;

