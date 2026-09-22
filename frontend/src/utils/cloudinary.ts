/**
 * Cloudinary Direct Upload Utility for Sheeba Event Management
 * Supports unsigned uploads directly from client to Cloudinary.
 */

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

export const getCloudinaryConfig = (): CloudinaryConfig => {
  const cloudName =
    (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ||
    localStorage.getItem('sheba_cloudinary_cloud_name')?.trim() ||
    '';

  const uploadPreset =
    (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim() ||
    localStorage.getItem('sheba_cloudinary_upload_preset')?.trim() ||
    '';

  return { cloudName, uploadPreset };
};

export const saveCloudinaryConfig = (cloudName: string, uploadPreset: string): void => {
  if (cloudName.trim()) {
    localStorage.setItem('sheba_cloudinary_cloud_name', cloudName.trim());
  }
  if (uploadPreset.trim()) {
    localStorage.setItem('sheba_cloudinary_upload_preset', uploadPreset.trim());
  }
};

export interface CloudinaryUploadResponse {
  asset_id: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  type: string;
  url: string;
  secure_url: string;
}

/**
 * Uploads an image file from the user's PC directly to Cloudinary.
 * @param file The file object from <input type="file" />
 * @param customConfig Optional config override
 * @returns The secure HTTPS URL of the uploaded image
 */
export const uploadToCloudinary = async (
  file: File,
  customConfig?: Partial<CloudinaryConfig>
): Promise<string> => {
  const config = getCloudinaryConfig();
  const cloudName = customConfig?.cloudName || config.cloudName;
  const uploadPreset = customConfig?.uploadPreset || config.uploadPreset;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'MISSING_CLOUDINARY_CONFIG: Cloudinary cloud name or unsigned upload preset is not set.'
    );
  }

  // Validate file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (PNG, JPG, WEBP, or SVG).');
  }

  // Validate size (max 10MB)
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Image size exceeds 10MB limit. Please choose a smaller image.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'sheeba_event_posters');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
  } catch (netErr: any) {
    throw new Error('Network error while reaching Cloudinary. Please check your internet connection.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.error?.message ||
      `Cloudinary upload failed with status ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  if (!data?.secure_url) {
    throw new Error('Cloudinary did not return a valid secure image URL.');
  }

  return data.secure_url;
};
