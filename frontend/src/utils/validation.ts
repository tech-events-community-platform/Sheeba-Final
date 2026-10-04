import { z, ZodError, ZodType } from 'zod';

/**
 * Converts a ZodError into a flat map of field-path -> error message.
 * e.g. { "email": "Please provide a valid email.", "address.city": "City is required." }
 */
export const formatZodErrors = (error: ZodError): Record<string, string> => {
  const formatted: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!formatted[key]) {
      formatted[key] = issue.message;
    }
  }

  return formatted;
};

/**
 * Returns the first human-readable error message from a ZodError.
 */
export const getFirstErrorMessage = (error: ZodError, fallback = 'Invalid form data.'): string => {
  return error.issues[0]?.message || fallback;
};

export type FormValidationResult<T> =
  | {
      success: true;
      data: T;
      errors: Record<string, string>;
      error: null;
    }
  | {
      success: false;
      data: null;
      errors: Record<string, string>;
      error: string;
    };

/**
 * Synchronously validates form or user input data against a Zod schema.
 * Returns a typed result containing field-level errors and the primary error message.
 */
export const validateForm = <T>(schema: ZodType<T>, data: unknown): FormValidationResult<T> => {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: {},
      error: null,
    };
  }

  const errors = formatZodErrors(result.error);
  const error = getFirstErrorMessage(result.error);

  return {
    success: false,
    data: null,
    errors,
    error,
  };
};

/**
 * Asynchronously validates form or user input data against a Zod schema.
 */
export const validateFormAsync = async <T>(
  schema: ZodType<T>,
  data: unknown
): Promise<FormValidationResult<T>> => {
  const result = await schema.safeParseAsync(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: {},
      error: null,
    };
  }

  const errors = formatZodErrors(result.error);
  const error = getFirstErrorMessage(result.error);

  return {
    success: false,
    data: null,
    errors,
    error,
  };
};

/**
 * Validates a single field value against a specific field schema.
 * Useful for inline onBlur/onChange validation in forms.
 */
export const validateField = (schema: ZodType<any>, value: unknown): string | null => {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return getFirstErrorMessage(result.error, 'Invalid value.');
};
