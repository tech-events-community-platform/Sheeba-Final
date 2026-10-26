import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/image', optionalAuthenticate, UploadController.uploadImage);
router.post('/', optionalAuthenticate, UploadController.uploadImage);

export default router;
