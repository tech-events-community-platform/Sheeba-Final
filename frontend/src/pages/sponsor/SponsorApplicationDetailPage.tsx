import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Send,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
} from 'lucide-react';
import {
  LinkedInIcon,
  XIcon,
  TikTokIcon,
  YouTubeIcon,
  InstagramIcon,
  FacebookIcon,
  TelegramIcon,
  GlobeIcon,
} from '../../components/ui/SocialIcons';
import { api } from '../../services/api';
import type { ISponsorshipApplication } from '../../types/sponsorship';

export const SponsorApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<ISponsorshipApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Interaction State
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [pledgedAmount, setPledgedAmount] = useState<number | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchApplication = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await api.sponsorship.getApplication(id);
        if (data) {
          setApplication(data);
          if (data.packages && data.packages.length > 0) {
            setSelectedPackage(data.packages[0].name);
            setPledgedAmount(data.packages[0].amount);
          } else {
            setPledgedAmount(data.funding_goal);
          }
        } else {
          setErrorMsg('Sponsorship application pitch not found.');
        }
      } catch (err: any) {
        console.error('Failed to load application details', err);
        setErrorMsg(err.message || 'Unable to retrieve event pitch details.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  const handleExpressInterestOrDecline = async (status: 'INTERESTED' | 'DECLINED') => {
    if (!application) return;
    try {
      setActionLoading(true);
      setFeedbackMessage(null);

      await api.sponsorship.expressInterestOrDecline({
        applicationId: application.id,
        status,
        package_name: selectedPackage,
        pledged_amount: pledgedAmount,
      });

      // Navigate to deals and pledges tab
      navigate('/sponsor/deals');
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to update deal status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getSocialLogo = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('linkedin')) return <LinkedInIcon className="w-4 h-4" />;
    if (p.includes('twitter') || p === 'x') return <XIcon className="w-4 h-4" />;
    if (p.includes('tiktok')) return <TikTokIcon className="w-4 h-4" />;
    if (p.includes('youtube')) return <YouTubeIcon className="w-4 h-4" />;
    if (p.includes('instagram')) return <InstagramIcon className="w-4 h-4" />;
    if (p.includes('facebook')) return <FacebookIcon className="w-4 h-4" />;
    if (p.includes('telegram')) return <TelegramIcon className="w-4 h-4" />;
    return <GlobeIcon className="w-4 h-4" />;
  };

  // Resolve organizer socials from application or stored organizer profile
  const resolvedSocials = React.useMemo(() => {
    if (!application) return {};
    if (application.socials && Object.keys(application.socials).length > 0) {
      return application.socials;
    }
    // Fallback check in localStorage
    try {
      const stored =
        (application.organizer_id && localStorage.getItem(`sheeba_organizer_socials_${application.organizer_id}`)) ||
        localStorage.getItem('sheeba_organizer_socials');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  }, [application]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="animate-spin w-10 h-10 border-3 border-[#63474D] border-t-transparent rounded-full mx-auto" />
        <p className="text-sm font-medium text-gray-600">Loading proposal details...</p>
      </div>
    );
  }

  if (errorMsg || !application) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4 bg-white rounded-3xl border border-[#E8DDD7] shadow-xs my-8">
        <AlertCircle className="w-12 h-12 text-[#AA767C] mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">Application Not Found</h2>
        <p className="text-xs text-[#756366]">{errorMsg || 'This proposal does not exist or has been withdrawn.'}</p>
        <Link
          to="/sponsor"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#63474D] text-white text-xs font-bold shadow-xs hover:bg-[#523a3f]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore Pitches</span>
        </Link>
      </div>
    );
  }

  const socialEntries = Object.entries(resolvedSocials);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 px-2 sm:px-4">
      {/* Top Back Nav */}
      <div>
        <Link
          to="/sponsor"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#63474D] hover:text-[#2D1F23] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore Pitches</span>
        </Link>
      </div>

      {/* TOP SECTION: Matches Screenshot - Picture by itself on left, typography & stats right (NO OUTER CARD BOX) */}
      <div className="flex flex-col md:flex-row items-start gap-6 sm:gap-8">
        {/* Left: Picture by itself */}
        <div className="w-full sm:w-64 h-44 sm:h-48 rounded-2xl overflow-hidden bg-stone-100 shadow-sm shrink-0">
          <img
            src="/coming-soon.webp"
            loading="lazy"
            alt={application.event_title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right: Meta pills, Large Title, Date/Location line, Stats row */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Top Meta Line */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <span>{application.event_type}</span>
            <span>•</span>
            <span className="text-emerald-700">UPCOMING</span>
            <span>•</span>
            <span className="text-[#63474D]">{application.category}</span>
          </div>

          {/* Event Title */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D1F23] tracking-tight leading-tight">
            {application.event_title}
          </h1>

          {/* Date, Time, Location with clean icons */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#594246] pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain shrink-0" />
              <span>{application.expected_date}</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-[#AA767C] shrink-0" />
              <span>Full Day Session</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-[#C44536]">
              <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain shrink-0" />
              <span>{application.location}</span>
            </span>
          </div>

          {/* Numeric Stats Row (Like Screenshot: REGISTERED, CHECKED IN, CAPACITY) */}
          <div className="flex items-center gap-8 sm:gap-14 pt-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                EXPECTED TURNOUT
              </span>
              <span className="font-serif font-extrabold text-2xl sm:text-3xl text-[#2D1F23]">
                {application.expected_attendees.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                FUNDING GOAL
              </span>
              <span className="font-serif font-extrabold text-2xl sm:text-3xl text-emerald-700">
                {application.funding_goal.toLocaleString()}{' '}
                <span className="text-xs font-sans font-bold text-gray-500">{application.currency}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                PACKAGES
              </span>
              <span className="font-serif font-extrabold text-2xl sm:text-3xl text-[#63474D]">
                {application.packages?.length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thick Grey Divider Line */}
      <div className="w-full h-1 bg-gray-300/80 rounded-full my-6" />

      {/* ROW 1: Event Concept & Value Proposition (Label left, answer right in same row - NO CARD BOX) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start py-4 border-b border-gray-200">
        <div className="md:col-span-4">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2D1F23]">
            Event Concept & Value Proposition
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Pitch details provided by the organizer</p>
        </div>
        <div className="md:col-span-8">
          <p className="text-sm sm:text-base text-[#3d2b2f] leading-relaxed whitespace-pre-line font-normal">
            {application.description}
          </p>
        </div>
      </div>

      {/* ROW 2: Target Demographics & Audience Profile (Label left, answer right in same row - NO CARD BOX) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start py-4 border-b border-gray-200">
        <div className="md:col-span-4">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2D1F23]">
            Target Demographics & Audience Profile
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Audience reach and target participants</p>
        </div>
        <div className="md:col-span-8">
          <p className="text-sm sm:text-base text-[#3d2b2f] leading-relaxed font-normal">
            {application.target_audience || 'General public, community enthusiasts, and verified tech passholders.'}
          </p>
        </div>
      </div>

      {/* Pitch Deck Link if Provided */}
      {application.pitch_deck_url && (
        <div className="py-2 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Organizer Pitch Deck / Slides</h3>
            <p className="text-xs text-gray-500">Official presentation slides or proposal document</p>
          </div>
          <a
            href={application.pitch_deck_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#63474D] text-white text-xs font-bold shadow-xs hover:bg-[#523a3f] transition-all"
          >
            <span>View Pitch Deck</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* ROW 3: Direct Organizer Contact Card (Structured like the before two) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start py-4 border-b border-gray-200">
        <div className="md:col-span-4">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2D1F23]">
            Direct Organizer Contact Card
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Official communication channels and organizer rep</p>
        </div>
        <div className="md:col-span-8 flex justify-start md:justify-end">
          <div className="w-full max-w-md bg-[#dedbd8] border border-stone-300 rounded-xl p-5 shadow-xs text-[#2D1F23] space-y-3">
            {/* Header: Organizer & Verified Tag */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-300/80 pb-2.5">
              <div>
                <h3 className="font-serif font-bold text-base text-[#2D1F23]">
                  {application.organizer_organization || application.organizer_name}
                </h3>
                {application.contact_name && (
                  <p className="text-xs text-[#523e43] mt-0.5">
                    Lead Rep: <strong className="font-semibold text-gray-900">{application.contact_name}</strong>
                  </p>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                Verified Organizer
              </span>
            </div>

            {/* Direct Contact Channels - NO rectangular boxes behind them */}
            <div className="space-y-2 text-xs">
              <a
                href={`tel:${application.contact_phone}`}
                className="flex items-center gap-2.5 text-gray-900 hover:text-[#63474D] transition-colors"
              >
                <img src="/phone-icon.webp" alt="Phone" className="w-4 h-4 object-contain shrink-0" />
                <span className="font-semibold">{application.contact_phone}</span>
              </a>

              <a
                href={`mailto:${application.contact_email}?subject=Sponsorship%20Inquiry%20-%20${encodeURIComponent(application.event_title)}`}
                className="flex items-center gap-2.5 text-gray-900 hover:text-[#63474D] transition-colors"
              >
                <img src="/mail-icon.webp" alt="Email" className="w-4 h-4 object-contain shrink-0" />
                <span className="font-semibold truncate">{application.contact_email}</span>
              </a>

              {application.contact_telegram && (
                <a
                  href={
                    application.contact_telegram.startsWith('http')
                      ? application.contact_telegram
                      : `https://t.me/${application.contact_telegram.replace('@', '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-gray-900 hover:text-[#63474D] transition-colors"
                >
                  <TelegramIcon className="w-4 h-4 text-[#229ED9] shrink-0" />
                  <span className="font-semibold">{application.contact_telegram}</span>
                </a>
              )}
            </div>

            {/* Social Logos instead of text names */}
            {socialEntries.length > 0 && (
              <div className="pt-2.5 border-t border-stone-300/80 flex items-center gap-2">
                {socialEntries.map(([platform, link]) => {
                  const strLink = String(link || '');
                  const cleanLink = strLink.startsWith('http') ? strLink : `https://${strLink}`;
                  return (
                    <a
                      key={platform}
                      href={cleanLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={platform}
                      aria-label={platform}
                      className="w-7 h-7 rounded-lg bg-stone-200/70 hover:bg-white text-[#2D1F23] hover:text-[#63474D] border border-stone-300/80 flex items-center justify-center transition-all shadow-2xs hover:scale-105"
                    >
                      {getSocialLogo(platform)}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thick Grey Divider Line before Packages */}
      <div className="w-full h-1 bg-gray-300/80 rounded-full my-8" />

      {/* AVAILABLE PACKAGES SECTION: Differentiated by thick grey line, NOT in a card box */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2D1F23]">
            Available Sponsorship Packages
          </h2>
          <span className="text-xs font-semibold text-gray-500">
            Select a tier to pledge
          </span>
        </div>

        {application.packages && application.packages.length > 0 ? (
          <div className="space-y-3">
            {application.packages.map((pkg, idx) => {
              const isSelected = selectedPackage === pkg.name;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedPackage(pkg.name);
                    setPledgedAmount(pkg.amount);
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'border-[#63474D] bg-[#63474D]/5 ring-1 ring-[#63474D]'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="tier-package"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedPackage(pkg.name);
                        setPledgedAmount(pkg.amount);
                      }}
                      className="mt-1 text-[#63474D] focus:ring-[#63474D]"
                    />
                    <div>
                      <span className="font-serif font-bold text-base sm:text-lg text-[#2D1F23]">
                        {pkg.name}
                      </span>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                        {pkg.perks}
                      </p>
                    </div>
                  </div>

                  <span className="font-serif font-bold text-base sm:text-xl text-[#63474D] whitespace-nowrap">
                    {pkg.amount.toLocaleString()} {application.currency}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Custom sponsorship package based on total goal: {application.funding_goal.toLocaleString()} {application.currency}
          </p>
        )}
      </div>

      {/* FEEDBACK ALERT */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 max-w-lg mx-auto ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-red-50 border border-red-300 text-red-900'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* ACTION BUTTONS: Just Decline (Red) and Mark as Interested (Green), Centered */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => handleExpressInterestOrDecline('DECLINED')}
          className="w-full sm:w-56 py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <XCircle className="w-5 h-5" />
          <span>Decline</span>
        </button>

        <button
          type="button"
          disabled={actionLoading}
          onClick={() => handleExpressInterestOrDecline('INTERESTED')}
          className="w-full sm:w-56 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Mark as Interested</span>
        </button>
      </div>
    </div>
  );
};
