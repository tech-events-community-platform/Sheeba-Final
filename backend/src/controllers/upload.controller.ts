import { Request, Response, NextFunction } from 'express';
import { CloudinaryService } from '../services/cloudinary.service';

export class UploadController {
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { file, image, folder } = req.body;
      const fileData = file || image;

      if (!fileData) {
        return res.status(400).json({
          success: false,
          error: 'Please provide an image file or base64 data to upload.',
        });
      }

      const secureUrl = await CloudinaryService.uploadImage(fileData, folder || 'sheeba_event_posters');

      return res.status(200).json({
        success: true,
        data: {
          url: secureUrl,
          secureUrl,
        },
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: err.message || 'Image upload failed.',
      });
    }
  }
}
