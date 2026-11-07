import { Router } from 'express';
import { SponsorshipController } from '../controllers/sponsorship.controller';
import { MatchingController } from '../controllers/matching.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware';
import { idParamSchema } from '../schemas/common.schema';
import {
  createApplicationSchema,
  exploreApplicationsQuerySchema,
  createDealSchema,
  submitSponsorshipApplicationSchema,
  sponsorDealsQuerySchema,
  updateDealSchema,
  saveDeliverableSchema,
} from '../schemas/sponsorship.schema';
import {
  updateSponsorPreferencesSchema,
  sponsorRecommendationsQuerySchema,
} from '../schemas/matching.schema';

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

// Stage 2: Organizer retrieves approved sponsors for their pitch
router.get(
  ['/organizer/pitches/:id/approved-sponsors', '/organizer/pitches/approved-sponsors'],
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  SponsorshipController.getApprovedSponsorsForPitch
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

// Stage 2: Sponsor submits formal application
router.post(
  '/applications/submit',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateBody(submitSponsorshipApplicationSchema),
  SponsorshipController.submitFormalApplication
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

// AI-Powered Sponsor-Event Matching & Recommendations
router.get(
  ['/recommendations', '/matching/recommendations'],
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateQuery(sponsorRecommendationsQuerySchema),
  MatchingController.getRecommendations
);

router.get(
  ['/preferences', '/matching/preferences'],
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  MatchingController.getPreferences
);

router.put(
  ['/preferences', '/matching/preferences'],
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateBody(updateSponsorPreferencesSchema),
  MatchingController.updatePreferences
);


// Deliverables Routes (Stage 4)
router.get(
  '/sponsor/deliverables',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  SponsorshipController.getMyDeliverables
);

router.post(
  '/sponsor/deliverables',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateBody(saveDeliverableSchema),
  SponsorshipController.saveDeliverable
);

router.get(
  ['/deals/:dealId/deliverables', '/deals/:id/deliverables'],
  authenticate,
  authorizeRoles('sponsor', 'organizer', 'admin'),
  SponsorshipController.getDealDeliverable
);

router.delete(
  ['/sponsor/deliverables/:id', '/sponsor/deliverables'],
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  SponsorshipController.deleteDeliverable
);

export default router;
