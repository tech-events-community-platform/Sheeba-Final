import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateParams } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';
import { eventIdOrTokenParamSchema } from '../schemas/ticket.schema';

const router = Router();

router.get('/', authenticate, TicketController.getMyTickets);
router.get('/:eventId', authenticate, validateParams(eventIdOrTokenParamSchema), TicketController.getTicket);
router.get('/id/:id', authenticate, validateParams(idParamSchema), TicketController.getTicketById);

export default router;
