import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';

const router = Router();

router.post('/image', UploadController.uploadImage);
router.post('/', UploadController.uploadImage);

export default router;
