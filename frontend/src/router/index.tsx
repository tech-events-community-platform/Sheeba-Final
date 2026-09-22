import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts & Guard
import { PublicLayout } from '../layouts/PublicLayout';
import { AttendeeLayout } from '../layouts/AttendeeLayout';
import { OrganizerLayout } from '../layouts/OrganizerLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { PendingApprovalPage } from '../pages/public/PendingApprovalPage';
import { PublicRegisterPage } from '../pages/public/PublicRegisterPage';
import { EventRegistrationCheckoutPage } from '../pages/public/EventRegistrationCheckoutPage';
import { PublicProfilePage } from '../pages/public/PublicProfilePage';
import { BadgeDetailPage } from '../pages/public/BadgeDetailPage';
import { PublicSearchPage } from '../pages/public/PublicSearchPage';
import { VerifyTicketPage } from '../pages/public/VerifyTicketPage';

// Sponsor Pages & Layout
import { SponsorLayout } from '../layouts/SponsorLayout';
import { SponsorAuthPage } from '../pages/sponsor/SponsorAuthPage';
import { SponsorForgotPasswordPage } from '../pages/sponsor/SponsorForgotPasswordPage';
import { SponsorDashboardPage } from '../pages/sponsor/SponsorDashboardPage';
import { SponsorExplorePage } from '../pages/sponsor/SponsorExplorePage';
import { SponsorDealsPage } from '../pages/sponsor/SponsorDealsPage';
import { SponsorDeliverablesPage } from '../pages/sponsor/SponsorDeliverablesPage';
import { SponsorApplicationDetailPage } from '../pages/sponsor/SponsorApplicationDetailPage';

// Attendee Pages
import { BadgesPage as AttendeeBadgesPage } from '../pages/attendee/BadgesPage';
import { AttendeeDashboardPage } from '../pages/attendee/DashboardPage';
import { RecordPage } from '../pages/attendee/RecordPage';
import { MyEventsPage } from '../pages/attendee/MyEventsPage';
import { TicketPage } from '../pages/attendee/TicketPage';
import { ProfilePage } from '../pages/attendee/ProfilePage';
import { AttendanceHistoryPage } from '../pages/attendee/AttendanceHistoryPage';
import { AccountSettingsPage } from '../pages/attendee/AccountSettingsPage';
import { AttendeeSettingsPage } from '../pages/attendee/AttendeeSettingsPage';

// Organizer Pages (Section 1: 6 Tabs)
import { OrganizerDashboardPage } from '../pages/organizer/OrganizerDashboardPage';
import { CreateEventPage } from '../pages/organizer/CreateEventPage';
import { EventDetailPage } from '../pages/organizer/EventDetailPage';
import { CheckInPage } from '../pages/organizer/CheckInPage';
import { BadgesPage as OrganizerBadgesPage } from '../pages/organizer/BadgesPage';
import { ReportPage } from '../pages/organizer/ReportPage';
import { EventListPage } from '../pages/organizer/EventListPage';
import { ApplyToSponsorsPage } from '../pages/organizer/ApplyToSponsorsPage';

import { ScannerPage } from '../pages/organizer/ScannerPage';

// Admin Pages
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminEventsPage } from '../pages/admin/AdminEventsPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';

