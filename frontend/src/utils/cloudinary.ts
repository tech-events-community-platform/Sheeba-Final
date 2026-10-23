import { requestApi } from '../services/api';

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

export const getCloudinaryConfig = (): CloudinaryConfig => {
  return { cloudName: 'backend', uploadPreset: 'backend' };
};

export const saveCloudinaryConfig = (_cloudName: string, _uploadPreset: string): void => {
  // No-op: Uploads are managed securely by the backend
};

/**
 * Converts a file to base64 Data URL.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads an image file from the user's PC to Cloudinary via backend server endpoint.
 * Zero local storage, zero client config needed!
 * @param file The file object from <input type="file" />
 * @returns The secure HTTPS Cloudinary URL of the uploaded image
 */
export const uploadToCloudinary = async (
  file: File,
  options?: { allowPdf?: boolean; folder?: string }
): Promise<string> => {
  const allowPdf = options?.allowPdf ?? false;
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  if (!isImage && (!allowPdf || !isPdf)) {
    throw new Error(
      allowPdf
        ? 'Please select a valid image file (PNG, JPG, WEBP) or PDF document.'
        : 'Please select a valid image file (PNG, JPG, WEBP, or SVG).'
    );
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('File size exceeds 10MB limit. Please choose a smaller file.');
  }

  const dataUrl = await fileToDataUrl(file);

  const response = await requestApi<{ success: boolean; data?: { url: string; secureUrl: string }; error?: string }>('/upload/image', {
    method: 'POST',
    body: JSON.stringify({ file: dataUrl, folder: options?.folder || 'sheeba_event_posters' }),
  });

  if (!response || !response.data?.secureUrl) {
    throw new Error(response?.error || 'Backend failed to upload file to Cloudinary.');
  }

  return response.data.secureUrl;
};
