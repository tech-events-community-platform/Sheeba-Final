import { Router } from 'express';
import { SponsorshipController } from '../controllers/sponsorship.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';
import {
  createApplicationSchema,
  exploreApplicationsQuerySchema,
  createDealSchema,
  sponsorDealsQuerySchema,
  updateDealSchema,
} from '../schemas/sponsorship.schema';

const router = Router();

// Organizer Routes
router.post(
  '/applications',
  authenticate,
  validateBody(createApplicationSchema),
  SponsorshipController.createApplication
);

router.get(
  '/organizer/my-applications',
  authenticate,
  SponsorshipController.getMyApplications
);

router.delete(
  ['/applications/:id', '/applications'],
  authenticate,
  validateParams(idParamSchema),
  SponsorshipController.deleteApplication
);

// Sponsor Marketplace Routes
router.get(
  '/explore',
  optionalAuthenticate,
  validateQuery(exploreApplicationsQuerySchema),
  SponsorshipController.exploreApplications
);

router.get(
  ['/applications/:id', '/applications'],
  optionalAuthenticate,
  validateParams(idParamSchema),
  SponsorshipController.getApplication
);

// Sponsor Deals Pipeline
router.post(
  '/deals',
  authenticate,
  validateBody(createDealSchema),
  SponsorshipController.expressInterestOrDecline
);

router.get(
  '/sponsor/my-deals',
  authenticate,
  validateQuery(sponsorDealsQuerySchema),
  SponsorshipController.getMyDeals
);

router.patch(
  ['/deals/:id', '/deals'],
  authenticate,
  validateParams(idParamSchema),
  validateBody(updateDealSchema),
  SponsorshipController.updateDeal
);

export default router;
