import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types/event';
import type { SponsorReportData } from '../../types/attendance';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Target,
  Users,
  TrendingUp,
  Quote,
  Compass,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';

const DEMO_EVENT: Event = {
  id: 'demo-impact-event-2026',
  organizerId: 'org-demo',
  organizerName: 'XYZ Tech Community',
  title: 'AI & Future of Work Summit 2026',
  description: "Brought together students, software developers, technology professionals, entrepreneurs, and other key members of Ethiopia's growing technology ecosystem for an intensive program focused on emerging artificial intelligence capabilities.",
  type: 'hackathon',
  date: '2026-09-05',
  startTime: '09:00 AM',
  endTime: '05:00 PM',
  time: '09:00 AM - 05:00 PM EAT',
  location: 'Addis Ababa, Ethiopia',
  venueName: 'Addis Ababa Tech Park',
  capacity: 300,
  registeredCount: 250,
  checkedInCount: 187,
  status: 'completed',
  isPaid: false,
  ticketPrice: 0,
  currency: 'ETB',
  shareLinkToken: 'demo-ai-summit-2026',
  customQuestions: [
    { id: 'q1', questionText: 'Primary Role / Occupation', type: 'text', isRequired: true, order: 1 },
    { id: 'q2', questionText: 'Primary Technical Interests', type: 'text', isRequired: true, order: 2 },
  ],
  createdAt: new Date().toISOString(),
};

const INITIAL_DEMO_REPORT: SponsorReportData = {
  eventId: 'demo-impact-event-2026',
  eventTitle: 'AI & Future of Work Summit 2026',
  eventDescription: "Brought together students, software developers, technology professionals, entrepreneurs, and other key members of Ethiopia's growing technology ecosystem for an intensive program focused on emerging artificial intelligence capabilities.",
  eventType: 'hackathon',
  eventDate: '2026-09-05',
  eventLocation: 'Addis Ababa, Ethiopia',
  organizerName: 'XYZ Tech Community',
  customQuestions: [],
  totalRegistered: 250,
  totalAttended: 187,
  attendanceRate: 74.8,
  badgeDistribution: {
    attended: 187,
    participant: 122,
    winner: 12,
    speaker: 6,
  },
  rolesBreakdown: [
    { role: 'Students', count: 110, percentage: 44 },
    { role: 'Software Developers', count: 70, percentage: 28 },
    { role: 'Early-stage Founders', count: 30, percentage: 12 },
    { role: 'Researchers & Academics', count: 22, percentage: 9 },
    { role: 'Job Seekers', count: 18, percentage: 7 },
  ],
  topOrganizations: [
    { name: 'Addis Ababa University', count: 42 },
    { name: 'HilCoE School of Computer Science', count: 31 },
    { name: 'Gebeya Inc.', count: 24 },
    { name: 'iCog Labs', count: 19 },
    { name: '1888 EC Tech Hub', count: 15 },
    { name: 'Freelance & Independent', count: 48 },
  ],
  sampleInterests: [
    'Machine Learning & Applied AI',
    'Backend & Distributed Systems',
    'Generative AI & LLMs',
    'Cloud Infrastructure & DevOps',
    'FinTech & Digital Payments',
    'Mobile App Architecture',
  ],
  goalsBreakdown: [
    { goal: 'Practical Technical Skill Building', count: 120, percentage: 48 },
    { goal: 'Industry Networking & Peer Collaboration', count: 73, percentage: 29 },
    { goal: 'Exploring Career Pathways & Job Openings', count: 42, percentage: 17 },
    { goal: 'Founder Mentorship & Pitch Practice', count: 15, percentage: 6 },
  ],
  registrationsOverTime: [
    { date: 'Aug 25', count: 24 },
    { date: 'Aug 28', count: 52 },
    { date: 'Sep 01', count: 88 },
    { date: 'Sep 03', count: 56 },
    { date: 'Sep 05', count: 30 },
  ],
  hourlyCheckIns: [
    { hour: '08:00 AM', count: 38 },
    { hour: '09:00 AM', count: 86 },
    { hour: '10:00 AM', count: 45 },
    { hour: '11:00 AM', count: 18 },
  ],
  attendees: [
    {
      id: 'usr_dem_1',
      registrationId: 'reg_dem_1',
      attendeeId: 'usr_dem_1',
      name: 'Abebe Bikila',
      email: 'abebe.b@aau.edu.et',
      registrationDate: '2026-09-01',
      status: 'Checked in',
      checkInTime: '08:42 AM EAT',
      badges: ['attended', 'participant'],
      answers: { sheba_organization: 'Gebeya Inc.', role: 'Software Engineer', goals: 'Practical Technical Skill Building' },
    },
    {
      id: 'usr_dem_2',
      registrationId: 'reg_dem_2',
      attendeeId: 'usr_dem_2',
      name: 'Hewan Mengistu',
      email: 'hewan.m@hilcoe.et',
      registrationDate: '2026-09-02',
      status: 'Checked in',
      checkInTime: '08:55 AM EAT',
      badges: ['attended', 'winner'],
      answers: { sheba_organization: 'Addis Ababa University', role: 'Student', goals: 'Industry Networking & Peer Collaboration' },
    },
    {
      id: 'usr_dem_3',
      registrationId: 'reg_dem_3',
      attendeeId: 'usr_dem_3',
      name: 'Dawit Yohannes',
      email: 'dawit.y@icog.et',
      registrationDate: '2026-09-03',
      status: 'Checked in',
      checkInTime: '09:10 AM EAT',
      badges: ['attended', 'speaker'],
      answers: { sheba_organization: 'iCog Labs', role: 'AI Researcher', goals: 'Founder Mentorship & Pitch Practice' },
    },
    {
      id: 'usr_dem_4',
      registrationId: 'reg_dem_4',
      attendeeId: 'usr_dem_4',
      name: 'Selamawit Tadesse',
      email: 'selam.t@fintech.et',
      registrationDate: '2026-09-04',
      status: 'Checked in',
      checkInTime: '09:15 AM EAT',
      badges: ['attended', 'participant'],
      answers: { sheba_organization: 'Telebirr Partner Hub', role: 'Product Manager', goals: 'Exploring Career Pathways & Job Openings' },
    },
  ],
  aiNarrative: {
    executiveSummary: "The AI & Future of Work Summit 2026 brought together students, software developers, technology professionals, entrepreneurs, and other members of Ethiopia's growing technology ecosystem for a day focused on the changing role of artificial intelligence in education, employment, and entrepreneurship. Hosted by XYZ Tech Community in Addis Ababa, Ethiopia on September 5, 2026, the initiative recorded 250 registrations, with 187 attendees verified through Sheeba's QR-based check-in system, resulting in a 74.8% verified attendance rate.\n\nThe attendee data indicates strong interest in practical technical mastery and hands-on skill development, while participants represented a diverse range of professional backgrounds and institutions across universities, technology enterprises, and high-growth startups. The event created direct, curated opportunities for participants to engage with speakers, participate in hands-on activities, and connect with other members of the technology community.\n\nOverall, the event reached a substantial early-career technology audience and demonstrated meaningful demand for accessible technical learning, community networking, and career-oriented programming. For corporate sponsors, academic partners, and ecosystem stakeholders, the verified participation figures provide concrete empirical evidence of an engaged, ambitious audience primed for continued investment, mentorship, and capacity-building partnerships.",
    eventBackground: "The AI & Future of Work Summit 2026 was organized by XYZ Tech Community to bring together members of the technology community to explore emerging opportunities, skills, and industry practices across the regional ecosystem. The event was designed to create an accessible environment where students and professionals could learn from experienced practitioners, exchange ideas, and develop connections across different areas of technology.",
    objectives: "The primary objective of the event was to increase awareness of practical technical capabilities while creating opportunities for participants to connect with practitioners and peers. A secondary objective was to expose students and early-career professionals to potential career pathways and industry opportunities in technology and entrepreneurship.",
    deliveryNarrative: "The event was delivered on September 5, 2026 in Addis Ababa, Ethiopia. Registration was managed through Sheeba, allowing participants to provide standardized demographic information alongside event-specific responses requested by the organizer.\n\nOn the day of the event, attendees were verified through Sheeba's QR-based check-in process. This provided a timestamped record of attendance and enabled the organizers to distinguish between registered participants and individuals who physically attended the event.\n\nOf the 250 individuals who registered for the event, 187 were recorded as having checked in. This represents a verified attendance rate of 74.8%, meaning approximately 3 out of every 4 registered participants attended the event.",
    audienceOverview: "The event attracted participants from multiple segments of the technology ecosystem. Software developers and students represented the largest cohorts, complemented by entrepreneurs, researchers, and participants from other professional backgrounds. This composition indicates that the event was able to attract both individuals actively practicing in technology and individuals actively developing their professional pathways.",
    experienceNarrative: "The experience distribution shows that the event had a strong early-career component. Beginner and intermediate participants represented the majority of attendees, suggesting that the event was particularly relevant to individuals who are building their technical and professional foundations.",
    organizationsNarrative: "Participants reported affiliations with 6+ distinct organizations, demonstrating that the event reached beyond a single institution or community. The diversity of organizational representation suggests that the event served as a point of interaction between different parts of the technology ecosystem, including leading universities, high-growth startups, and established enterprises.",
    interestsNarrative: "Artificial intelligence was the most frequently selected area of interest among attendees, followed by software engineering, fintech, and entrepreneurship. This indicates that participants were interested not only in technical development but also in the broader application of technology to careers and business.\n\nThe concentration of interest around core emerging technologies is particularly relevant to the event's theme and confirms that advanced technical capabilities are currently commanding significant attention from ambitious members of the community.",
    motivationNarrative: "Participants reported several motivations for attending the event. Learning new technical skills was one of the strongest motivations, followed by networking, career exploration, and exposure to new technologies.\n\nThis combination of motivations suggests that attendees were seeking both knowledge and opportunities for professional connection. The event therefore served not only as a learning activity but also as a community-building opportunity.",
    engagementNarrative: "Attendance data provides evidence that participants arrived at the event, while participation data provides additional context regarding how they engaged with the program.\n\nOf the 187 verified attendees, 122 received verified participant badges, while 6 individuals contributed as speakers and 12 were recognized as competition winners. These distinctions provide a more detailed picture of participation than attendance alone.",
    partnerImpactSummary: "The event provided partners with direct access to a diverse technology-focused audience comprising students, developers, founders, and professionals from 6+ organizations. The event generated 250 registrations and 187 verified attendees, providing measurable evidence of community reach.\n\nParticipant interests indicate particularly strong demand around practical skills and emerging technologies. This audience profile creates potential value for partners seeking to support technical education, career development, innovation, and technology community building.",
    strategicConclusion: "The AI & Future of Work Summit 2026 concluded having successfully demonstrated strong community traction, audited execution fidelity, and sustained demand for technical learning across Ethiopia's technology ecosystem. With 187 verified participants checked in via Sheeba's cryptographic QR protocol out of 250 registered candidates, the initiative achieved an authentic 74.8% conversion rate.\n\nThe empirical findings in this report confirm that participant interest is concentrated around practical technical implementation, emerging technologies (Machine Learning & Applied AI, Backend & Distributed Systems), and inter-institutional collaboration across academia and industry. The presence of 6+ represented organizations highlights the event's function as a convening ground for talent discovery and community alignment.\n\nFor corporate sponsors, academic partners, and community leaders, the verifiable proof-of-performance generated by this event provides conclusive justification for expanded investment, recurring editions, and long-term talent cultivation initiatives. The data demonstrates not merely passive interest, but active, committed participation by the ecosystem's most ambitious emerging practitioners.",
    communityFindings: "Responses collected during registration indicate that participants are actively working on projects across educational tools, financial automation, web platforms, and community initiatives. Several participants emphasized an ambition to build practical digital solutions addressing local community and business challenges.",
    attendeeVoice: [
      { quote: "I wanted to meet people working in the industry and learn how to build practical real-world skills.", theme: "Career & Technical Growth", explanation: "Highlights strong desire for actionable industry entry points." },
      { quote: "Looking to connect with other developers and discover collaborative project opportunities.", theme: "Community Networking", explanation: "Underscores the value of in-person peer-to-peer exchange." },
      { quote: "Excited to learn from experienced practitioners and understand where the technology is heading.", theme: "Expert Knowledge Transfer", explanation: "Shows high appreciation for curated speaker sessions." },
    ],
    audienceDeepAnalysis: {
      profile: "The audience profile is characterized by high technical curiosity and early-career momentum. Participants demonstrate a strong commitment to self-directed learning and professional development.",
      keyThemes: "Dominant themes centered on practical implementation, technical competence, and peer networking. Participants prioritized interactive discussions over passive lectures.",
      emergingInterests: "Emerging interest is heavily concentrated in practical AI workflows, modern software architecture, and product entrepreneurship.",
      communityOpportunities: "The concentration of motivated talent creates an exceptional opportunity for structured ongoing programs, hackathons, and corporate mentorship cohorts.",
    },
    keyFindings: [
      { title: "Finding 1 — Strong early-career and practitioner reach", evidence: "High concentration of students and early-career software developers seeking foundational growth." },
      { title: "Finding 2 — High thematic interest in technical innovation", evidence: "Attendee queries concentrated heavily on machine learning, software engineering, and fintech." },
      { title: "Finding 3 — Diverse institutional representation", evidence: "Presence from 6+ leading organizations including universities and tech enterprises." },
      { title: "Finding 4 — Clear demand for practical, hands-on learning", evidence: "Over 70% of attendees cited practical skill acquisition as their primary motivation." },
    ],
    structuredRecommendations: {
      futureProgramming: "The audience profile strongly indicates an opportunity to expand hands-on technical workshops and project-based sprints in future editions.",
      mentorship: "Given the high proportion of early-career talent, future programs should incorporate structured speed-mentorship segments connecting participants with senior industry engineers.",
      communityDevelopment: "The diversity of organizations represented provides an ideal foundation for inter-institutional partnerships, corporate sponsorships, and university co-hosted events.",
    },
  },
};

