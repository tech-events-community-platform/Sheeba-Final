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
  sponsorDealsQuerySchema,
  updateDealSchema,
  saveSponsorQuestionnaireSchema,
  recordAttendeeResponseSchema,
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

// Phase 1: Organizer My Sponsors Management
router.get(
  '/organizer/my-sponsors',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  SponsorshipController.getOrganizerMySponsors
);

// Phase 1: Sponsor Profile Lookup
router.get(
  '/sponsor-profile/:sponsorId',
  authenticate,
  SponsorshipController.getSponsorProfile
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

// Phase 1: Organizer Deal Actions (Accept and Reject)
router.patch(
  '/deals/:id/accept',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  SponsorshipController.acceptDeal
);

router.patch(
  '/deals/:id/reject',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  SponsorshipController.rejectDeal
);

// Phase 1: Sponsor Withdraw Action
router.patch(
  '/deals/:id/withdraw',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateParams(idParamSchema),
  SponsorshipController.withdrawDeal
);

// Phase 2: Organizer Controls Attendee-Information Sharing (Enable or Revoke)
router.patch(
  '/deals/:id/sharing',
  authenticate,
  authorizeRoles('organizer', 'admin'),
  validateParams(idParamSchema),
  SponsorshipController.toggleAttendeeSharing
);

// Phase 2: Sponsor My Events Pipeline
router.get(
  '/sponsor/my-events',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  SponsorshipController.getSponsorMyEvents
);

// Phase 2: Sponsor Checked-In Attendees (Strictly Gated by Accepted Deal + Active Sharing)
router.get(
  '/sponsor/events/:id/attendees',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateParams(idParamSchema),
  SponsorshipController.getSponsorCheckedInAttendees
);

// Phase 3: Sponsor Questionnaire Management
router.get(
  '/deals/:id/questionnaire',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateParams(idParamSchema),
  SponsorshipController.getSponsorQuestionnaire
);

router.put(
  '/deals/:id/questionnaire',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateParams(idParamSchema),
  validateBody(saveSponsorQuestionnaireSchema),
  SponsorshipController.saveSponsorQuestionnaire
);

// Phase 3: In-Person Attendee Response Recording
router.get(
  '/deals/:id/attendees/:attendeeId/response',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateParams(idParamSchema),
  SponsorshipController.getAttendeeResponse
);

router.post(
  '/deals/:id/attendees/:attendeeId/record',
  authenticate,
  authorizeRoles('sponsor', 'admin'),
  validateParams(idParamSchema),
  validateBody(recordAttendeeResponseSchema),
  SponsorshipController.recordAttendeeResponse
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

export default router;
