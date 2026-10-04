import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { validateQuery } from '../middlewares/validate.middleware';
import { searchQuerySchema } from '../schemas/search.schema';

const router = Router();

router.get('/', validateQuery(searchQuerySchema), SearchController.search);

export default router;