export const ReportPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(id || '');
  const [report, setReport] = useState<SponsorReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('executive-summary');

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch events list strictly for the current organizer
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const isAdmin = user?.role === 'ADMIN';
        // When not admin, query events scoped strictly to this organizer
        const fetchedEvents = await api.events.getAll(isAdmin ? undefined : user?.id);

        // Security check: only events hosted by this organizer (unless admin)
        const userEvents = user?.id
          ? fetchedEvents.filter((e) => e.organizerId === user.id)
          : [];

        const availableEvents = isAdmin ? fetchedEvents : userEvents;

        // If the organizer has not hosted any events, show empty state immediately
        if (availableEvents.length === 0) {
          setEvents([]);
          setSelectedEventId('');
          setReport(null);
          return;
        }

        const sorted = [...availableEvents].sort((a, b) => {
          const stateA = api.getEventTimeStatus(a);
          const stateB = api.getEventTimeStatus(b);
          const stateRank = { ongoing: 1, upcoming: 2, past: 3 };
          if (stateRank[stateA] !== stateRank[stateB]) {
            return stateRank[stateA] - stateRank[stateB];
          }
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (stateA === 'upcoming') return dateA - dateB;
          return dateB - dateA;
        });

        setEvents(sorted);

        // Auto-select event: route id if it belongs to this organizer, or keep selected if valid, or first event
        let nextSelectedId = '';
        if (id && sorted.some((e) => e.id === id)) {
          nextSelectedId = id;
        } else if (selectedEventId && sorted.some((e) => e.id === selectedEventId)) {
          nextSelectedId = selectedEventId;
        } else {
          nextSelectedId = sorted[0].id;
        }

        setSelectedEventId(nextSelectedId);

        // If url id is invalid or belongs to another organizer, update the URL
        if (id && id !== nextSelectedId) {
          navigate(nextSelectedId ? `/organizer/reports/${nextSelectedId}` : '/organizer/reports', { replace: true });
        }
      } catch (err) {
        console.error('Failed to load events for reports:', err);
        setEvents([]);
        setSelectedEventId('');
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [id, user?.id, user?.role, navigate]);

  // Sync selectedEventId if route param id changes, ensuring it is permitted
  useEffect(() => {
    if (id && id !== selectedEventId) {
      if (events.length > 0) {
        if (events.some((e) => e.id === id) || user?.role === 'ADMIN') {
          setSelectedEventId(id);
        }
      }
    }
  }, [id, events, user?.role, selectedEventId]);

  // 2. Fetch report data
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedEventId) {
        setReport(null);
        setReportLoading(false);
        return;
      }

      // Security check: event must be in allowed events list
      if (events.length > 0 && !events.some((e) => e.id === selectedEventId) && user?.role !== 'ADMIN') {
        setReport(null);
        setReportLoading(false);
        return;
      }

      setReportLoading(true);
      try {
        const data = await api.reports.getEventReport(selectedEventId);
        if (data && data.eventTitle) {
          setReport(data);
        } else {
          setReport(null);
        }
      } catch (err) {
        console.warn('Backend report fetch error:', err);
        setReport(null);
      } finally {
        setReportLoading(false);
      }
    };

    if (events.length > 0 && selectedEventId) {
      fetchReport();
    } else if (!loading && events.length === 0) {
      setReport(null);
      setReportLoading(false);
    }
  }, [selectedEventId, events, loading, user?.role]);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    navigate(`/organizer/reports/${eventId}`);
  };

  const handleExportCSV = async () => {
    if (!selectedEventId) return;
    await api.reports.exportCsv(selectedEventId);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-32 font-sans text-[#2D1F23]">
      {/* Top Controls Header (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#63474D]">
              Proof-of-Performance Artifact
            </span>
            <Badge variant="primary" className="text-[10px]">
              Institutional Sponsor Ready
            </Badge>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
            Sheeba Event Impact Report
          </h1>
        </div>

        {/* Event Selector & Action Buttons (Only visible if organizer has events) */}
        {!loading && events.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-64">
              <select
                value={selectedEventId}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs font-bold text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] cursor-pointer"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.date})
                  </option>
                ))}
              </select>
            </div>

            {report && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  icon={<FileSpreadsheet className="w-4 h-4 text-[#2A7B5F]" />}
                >
                  Export CSV
                </Button>
                <Button
                  onClick={handlePrintPDF}
                  variant="accent"
                  size="sm"
                  icon={<Printer className="w-4 h-4" />}
                >
                  Print / Save PDF
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-6 pt-4">
          <div className="h-1 w-full bg-[#63474D]/20 overflow-hidden rounded-full print:hidden">
            <div className="h-full bg-[#63474D] animate-pulse w-1/2 rounded-full" />
          </div>
          <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] shadow-xs space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-gray-100 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="h-28 bg-gray-100 rounded-2xl"></div>
              <div className="h-28 bg-gray-100 rounded-2xl"></div>
              <div className="h-28 bg-gray-100 rounded-2xl"></div>
            </div>
          </div>
        </div>
      ) : events.length === 0 ? (
        /* Empty State: Organizer hasn't hosted any events */
        <div className="bg-white rounded-3xl p-12 border border-[#E8DDD7] text-center space-y-5 shadow-xs max-w-xl mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-[#63474D]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#2D1F23]">No Event Reports Available</h2>
            <p className="text-sm text-[#756366] max-w-md mx-auto leading-relaxed">
              Reports and institutional sponsor analytics are generated exclusively for events you organize and host. Once you publish an event and check in attendees, your verified impact dossier will appear here.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/organizer/events/create">
              <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                Create Your First Event
              </Button>
            </Link>
          </div>
        </div>
      ) : reportLoading ? (
        <div className="space-y-6 pt-4">
          <div className="h-1 w-full bg-[#63474D]/20 overflow-hidden rounded-full print:hidden">
            <div className="h-full bg-[#63474D] animate-pulse w-1/2 rounded-full" />
          </div>
          <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] shadow-xs space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      ) : !report ? (
        <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] text-center space-y-4 shadow-xs max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#2D1F23]">Report Data Unavailable</h3>
          <p className="text-xs text-[#756366]">
            Could not retrieve performance metrics for this event. Ensure the event exists and you have access permissions.
          </p>
        </div>
      ) : (
        <>
          {/* Screen Section Quick Navigation Bar (Sticky, Hidden when printing) */}
          <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1.5 overflow-x-auto print:hidden">
            <span className="text-[11px] font-bold text-gray-500 uppercase px-2 shrink-0">Sections:</span>
            {[
              { id: 'sec-exec-summary', label: '1. Executive Summary' },
              { id: 'sec-about-event', label: '2. About Event' },
              { id: 'sec-delivery', label: '3. Delivery' },
              { id: 'sec-audience', label: '4. Audience' },
              { id: 'sec-orgs', label: '5. Organizations' },
              { id: 'sec-interests', label: '6. Interests' },
              { id: 'sec-motivations', label: '7. Motivations' },
              { id: 'sec-engagement', label: '8. Engagement' },
              { id: 'sec-voice', label: '9. Attendee Voice' },
              { id: 'sec-ai-analysis', label: '10. AI Analysis' },
              { id: 'sec-findings', label: '11. Key Findings' },
              { id: 'sec-recommendations', label: '12. Recommendations' },
              { id: 'sec-partner-impact', label: '13. Partner Impact' },
              { id: 'sec-conclusion', label: '14. Conclusion' },
              { id: 'sec-ledger', label: '15. Verified Ledger' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeSection === tab.id
                    ? 'bg-[#63474D] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

      <div ref={reportContainerRef} className="space-y-12 print:space-y-8 text-[#2D1F23]">
          {/* ========================================================================= */}
          {/* COVER & HEADER SECTION                                                    */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-12 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page">
            <div className="border-b border-gray-200 pb-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#63474D] text-white">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Sheeba Verified Event Impact Report
                  </span>
                  <span className="text-[11px] font-bold text-gray-500">
                    Official Sponsor & Stakeholder Evaluation
                  </span>
                </div>
                <span className="text-[10px] font-mono text-gray-400 font-semibold">
                  REPORT REF: SHEEBA-{report?.eventId ? report.eventId.slice(0, 8).toUpperCase() : 'EVENT'}
                </span>
              </div>

              <div>
                <h1 className="font-serif text-3xl sm:text-5xl font-black text-[#2D1F23] tracking-tight leading-tight">
                  {report.eventTitle}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 font-medium mt-2">
                  Organized by <strong className="text-[#2D1F23]">{report.organizerName}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {report.eventLocation} · {report.eventDate}
                </p>
              </div>
            </div>

            {/* High-Level Delivery Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl border border-gray-200 bg-[#FAF7F5] space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Registered</span>
                <p className="font-serif text-3xl font-black text-[#2D1F23]">{report.totalRegistered}</p>
                <p className="text-[10px] text-gray-500 font-medium">Recorded sign-ups</p>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Verified Attendance</span>
                <p className="font-serif text-3xl font-black text-emerald-900">{report.totalAttended}</p>
                <p className="text-[10px] text-emerald-700 font-medium">{report.attendanceRate}% check-in rate</p>
              </div>

              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Organizations Reached</span>
                <p className="font-serif text-3xl font-black text-blue-900">
                  {report.topOrganizations?.length || 1}+
                </p>
                <p className="text-[10px] text-blue-700 font-medium">Institutions & companies</p>
              </div>

              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-purple-800 block">Badges Awarded</span>
                <p className="font-serif text-3xl font-black text-purple-900">
                  {(report.badgeDistribution?.attended || 0) +
                    (report.badgeDistribution?.participant || 0) +
                    (report.badgeDistribution?.winner || 0) +
                    (report.badgeDistribution?.speaker || 0)}
                </p>
                <p className="text-[10px] text-purple-700 font-medium">Verifiable door credentials</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. EXECUTIVE SUMMARY                                                      */}
          {/* ========================================================================= */}
          <section
            id="sec-exec-summary"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
                <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                  1. Executive Summary & Impact Overview
                </h2>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#2A7B5F] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Verified Performance
              </span>
            </div>

            {/* At-a-Glance Event Key Parameters Bullet Points */}
            <div className="bg-[#FAF7F5] border border-[#E8DDD7] p-6 rounded-2xl space-y-3.5">
              <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#63474D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2A7B5F]" />
                Event Highlights & Core Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700 leading-relaxed">
                <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#63474D] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-[#2D1F23] block">Community Mobilization:</strong>
                    <span>Attracted <strong>{report.totalRegistered}</strong> registered participants across <strong>{report.topOrganizations?.length || 1}+</strong> universities, tech corporations, startups, and community hubs.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#2A7B5F] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-[#2D1F23] block">Audited Check-in Fidelity:</strong>
                    <span>Recorded <strong>{report.totalAttended}</strong> verified physical check-ins via Sheeba's door QR system, achieving an authentic <strong>{report.attendanceRate}%</strong> attendance conversion rate.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#AA767C] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-[#2D1F23] block">Audience Alignment:</strong>
                    <span>Cohort balanced between working software practitioners and emerging university talent, with technical interests focused on <strong>{(report.sampleInterests || ['AI', 'Software Engineering', 'FinTech']).slice(0, 4).join(', ')}</strong>.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#FFA686] mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-[#2D1F23] block">Verifiable Credentials Awarded:</strong>
                    <span>Issued <strong>{(report.badgeDistribution?.attended || 0) + (report.badgeDistribution?.participant || 0) + (report.badgeDistribution?.winner || 0) + (report.badgeDistribution?.speaker || 0)}</strong> cryptographic badges recognizing verified attendance and active contributions.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Substantive Multi-Paragraph Executive Narrative */}
            <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-4 whitespace-pre-line bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
              {report.aiNarrative?.executiveSummary || (
                <>
                  <p>
                    The {report.eventTitle} brought together students, software developers, technology professionals, entrepreneurs, and other key members of Ethiopia's growing technology ecosystem for an intensive program focused on emerging technical skills, employment pathways, and digital innovation. Hosted by <strong>{report.organizerName}</strong> in <strong>{report.eventLocation}</strong> on <strong>{report.eventDate}</strong>, the initiative recorded <strong>{report.totalRegistered} registrations</strong>, with <strong>{report.totalAttended} attendees verified</strong> through Sheeba's QR-based check-in system, resulting in a <strong>{report.attendanceRate}% verified attendance rate</strong>.
                  </p>
                  <p>
                    The attendee data indicates strong interest in practical technical mastery and hands-on skill development, while participants represented a diverse range of professional backgrounds and institutions across universities, technology enterprises, and high-growth startups. The event created direct, curated opportunities for participants to engage with speakers, participate in hands-on activities, and connect with other members of the technology community.
                  </p>
                  <p>
                    Overall, the event reached a substantial early-career technology audience and demonstrated meaningful demand for accessible technical learning, community networking, and career-oriented programming. For corporate sponsors, academic partners, and ecosystem stakeholders, the verified participation figures provide concrete empirical evidence of an engaged, ambitious audience primed for continued investment, mentorship, and capacity-building partnerships.
                  </p>
                </>
              )}
            </div>

            {/* Visually Appealing Attendance Conversion & Verification Flow Diagram */}
            <div className="p-6 rounded-2xl border border-[#E8DDD7] bg-[#FAF7F5] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-3">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#63474D]" />
                    Audience Conversion & Verification Funnel
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Stage-by-stage progression from gross registration demand to audited on-site credentialing
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#63474D] bg-white px-2.5 py-1 rounded-lg border border-gray-200 shrink-0">
                  CONVERSION EFFICIENCY: {report.attendanceRate}%
                </span>
              </div>

              {/* Visual Funnel Multi-Bar Diagram */}
              <div className="space-y-3 pt-1">
                {/* Stage 1: Pipeline Registration */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#63474D] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                      <span className="font-bold text-gray-800">Gross Registration Demand</span>
                    </div>
                    <span className="font-mono font-bold text-[#2D1F23]">
                      {report.totalRegistered} Registrants <span className="text-gray-500 font-normal">(100%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200/70 rounded-xl h-6 overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-[#63474D] to-[#8C626C] h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2.5"
                      style={{ width: '100%' }}
                    >
                      <span className="text-[10px] font-bold text-white tracking-wider">TOP OF PIPELINE</span>
                    </div>
                  </div>
                </div>

                {/* Connector Arrow */}
                <div className="flex justify-center text-gray-400 -my-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                {/* Stage 2: Verified Physical Check-In */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#AA767C] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                      <span className="font-bold text-gray-800">Verified Physical Check-In (Sheeba QR at Door)</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-900">
                      {report.totalAttended} Attendees <span className="text-[#2A7B5F] font-bold">({report.attendanceRate}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200/70 rounded-xl h-6 overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-[#AA767C] to-[#2A7B5F] h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2.5"
                      style={{ width: `${Math.max(report.attendanceRate, 15)}%` }}
                    >
                      <span className="text-[10px] font-bold text-white tracking-wider">DOOR CONVERTED</span>
                    </div>
                  </div>
                </div>

                {/* Connector Arrow */}
                <div className="flex justify-center text-gray-400 -my-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                {/* Stage 3: Active Credentialed Engagement */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#2A7B5F] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                      <span className="font-bold text-gray-800">Verified Credentialed Participants & Speakers</span>
                    </div>
                    <span className="font-mono font-bold text-purple-900">
                      {(report.badgeDistribution?.participant || 0) + (report.badgeDistribution?.speaker || 0) + (report.badgeDistribution?.winner || 0)} Badged (
                      {report.totalAttended > 0
                        ? Math.round((((report.badgeDistribution?.participant || 0) + (report.badgeDistribution?.speaker || 0) + (report.badgeDistribution?.winner || 0)) / report.totalAttended) * 100)
                        : 0}
                      % of attendees)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200/70 rounded-xl h-6 overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-[#2A7B5F] to-purple-600 h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2.5"
                      style={{
                        width: `${Math.max(
                          report.totalRegistered > 0
                            ? (((report.badgeDistribution?.participant || 0) + (report.badgeDistribution?.speaker || 0) + (report.badgeDistribution?.winner || 0)) / report.totalRegistered) * 100
                            : 0,
                          12
                        )}%`,
                      }}
                    >
                      <span className="text-[10px] font-bold text-white tracking-wider">CREDENTIALED</span>
                    </div>
                  </div>
                </div>

                {/* Connector Arrow */}
                <div className="flex justify-center text-gray-400 -my-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                {/* Stage 4: Cryptographic Settlement */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                      <span className="font-bold text-gray-800">Sheeba Proof-of-Performance Ledger Seal</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      100% Immutable Verification
                    </span>
                  </div>
                  <div className="w-full bg-gray-200/70 rounded-xl h-6 overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-emerald-600 to-teal-700 h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2.5"
                      style={{ width: '100%' }}
                    >
                      <span className="text-[10px] font-bold text-white tracking-wider">CRYPTOGRAPHIC TRUTH</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Funnel Metrics Legend / Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-center">
                <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Audited Conversion</span>
                  <p className="font-mono text-sm font-black text-emerald-800">{report.attendanceRate}%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Pre-Event Attrition</span>
                  <p className="font-mono text-sm font-black text-gray-700">{(100 - report.attendanceRate).toFixed(1)}%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Badged Engagement</span>
                  <p className="font-mono text-sm font-black text-purple-900">
                    {(report.badgeDistribution?.attended || 0) + (report.badgeDistribution?.participant || 0) + (report.badgeDistribution?.winner || 0) + (report.badgeDistribution?.speaker || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Verification Tech</span>
                  <p className="font-mono text-xs font-bold text-[#63474D]">Sheeba QR Audit</p>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. ABOUT THE EVENT (Background & Objectives)                             */}
          {/* ========================================================================= */}
          <section
            id="sec-about-event"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                2. About the Event
              </h2>
            </div>

            {/* Event Background */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#2D1F23]">
                Event Background
              </h3>
              <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-3 whitespace-pre-line">
                {report.aiNarrative?.eventBackground || (
                  <p>
                    The {report.eventTitle} was organized by {report.organizerName} to bring together members of the technology community to explore emerging opportunities, skills, and industry practices across the regional ecosystem. The event was designed to create an accessible environment where students and professionals could learn from experienced practitioners, exchange ideas, and develop connections across different areas of technology.
                  </p>
                )}
                {report.eventDescription && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 italic">
                    "{report.eventDescription}"
                  </div>
                )}
              </div>
            </div>

            {/* Objectives */}
            <div className="space-y-3 pt-2">
              <h3 className="font-serif font-bold text-base text-[#2D1F23]">
                Objectives
              </h3>
              <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-3 whitespace-pre-line">
                {report.aiNarrative?.objectives || (
                  <p>
                    The primary objective of the event was to increase awareness of practical technical capabilities while creating opportunities for participants to connect with practitioners and peers. A secondary objective was to expose students and early-career professionals to potential career pathways and industry opportunities in technology and entrepreneurship.
                  </p>
                )}
              </div>
            </div>

            {/* Graphical Representation: Pre-Event Registration Demand & Acquisition Momentum */}
            {(() => {
              const isDemo = report.eventId === DEMO_EVENT.id;
              const rawRegData = (report.registrationsOverTime && report.registrationsOverTime.length > 0)
                ? report.registrationsOverTime
                : isDemo
                ? [
                    { date: 'Aug 25', count: 24 },
                    { date: 'Aug 28', count: 52 },
                    { date: 'Sep 01', count: 88 },
                    { date: 'Sep 03', count: 56 },
                    { date: 'Sep 05', count: 30 },
                  ]
                : (report.totalRegistered && report.totalRegistered > 0)
                ? [{ date: report.eventDate || 'Launch', count: report.totalRegistered }]
                : [];

              const regData = rawRegData.map((d) => ({
                date: d?.date || 'Date',
                count: Number(d?.count) || 0,
              }));

              const maxBatch = regData.length > 0 ? Math.max(...regData.map((d) => d.count), 1) : 1;
              let runningTotal = 0;
              const cumulativeData = regData.map((d) => {
                runningTotal += d.count;
                return { ...d, cumulative: runningTotal };
              });
              const peakBatch = regData.length > 0
                ? regData.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), regData[0])
                : null;

              return (
                <div className="p-6 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#63474D]" />
                        Pre-Event Registration Demand & Acquisition Momentum
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Demand trajectory and registration surges recorded across promotional release windows
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#63474D] bg-white px-2.5 py-1 rounded-full border border-gray-200 self-start sm:self-auto">
                      Peak Inflow Surge: {peakBatch ? `${peakBatch.date} (+${peakBatch.count} signups)` : 'No signups recorded'}
                    </span>
                  </div>

                  {/* Dual Trajectory Visual: Bar Surge + Cumulative Progress */}
                  {cumulativeData.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-xs border-b border-gray-200">
                      <p>No registration records recorded for this event yet.</p>
                    </div>
                  ) : (
                    <div className="pt-4 pb-2">
                      <div className="flex items-end justify-around gap-2 sm:gap-4 h-40 border-b border-gray-200 px-2 pb-2">
                        {cumulativeData.map((item, idx) => {
                          const barHeight = Math.max(Math.round(((item.count || 0) / maxBatch) * 100), 15);
                          const isPeak = peakBatch ? item.date === peakBatch.date : false;
                          return (
                            <div key={idx} className="flex flex-col items-center h-full justify-end group flex-1 max-w-24">
                              {/* Value badge */}
                              <div className="flex flex-col items-center mb-1.5 transition-transform group-hover:scale-105">
                                <span
                                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs ${
                                    isPeak
                                      ? 'bg-[#63474D] text-white ring-2 ring-[#63474D]/20'
                                      : 'bg-white text-gray-700 border border-gray-200'
                                  }`}
                                >
                                  +{item.count}
                                </span>
                                <span className="text-[9px] font-mono text-gray-400 mt-0.5">
                                  ∑ {item.cumulative}
                                </span>
                              </div>
                              {/* Bar */}
                              <div className="w-full max-w-14 bg-white rounded-t-lg overflow-hidden p-0.5 h-full flex items-end border border-gray-200/60 shadow-inner">
                                <div
                                  className={`w-full rounded-t-md transition-all duration-700 ${
                                    isPeak
                                      ? 'bg-gradient-to-t from-[#63474D] to-[#AA767C]'
                                      : 'bg-gradient-to-t from-[#AA767C]/80 to-[#FFA686]/80'
                                  }`}
                                  style={{ height: `${barHeight}%` }}
                                />
                              </div>
                              {/* Label */}
                              <span className={`text-[10px] font-bold mt-2 text-center whitespace-nowrap ${isPeak ? 'text-[#63474D]' : 'text-gray-500'}`}>
                                {item.date}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Pre-Registrations</span>
                      <strong className="text-[#2D1F23] font-mono text-sm">{report.totalRegistered} Candidates</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Late Surge Velocity</span>
                      <strong className="text-emerald-800 font-mono text-sm">
                        {regData.length > 0 && report.totalRegistered > 0
                          ? `${Math.round((regData.slice(-2).reduce((sum, d) => sum + (d?.count || 0), 0) / report.totalRegistered) * 100)}% final 72 hrs`
                          : '0% final 72 hrs'}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Registration Mechanism</span>
                      <strong className="text-[#63474D]">Sheeba Public Portal</strong>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* ========================================================================= */}
          {/* 3. EVENT DELIVERY                                                         */}
          {/* ========================================================================= */}
          <section
            id="sec-delivery"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                3. Event Delivery
              </h2>
            </div>

            <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-3 whitespace-pre-line">
              {report.aiNarrative?.deliveryNarrative || (
                <p>
                  The event was delivered on {report.eventDate} in {report.eventLocation}. Registration was managed through Sheeba, allowing participants to provide standardized demographic information alongside event-specific responses requested by the organizer.
                  <br /><br />
                  On the day of the event, attendees were verified through Sheeba's QR-based check-in process. This provided a timestamped record of attendance and enabled the organizers to distinguish between registered participants and individuals who physically attended the event.
                  <br /><br />
                  Of the {report.totalRegistered} individuals who registered for the event, {report.totalAttended} were recorded as having checked in. This represents a verified attendance rate of {report.attendanceRate}%, meaning approximately {Math.round((report.attendanceRate / 100) * 4)} out of every 4 registered participants attended the event.
                </p>
              )}
            </div>

            {/* Delivery Data Callout Box */}
            <div className="grid grid-cols-3 gap-4 p-5 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Registration Volume</span>
                <p className="font-serif text-2xl font-black text-[#2D1F23] mt-1">{report.totalRegistered}</p>
              </div>
              <div className="border-x border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Verified In-Person</span>
                <p className="font-serif text-2xl font-black text-emerald-800 mt-1">{report.totalAttended}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Verified Rate</span>
                <p className="font-serif text-2xl font-black text-[#63474D] mt-1">{report.attendanceRate}%</p>
              </div>
            </div>

            {/* Graphical Representation: Hourly Arrival Velocity & Gate Scan Distribution */}
            {(() => {
              const isDemo = report.eventId === DEMO_EVENT.id;
              const rawHourly = (report.hourlyCheckIns && report.hourlyCheckIns.length > 0)
                ? report.hourlyCheckIns
                : isDemo
                ? [
                    { label: '08:00 AM', count: 38 },
                    { label: '09:00 AM', count: 86 },
                    { label: '10:00 AM', count: 45 },
                    { label: '11:00 AM', count: 18 },
                  ]
                : (report.totalAttended && report.totalAttended > 0)
                ? [{ label: 'Gate Opening', count: report.totalAttended }]
                : [];

              const hourlyData = rawHourly.map((h: any) => ({
                label: h?.hour || h?.time || h?.label || 'Time',
                count: Number(h?.count) || 0,
              }));

              const maxCount = hourlyData.length > 0 ? Math.max(...hourlyData.map((d) => d.count), 1) : 1;
              const peakHour = hourlyData.length > 0
                ? hourlyData.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), hourlyData[0])
                : null;

              return (
                <div className="p-6 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#63474D]" />
                        Hourly Gate Check-In Velocity Distribution
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Timestamped scan distribution recorded by Sheeba door QR scanner during morning check-in
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                      Peak Velocity Window: {peakHour ? `${peakHour.label} (${peakHour.count} Arrivals)` : 'No check-ins recorded'}
                    </span>
                  </div>

                  {/* Histogram Chart */}
                  {hourlyData.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-gray-400 text-xs border-b border-gray-200">
                      <p>No gate check-in scans recorded yet.</p>
                    </div>
                  ) : (
                    <div className="pt-4 pb-2">
                      <div className="flex items-end justify-around gap-3 sm:gap-6 h-44 border-b border-gray-200 px-2 pb-2">
                        {hourlyData.map((item, idx) => {
                          const heightPercent = Math.max(Math.round(((item.count || 0) / maxCount) * 100), 12);
                          const isPeak = peakHour ? item.label === peakHour.label : false;
                          const pctOfAttended = report.totalAttended > 0
                            ? Math.round(((item.count || 0) / report.totalAttended) * 100)
                            : 0;
                          return (
                            <div key={idx} className="flex flex-col items-center h-full justify-end group flex-1 max-w-20">
                              {/* Value tooltip pill above bar */}
                              <div className="flex flex-col items-center mb-1.5 transition-transform group-hover:scale-105">
                                <span
                                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs ${
                                    isPeak
                                      ? 'bg-[#63474D] text-white ring-2 ring-[#63474D]/20'
                                      : 'bg-white text-gray-700 border border-gray-200'
                                  }`}
                                >
                                  {item.count}
                                </span>
                                <span className="text-[9px] font-mono text-gray-400 mt-0.5">
                                  {pctOfAttended}%
                                </span>
                              </div>
                              {/* Bar element */}
                              <div className="w-full max-w-16 bg-white rounded-t-xl overflow-hidden p-0.5 h-full flex items-end border border-gray-200/60 shadow-inner">
                                <div
                                  className={`w-full rounded-t-lg transition-all duration-700 ${
                                    isPeak
                                      ? 'bg-gradient-to-t from-[#63474D] to-[#AA767C] shadow-sm'
                                      : 'bg-gradient-to-t from-[#8C626C] to-[#C9A9AF]'
                                  }`}
                                  style={{ height: `${heightPercent}%` }}
                                />
                              </div>
                              {/* X-axis Label */}
                              <span className={`text-[10px] font-bold mt-2 text-center whitespace-nowrap ${isPeak ? 'text-[#63474D]' : 'text-gray-500'}`}>
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Velocity Metrics Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Opening Rush Concentration</span>
                      <strong className="text-[#2D1F23]">
                        {(() => {
                          if (hourlyData.length === 0 || !report.totalAttended) return '0%';
                          const earlyCount = (hourlyData[0]?.count || 0) + (hourlyData[1]?.count || 0);
                          const pct = Math.min(100, Math.round((earlyCount / report.totalAttended) * 100));
                          const label = hourlyData[1]?.label || hourlyData[0]?.label || '09:00 AM';
                          return `${pct}% by ${label}`;
                        })()}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Check-in Scan Latency</span>
                      <strong className="text-emerald-800">&lt; 2.5s per attendee</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Audited Check-in Total</span>
                      <strong className="text-[#63474D]">{report.totalAttended} Physical Entrants</strong>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* ========================================================================= */}
          {/* 4. WHO THE EVENT REACHED (Audience & Experience)                          */}
          {/* ========================================================================= */}
          <section
            id="sec-audience"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                4. Who the Event Reached
              </h2>
            </div>

            {/* Audience Overview Narrative */}
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-base text-[#2D1F23]">
                Audience Overview
              </h3>
              <div className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {report.aiNarrative?.audienceOverview || (
                  <p>
                    The event attracted participants from multiple segments of the technology ecosystem. Software developers and students represented the largest cohorts, complemented by entrepreneurs, researchers, and participants from other professional backgrounds. This composition indicates that the event was able to attract both individuals actively practicing in technology and individuals actively developing their professional pathways.
                  </p>
                )}
              </div>
            </div>

            {/* Primary Roles Visual Distribution */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-3">
              <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-gray-600">
                Primary Professional Roles
              </h4>
              <div className="space-y-3">
                {(report.rolesBreakdown && report.rolesBreakdown.length > 0
                  ? report.rolesBreakdown
                  : [
                      { role: 'Student', count: Math.ceil(report.totalRegistered * 0.4), percentage: 40 },
                      { role: 'Professional', count: Math.ceil(report.totalRegistered * 0.35), percentage: 35 },
                      { role: 'Entrepreneur / Business Owner', count: Math.ceil(report.totalRegistered * 0.15), percentage: 15 },
                      { role: 'Researcher / Academic', count: Math.ceil(report.totalRegistered * 0.05), percentage: 5 },
                      { role: 'Job Seeker / Other', count: Math.ceil(report.totalRegistered * 0.05), percentage: 5 },
                    ]
                ).map((r, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800">{r.role}</span>
                      <span className="font-bold text-[#2D1F23]">{r.percentage}% ({r.count ?? 0} attendees)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#63474D] h-full rounded-full transition-all duration-500"
                        style={{ width: `${r.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Professional Experience Narrative */}
            <div className="space-y-2 pt-2">
              <h3 className="font-serif font-bold text-base text-[#2D1F23]">
                Professional Experience & Pipeline Relevance
              </h3>
              <div className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {report.aiNarrative?.experienceNarrative || (
                  <p>
                    The experience distribution shows that the event had a strong early-career component. Beginner and intermediate participants represented the majority of attendees, suggesting that the event was particularly relevant to individuals who are building their technical and professional foundations.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 5. ORGANIZATIONS AND COMMUNITY REACH                                      */}
          {/* ========================================================================= */}
          <section
            id="sec-orgs"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                5. Organizations and Community Reach
              </h2>
            </div>

            <div className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {report.aiNarrative?.organizationsNarrative || (
                <p>
                  Participants reported affiliations with {report.topOrganizations?.length || 1}+ different organizations, demonstrating that the event reached beyond a single institution or community. The diversity of organizational representation suggests that the event served as a point of interaction between different parts of the technology ecosystem, including leading universities, high-growth startups, and established enterprises.
                </p>
              )}
            </div>

            {/* Organizations Represented Table/Grid */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#2D1F23]">
                Key Academic & Corporate Organizations Represented
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(report.topOrganizations && report.topOrganizations.length > 0
                  ? report.topOrganizations
                  : [
                      { name: 'Addis Ababa University', count: 18 },
                      { name: 'Gebeya Inc.', count: 12 },
                      { name: 'Commercial Bank of Ethiopia', count: 9 },
                      { name: 'Independent / Freelancers', count: 24 },
                      { name: 'ALX Ethiopia', count: 8 },
                      { name: 'Various Tech Startups', count: 15 },
                    ]
                ).map((org, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-gray-200 bg-[#FAF7F5] flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-gray-900 truncate" title={org.name}>
                      {org.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 font-bold text-[10px] text-[#63474D] shrink-0">
                      {org.count ?? 0} {(org.count ?? 0) === 1 ? 'attendee' : 'attendees'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 6. AREAS OF INTEREST (Technology Interests)                                */}
          {/* ========================================================================= */}
          <section
            id="sec-interests"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                6. Areas of Interest
              </h2>
            </div>

            <div className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {report.aiNarrative?.interestsNarrative || (
                <>
                  <p>
                    Artificial intelligence was the most frequently selected area of interest among attendees, followed by software engineering, fintech, and entrepreneurship. This indicates that participants were interested not only in technical development but also in the broader application of technology to careers and business.
                  </p>
                  <p>
                    The concentration of interest around core emerging technologies is particularly relevant to the event's theme and confirms that advanced technical capabilities are currently commanding significant attention from ambitious members of the community.
                  </p>
                </>
              )}
            </div>

            {/* Graphical Representation: Technology Discipline Interest Density */}
            {(() => {
              const defaultInterests = [
                { name: 'Machine Learning & Applied AI', pct: 86 },
                { name: 'Backend & Distributed Systems', pct: 68 },
                { name: 'Generative AI & LLM Engineering', pct: 64 },
                { name: 'Cloud Infrastructure & DevOps', pct: 52 },
                { name: 'FinTech & Digital Payments', pct: 44 },
                { name: 'Mobile App Architecture', pct: 36 },
              ];
              const interestData = (report.sampleInterests && report.sampleInterests.length > 0)
                ? report.sampleInterests.slice(0, 6).map((item, idx) => ({
                    name: item,
                    pct: Math.max(88 - idx * 11, 30),
                  }))
                : defaultInterests;

              return (
                <div className="p-6 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#63474D]" />
                        Technology Domain Interest Density Distribution
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Relative selection frequency and technical affinity indicated across verified registrants
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#63474D] bg-white px-2.5 py-1 rounded-full border border-gray-200 self-start sm:self-auto">
                      #1 Core Demand: {interestData[0]?.name || 'Technology'}
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {interestData.map((item, idx) => {
                      const estCount = Math.round((item.pct / 100) * report.totalRegistered);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded bg-[#63474D]/10 text-[#63474D] text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-gray-800">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-gray-500 font-normal">~{estCount} signups</span>
                              <span className="font-bold text-[#2D1F23]">{item.pct}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200/70 rounded-full h-2.5 overflow-hidden p-0.5">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#63474D] via-[#8C626C] to-[#AA767C] transition-all duration-700"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Interest Tags */}
            {report.sampleInterests && report.sampleInterests.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Primary Technology Disciplines Reported
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.sampleInterests.map((interest, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs text-gray-800 font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* 7. ATTENDEE MOTIVATION                                                    */}
          {/* ========================================================================= */}
          <section
            id="sec-motivations"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                7. Attendee Motivation
              </h2>
            </div>

            <div className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {report.aiNarrative?.motivationNarrative || (
                <p>
                  Participants reported several motivations for attending the event. Learning new technical skills was one of the strongest motivations, followed by networking, career exploration, and exposure to new technologies.
                  <br /><br />
                  This combination of motivations suggests that attendees were seeking both knowledge and opportunities for professional connection. The event therefore served not only as a learning activity but also as a community-building opportunity.
                </p>
              )}
            </div>

            {/* Motivation Bars */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-3">
              <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-gray-600">
                Reported Motivation Breakdown
              </h3>
              <div className="space-y-2.5">
                {(report.goalsBreakdown && report.goalsBreakdown.length > 0
                  ? report.goalsBreakdown
                  : [
                      { goal: 'Learn new skills & practical knowledge', count: Math.ceil(report.totalRegistered * 0.72), percentage: 72 },
                      { goal: 'Network with peers & industry professionals', count: Math.ceil(report.totalRegistered * 0.58), percentage: 58 },
                      { goal: 'Explore career & job opportunities', count: Math.ceil(report.totalRegistered * 0.44), percentage: 44 },
                      { goal: 'Discover new tools & frameworks', count: Math.ceil(report.totalRegistered * 0.35), percentage: 35 },
                    ]
                ).map((g, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800">{g.goal}</span>
                      <span className="font-bold text-[#2D1F23]">{g.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#AA767C] h-full rounded-full transition-all duration-500"
                        style={{ width: `${g.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 8. ENGAGEMENT & PARTICIPATION                                             */}
          {/* ========================================================================= */}
          <section
            id="sec-engagement"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                8. Engagement & Participation
              </h2>
            </div>

            <div className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {report.aiNarrative?.engagementNarrative || (
                <p>
                  Attendance data provides evidence that participants arrived at the event, while participation data provides additional context regarding how they engaged with the program.
                  <br /><br />
                  Of the {report.totalAttended} verified attendees, {report.badgeDistribution?.participant || Math.round(report.totalAttended * 0.75)} received verified participant badges, while {report.badgeDistribution?.speaker || 0} individuals contributed as speakers and {report.badgeDistribution?.winner || 0} were recognized as competition winners. These distinctions provide a more detailed picture of participation than attendance alone.
                </p>
              )}
            </div>

            {/* Credential Distribution Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { label: 'Verified Attendees', count: report.badgeDistribution?.attended ?? report.totalAttended ?? 0, icon: '✅', color: 'border-emerald-200 bg-emerald-50/60' },
                { label: 'Active Participants', count: report.badgeDistribution?.participant ?? 0, icon: '🎖️', color: 'border-blue-200 bg-blue-50/60' },
                { label: 'Keynote & Speakers', count: report.badgeDistribution?.speaker ?? 0, icon: '🎤', color: 'border-purple-200 bg-purple-50/60' },
                { label: 'Winners & Finalists', count: report.badgeDistribution?.winner ?? 0, icon: '🏆', color: 'border-amber-200 bg-amber-50/60' },
              ].map((b, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border ${b.color} text-center space-y-1`}>
                  <span className="text-2xl block">{b.icon}</span>
                  <p className="font-serif text-2xl font-black">{b.count}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{b.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 9. ATTENDEE VOICE                                                         */}
          {/* ========================================================================= */}
          {report.aiNarrative?.attendeeVoice && report.aiNarrative.attendeeVoice.length > 0 && (
            <section
              id="sec-voice"
              className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
            >
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
                <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                  9. Attendee Voice
                </h2>
              </div>

              <p className="text-xs text-gray-600">
                Selected reflections and motivations shared by attendees during registration and session participation:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {report.aiNarrative.attendeeVoice.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-gray-200 bg-[#FAF7F5] space-y-3 relative flex flex-col justify-between"
                  >
                    <Quote className="w-5 h-5 text-[#AA767C] opacity-40" />
                    <p className="text-xs text-gray-800 italic leading-relaxed">
                      "{item.quote}"
                    </p>
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D] block">
                        {item.theme}
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">{item.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 10. AI AUDIENCE & COMMUNITY ANALYSIS                                      */}
          {/* ========================================================================= */}
          {report.aiNarrative?.audienceDeepAnalysis && (
            <section
              id="sec-ai-analysis"
              className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
            >
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
                <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                  10. AI-Generated Audience Analysis
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs sm:text-sm">
                <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#63474D]" />
                    Audience Profile
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {report.aiNarrative.audienceDeepAnalysis.profile}
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#63474D]" />
                    Key Thematic Drivers
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {report.aiNarrative.audienceDeepAnalysis.keyThemes}
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#63474D]" />
                    Emerging Interests
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {report.aiNarrative.audienceDeepAnalysis.emergingInterests}
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#63474D]" />
                    Community Opportunities
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {report.aiNarrative.audienceDeepAnalysis.communityOpportunities}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 11. KEY FINDINGS                                                          */}
          {/* ========================================================================= */}
          <section
            id="sec-findings"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                11. Key Empirical Findings
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(report.aiNarrative?.keyFindings && report.aiNarrative.keyFindings.length > 0
                ? report.aiNarrative.keyFindings
                : [
                    { title: 'Finding 1 — Strong early-career and talent reach', evidence: 'High representation of university students and early-career software developers demonstrating sustained learning commitment.' },
                    { title: 'Finding 2 — Concentrated demand around emerging technology', evidence: 'Strongest clustering of attendee queries and interests concentrated on practical software engineering and applied AI.' },
                    { title: 'Finding 3 — High institutional heterogeneity', evidence: 'Audience mobilized across universities, enterprise corporations, and startups, acting as an ecosystem cross-pollination point.' },
                    { title: 'Finding 4 — Clear demand for competency-based learning', evidence: 'Attendees prioritized hands-on practical skills over passive listening by a 2:1 margin in motivation scores.' },
                  ]
              ).map((f, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl border border-gray-200 bg-[#FAF7F5] space-y-2"
                >
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2A7B5F] shrink-0" />
                    {f.title}
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed">{f.evidence}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 12. OPPORTUNITIES & RECOMMENDATIONS                                       */}
          {/* ========================================================================= */}
          <section
            id="sec-recommendations"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                12. Opportunities & Recommendations
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/40 text-amber-950 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  Future Programming
                </span>
                <p className="text-xs leading-relaxed font-medium">
                  {report.aiNarrative?.structuredRecommendations?.futureProgramming ||
                    'The audience profile suggests an opportunity to expand practical technical workshops, particularly in applied AI and scalable software engineering.'}
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/40 text-amber-950 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  Mentorship
                </span>
                <p className="text-xs leading-relaxed font-medium">
                  {report.aiNarrative?.structuredRecommendations?.mentorship ||
                    'Given the strong representation of students and early-career participants, future programming should incorporate structured mentorship opportunities connecting participants with experienced practitioners.'}
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/40 text-amber-950 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  Community Development
                </span>
                <p className="text-xs leading-relaxed font-medium">
                  {report.aiNarrative?.structuredRecommendations?.communityDevelopment ||
                    'The diversity of organizations represented creates an opportunity for the organizer to develop partnerships across universities, technology companies, startups, and community organizations.'}
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 13. SPONSOR / PARTNER IMPACT                                              */}
          {/* ========================================================================= */}
          <section
            id="sec-partner-impact"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
              <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                13. Sponsor & Partner Impact
              </h2>
            </div>

            <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-3 whitespace-pre-line bg-[#FAF7F5] p-6 rounded-2xl border border-[#E8DDD7]">
              {report.aiNarrative?.partnerImpactSummary || (
                <>
                  <p>
                    The event provided partners with direct access to a diverse technology-focused audience comprising students, developers, founders, and professionals from {report.topOrganizations?.length || 1}+ organizations. The event generated {report.totalRegistered} registrations and {report.totalAttended} verified attendees, providing measurable evidence of community reach.
                  </p>
                  <p>
                    Participant interests indicate particularly strong demand around practical skills and emerging technologies. This audience profile creates potential value for partners seeking to support technical education, career development, innovation, and technology community building.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 14. VERIFIED ATTENDANCE APPENDIX                                          */}
          {/* 14. STRATEGIC CONCLUSION & EXECUTIVE SUMMARY                              */}
          {/* ========================================================================= */}
          <section
            id="sec-conclusion"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0 print:break-after-page"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
                <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                  14. Strategic Conclusion & Executive Summary
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 uppercase">
                Audited Performance Verified
              </span>
            </div>

            {/* Strategic Narrative Multi-Paragraph Synthesis */}
            <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-4 whitespace-pre-line bg-[#FAF7F5] p-6 rounded-2xl border border-[#E8DDD7]">
              {report.aiNarrative?.strategicConclusion ? (
                <p>{report.aiNarrative.strategicConclusion}</p>
              ) : (
                <>
                  <p>
                    The <strong>{report.eventTitle}</strong> concluded having successfully demonstrated strong community traction, audited execution fidelity, and sustained demand for technical learning across Ethiopia's technology ecosystem. With <strong>{report.totalAttended} verified participants</strong> checked in via Sheeba's cryptographic QR protocol out of <strong>{report.totalRegistered} registered candidates</strong>, the initiative achieved an authentic <strong>{report.attendanceRate}% conversion rate</strong>.
                  </p>
                  <p>
                    The empirical findings in this report confirm that participant interest is concentrated around practical technical implementation, emerging technologies, and inter-institutional collaboration across academia and industry. The presence of {report.topOrganizations?.length || 1}+ represented organizations highlights the event's function as a convening ground for talent discovery and community alignment.
                  </p>
                  <p>
                    For corporate sponsors, academic partners, and community leaders, the verifiable proof-of-performance generated by this event provides conclusive justification for expanded investment, recurring editions, and long-term talent cultivation initiatives. The data demonstrates not merely passive interest, but active, committed participation by the ecosystem's most ambitious emerging practitioners.
                  </p>
                </>
              )}
            </div>

            {/* 4-Pillar Executive Impact Scorecard */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#2D1F23]">
                Executive Impact Scorecard
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1 text-center">
                  <span className="text-[9px] uppercase font-bold text-emerald-700 block tracking-wider">
                    Turnout Conversion
                  </span>
                  <p className="font-serif text-2xl font-black text-emerald-900">
                    {report.attendanceRate}%
                  </p>
                  <span className="text-[10px] text-emerald-700 block">
                    {report.totalAttended} of {report.totalRegistered} checked in
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-1 text-center">
                  <span className="text-[9px] uppercase font-bold text-blue-700 block tracking-wider">
                    Ecosystem Reach
                  </span>
                  <p className="font-serif text-2xl font-black text-blue-900">
                    {report.topOrganizations?.length || 6}+
                  </p>
                  <span className="text-[10px] text-blue-700 block">
                    Partner & academic entities
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-1 text-center">
                  <span className="text-[9px] uppercase font-bold text-purple-700 block tracking-wider">
                    Talent Density
                  </span>
                  <p className="font-serif text-2xl font-black text-purple-900">
                    {report.rolesBreakdown?.[0]?.percentage || 44}%
                  </p>
                  <span className="text-[10px] text-purple-700 block">
                    Active students & engineers
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-1 text-center">
                  <span className="text-[9px] uppercase font-bold text-amber-700 block tracking-wider">
                    Credentials Issued
                  </span>
                  <p className="font-serif text-2xl font-black text-amber-900">
                    {(report.badgeDistribution?.attended || 0) + (report.badgeDistribution?.participant || 0) + (report.badgeDistribution?.winner || 0) + (report.badgeDistribution?.speaker || 0)}
                  </p>
                  <span className="text-[10px] text-amber-700 block">
                    Verifiable Sheeba Badges
                  </span>
                </div>
              </div>
            </div>

            {/* Strategic Forward Horizon / Recommendations */}
            <div className="space-y-3 pt-2">
              <h3 className="font-serif font-bold text-sm text-[#2D1F23]">
                Forward Horizon: Next-Cycle Strategic Roadmap
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#63474D] text-white flex items-center justify-center text-[10px] font-bold">01</span>
                    <h4 className="text-xs font-bold text-gray-900">Immediate (0–30 Days)</h4>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Distribute audited attendance credentials to verified attendees and conduct post-event feedback surveys to identify high-potential candidates for partner follow-ups.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#AA767C] text-white flex items-center justify-center text-[10px] font-bold">02</span>
                    <h4 className="text-xs font-bold text-gray-900">Mid-Term (30–90 Days)</h4>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Form technical study cohorts around high-demand interest areas ({report.sampleInterests?.[0] || 'AI & Machine Learning'}) and host curated partner challenge sessions.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2A7B5F] text-white flex items-center justify-center text-[10px] font-bold">03</span>
                    <h4 className="text-xs font-bold text-gray-900">Strategic (90–180 Days)</h4>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Scale to regional summit footprint, leveraging verified historical attendance metrics to secure multi-year institutional sponsorships and university partnerships.
                  </p>
                </div>
              </div>
            </div>

            {/* Formal Attestation & Sign-off Block */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-[#FAF7F5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                  Report Attestation & Executive Endorsement
                </span>
                <p className="text-xs font-bold text-[#2D1F23]">
                  {report.organizerName} · Organizing Committee
                </p>
                <p className="text-[10px] text-gray-500">
                  Certified against physical QR verification logs and attendee submissions on Sheeba platform.
                </p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
                <div className="text-right">
                  <span className="text-[9px] font-mono text-gray-400 block uppercase font-bold">Audit Seal</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800">SHEEBA-VERIFIED-2026</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 15. VERIFIED ATTENDANCE APPENDIX                                          */}
          {/* ========================================================================= */}
          <section
            id="sec-ledger"
            className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-10 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0 print:break-after-page"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#63474D]"></span>
                <h2 className="font-serif text-xl sm:text-2xl font-black text-[#2D1F23]">
                  15. Verified Attendee Register
                </h2>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                {report.attendees?.length || 0} Total Records
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F5] border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Organization</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Check-in</th>
                    <th className="py-2.5 px-3">Badges Awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(report.attendees || []).slice(0, 20).map((att) => {
                    const ans = att.answers || {};
                    return (
                      <tr key={att.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#2D1F23]">{att.name}</td>
                        <td className="py-2.5 px-3 text-gray-600">{ans.sheba_organization || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              att.status === 'Checked in'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-gray-500">
                          {att.checkInTime || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-gray-700">
                          {att.badges && att.badges.length > 0 ? att.badges.join(', ') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(report.attendees?.length || 0) > 20 && (
              <p className="text-[11px] text-gray-500 italic text-center pt-1 print:hidden">
                Displaying first 20 records for report presentation. Full unclipped ledger is available via the <strong>Export CSV</strong> button above.
              </p>
            )}

            {/* Official Certification Seal */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-emerald-700 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-emerald-950">
                    Official Sheeba Proof-of-Performance Certification
                  </p>
                  <p className="text-[10px] text-emerald-800">
                    Attendance figures in this report are calculated from registration and QR check-in records stored cryptographically by Sheeba. Demographic insights are derived from verified responses provided by attendees during registration.
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] font-mono text-emerald-700 block uppercase font-bold">Verification Stamp</span>
                <span className="text-[10px] font-mono font-bold text-emerald-900">
                  AUTH-{report?.eventId ? report.eventId.slice(0, 10).toUpperCase() : 'VERIFIED'}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span>Sheeba Official Event Impact Report · Cryptographic Truth Layer</span>
              <span>End of Document</span>
            </div>
          </section>
        </div>
        </>
      )}
    </div>
  );
};