export const router = createBrowserRouter([
  // Public Routes (SRS Section 18)
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <LoginPage /> },
      { path: 'pending-approval', element: <PendingApprovalPage /> },
      { path: 'contact', element: <LoginPage /> },
      { path: 'search', element: <PublicSearchPage /> },
      { path: 'e/:token', element: <PublicRegisterPage /> },
      { path: 'e/:token/register', element: <EventRegistrationCheckoutPage /> },
      { path: 'events/:id/register', element: <PublicRegisterPage /> },
      { path: 'events/:id/register/form', element: <EventRegistrationCheckoutPage /> },
      { path: 'profile/:id', element: <PublicProfilePage /> },
      { path: 'badge/:id', element: <BadgeDetailPage /> },
      { path: 'verify-ticket', element: <VerifyTicketPage /> },
      { path: 'verify/:token', element: <VerifyTicketPage /> },
      { path: 'tickets/verify/:token', element: <VerifyTicketPage /> },
      { path: 'sponsor/auth', element: <SponsorAuthPage /> },
      { path: 'sponsor/forgot-password', element: <SponsorForgotPasswordPage /> },
    ],
  },
  // Protected Attendee Routes (/app)
  {
    path: '/app',
    element: <ProtectedRoute allowedRoles={['ATTENDEE']} />,
    children: [
      {
        element: <AttendeeLayout />,
        children: [
          { index: true, element: <AttendeeBadgesPage /> },
          { path: 'badges', element: <AttendeeBadgesPage /> },
          { path: 'events', element: <MyEventsPage /> },
          { path: 'registrations', element: <MyEventsPage /> },
          { path: 'ticket/:eventId', element: <TicketPage /> },
          { path: 'settings', element: <AttendeeSettingsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'profile/attendance', element: <AttendanceHistoryPage /> },
          { path: 'record', element: <RecordPage /> },
          { path: 'dashboard', element: <AttendeeDashboardPage /> },
        ],
      },
    ],
  },
  // Protected Organizer Routes (/organizer - Section 1: 6 core tabs)
  {
    path: '/organizer',
    element: <ProtectedRoute allowedRoles={['ORGANIZER']} />,
    children: [
      {
        element: <OrganizerLayout />,
        children: [
          { index: true, element: <OrganizerDashboardPage /> },
          { path: 'events/create', element: <CreateEventPage /> },
          { path: 'events/:id', element: <EventDetailPage /> },
          { path: 'events', element: <EventListPage /> },
          { path: 'events/:id/scanner', element: <ScannerPage /> },
          { path: 'scanner/:id', element: <ScannerPage /> },
          { path: 'scanner', element: <ScannerPage /> },
          { path: 'events/:id/attendees', element: <OrganizerBadgesPage /> },
          { path: 'events/:id/report', element: <ReportPage /> },
          { path: 'check-in', element: <CheckInPage /> },
          { path: 'check-in/:id', element: <CheckInPage /> },
          { path: 'badges', element: <OrganizerBadgesPage /> },
          { path: 'badges/:id', element: <OrganizerBadgesPage /> },
          { path: 'reports', element: <ReportPage /> },
          { path: 'reports/:id', element: <ReportPage /> },
          { path: 'apply-sponsors', element: <ApplyToSponsorsPage /> },
          { path: 'settings', element: <AccountSettingsPage /> },
        ],
      },
    ],
  },
  // Protected Admin Routes (/admin)
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['ADMIN']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'events', element: <AdminEventsPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'organizers', element: <AdminUsersPage /> },
          { path: 'reports', element: <AdminDashboardPage /> },
          { path: 'profile', element: <AccountSettingsPage /> },
        ],
      },
    ],
  },
  // Protected Sponsor Routes (/sponsor - 4 dedicated tabs: Explore, Deals & Pledges, Brand Deliverables and Contact, Settings)
  {
    path: '/sponsor',
    element: <ProtectedRoute allowedRoles={['SPONSOR']} />,
    children: [
      {
        element: <SponsorLayout />,
        children: [
          { index: true, element: <SponsorExplorePage /> },
          { path: 'explore', element: <SponsorExplorePage /> },
          { path: 'explore/:id', element: <SponsorApplicationDetailPage /> },
          { path: 'applications/:id', element: <SponsorApplicationDetailPage /> },
          { path: 'deals', element: <SponsorDealsPage /> },
          { path: 'deliverables', element: <SponsorDeliverablesPage /> },
          { path: 'settings', element: <AccountSettingsPage /> },
          { path: 'dashboard', element: <Navigate to="/sponsor" replace /> },
        ],
      },
    ],
  },
  // Fallback redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
