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
  Mic,
  Handshake,
  Trophy,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Building2,
  DollarSign,
  FileText,
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
import { submitFormalSponsorshipApplicationSchema, validateForm } from '../../schemas';

export const SponsorApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<ISponsorshipApplication | null>(null);
  const [existingDeal, setExistingDeal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Interaction State
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [pledgedAmount, setPledgedAmount] = useState<number | undefined>(undefined);
  const [proposalMessage, setProposalMessage] = useState<string>('');
  const [sponsorNotes, setSponsorNotes] = useState<string>('');
  const [isResubmitting, setIsResubmitting] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchApplicationAndDeal = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setErrorMsg(null);
        
        const [appData, myDeals] = await Promise.all([
          api.sponsorship.getApplication(id),
          api.sponsorship.getMyDeals().catch(() => []),
        ]);

        if (appData) {
          setApplication(appData);
          if (appData.packages && appData.packages.length > 0) {
            setSelectedPackage(appData.packages[0].name);
            setPledgedAmount(appData.packages[0].amount);
          } else {
            setPledgedAmount(appData.funding_goal);
          }

          // Check if active deal exists
          const active = myDeals.find((d: any) => d.application_id === id);
          if (active) {
            setExistingDeal(active);
            if (active.package_name) setSelectedPackage(active.package_name);
            if (active.pledged_amount) setPledgedAmount(active.pledged_amount);
            if (active.proposal_message) setProposalMessage(active.proposal_message);
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

    fetchApplicationAndDeal();
  }, [id]);

  const handleFormalApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;

    if (!selectedPackage) {
      setFeedbackMessage({ type: 'error', text: 'Please select a sponsorship package tier.' });
      return;
    }

    if (!pledgedAmount || pledgedAmount <= 0) {
      setFeedbackMessage({ type: 'error', text: 'Please enter a valid pledged sponsorship amount.' });
      return;
    }

    if (!proposalMessage.trim() || proposalMessage.trim().length < 10) {
      setFeedbackMessage({
        type: 'error',
        text: 'Please provide a proposal message of at least 10 characters explaining your interest and goals.',
      });
      return;
    }

    const payload = {
      applicationId: application.id,
      package_name: selectedPackage,
      pledged_amount: Number(pledgedAmount),
      proposal_message: proposalMessage.trim(),
      sponsor_notes: sponsorNotes.trim() || undefined,
    };

    const validation = validateForm(submitFormalSponsorshipApplicationSchema, payload);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0] || 'Invalid application parameters.';
      setFeedbackMessage({ type: 'error', text: firstError });
      return;
    }

    try {
      setActionLoading(true);
      setFeedbackMessage(null);

      await api.sponsorship.submitApplication(payload);

      setFeedbackMessage({
        type: 'success',
        text: 'Your formal sponsorship application has been submitted and is now pending review by Sheeba Administration!',
      });

      setTimeout(() => {
        navigate('/sponsor/deals');
      }, 1500);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to submit application. Please verify parameters.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclinePitch = async () => {
    if (!application) return;
    try {
      setActionLoading(true);
      setFeedbackMessage(null);

      await api.sponsorship.expressInterestOrDecline({
        applicationId: application.id,
        status: 'DECLINED',
        package_name: selectedPackage || undefined,
        pledged_amount: pledgedAmount,
      });

      navigate('/sponsor/deals');
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to mark pitch as declined.',
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

  const resolvedSocials = React.useMemo(() => {
    if (!application) return {};
    const directSocials = application.socials || {};
    return Object.keys(directSocials).length > 0 ? directSocials : {};
  }, [application]);

  const socialEntries = Object.entries(resolvedSocials).filter(
    ([_, url]) => url && typeof url === 'string' && url.trim().length > 0
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Clock className="w-10 h-10 text-[#63474D] animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Retrieving sponsorship opportunity...</p>
      </div>
    );
  }

  if (errorMsg || !application) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-red-200 rounded-3xl text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-serif font-bold text-gray-900">Opportunity Not Available</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          {errorMsg || 'This pitch application does not exist or may have been removed by the organizer.'}
        </p>
        <Link
          to="/sponsor/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#63474D] text-white text-xs font-bold hover:bg-[#4A3238] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Marketplace</span>
        </Link>
      </div>
    );
  }

  const isPending = existingDeal?.status === 'PENDING';
  const isApproved = existingDeal?.status === 'APPROVED';
  const isRejected = existingDeal?.status === 'REJECTED';

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 px-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/sponsor/explore"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#63474D] hover:text-[#2D1F23] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#FAF7F5] border border-[#E8DDD7] text-[#63474D]">
            {application.category} • {application.event_type}
          </span>
        </div>
      </div>

      {/* Hero Pitch Overview */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#4A3238] to-[#63474D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[#FFA686] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Verified Event Pitch
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            {application.event_title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-200 line-clamp-3 leading-relaxed max-w-2xl">
            {application.description}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/15 text-xs">
            <div>
              <p className="text-gray-300 text-[10px] uppercase font-bold">Expected Date</p>
              <p className="font-bold text-white mt-0.5">{application.expected_date}</p>
            </div>
            <div>
              <p className="text-gray-300 text-[10px] uppercase font-bold">Location</p>
              <p className="font-bold text-white mt-0.5 truncate">{application.location}</p>
            </div>
            <div>
              <p className="text-gray-300 text-[10px] uppercase font-bold">Attendees</p>
              <p className="font-bold text-white mt-0.5">{application.expected_attendees.toLocaleString()}+</p>
            </div>
            <div>
              <p className="text-gray-300 text-[10px] uppercase font-bold">Funding Goal</p>
              <p className="font-bold text-[#FFA686] mt-0.5">
                {application.funding_goal.toLocaleString()} {application.currency}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* EXISTING STATUS BANNER (If sponsor already applied) */}
      {existingDeal && (
        <>
          {isPending && (
            <div className="p-6 bg-amber-50 border border-amber-300/80 rounded-3xl space-y-3 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-amber-900 font-bold text-base">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                  <span>Application Under Administrator Review</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 px-3 py-1 rounded-full">
                  Pending Decision
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                You submitted a formal sponsorship application for the <strong>{existingDeal.package_name}</strong> package ({existingDeal.pledged_amount?.toLocaleString()} {application.currency}) on {new Date(existingDeal.created_at).toLocaleDateString()}.
              </p>
              {existingDeal.proposal_message && (
                <div className="bg-white/80 p-3.5 rounded-2xl border border-amber-200 text-xs italic text-gray-700">
                  "{existingDeal.proposal_message}"
                </div>
              )}
              <div className="pt-1 flex items-center gap-3">
                <Link
                  to="/sponsor/deals"
                  className="text-xs font-bold text-[#63474D] underline hover:text-[#2D1F23]"
                >
                  View Application in Deals Pipeline →
                </Link>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="p-6 bg-emerald-50 border border-emerald-300/80 rounded-3xl space-y-3 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Approved Sponsorship Partner!</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-3 py-1 rounded-full">
                  Approved
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Sheeba Administration has formally approved your sponsorship application for the <strong>{existingDeal.package_name}</strong> package. The event organizer has received your corporate representative details.
              </p>
              <div className="pt-2">
                <Link
                  to="/sponsor/deals"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <span>Access Deals & Deliverables</span>
                </Link>
              </div>
            </div>
          )}

          {isRejected && !isResubmitting && (
            <div className="p-6 bg-rose-50 border border-rose-300/80 rounded-3xl space-y-3 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-900 font-bold text-base">
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <span>Previous Application Declined</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResubmitting(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-rose-100/60 border border-rose-300 text-rose-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Submit Revised Proposal</span>
                </button>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Administrator Feedback: <strong className="font-semibold italic">"{existingDeal.rejection_reason || 'Package was unavailable or budget alignment required.'}"</strong>
              </p>
              <p className="text-xs text-gray-600">
                You may adjust your chosen package tier or proposed contribution and submit a revised application below.
              </p>
            </div>
          )}
        </>
      )}

      {/* Organizer Verified Card */}
      <div className="bg-white rounded-3xl border border-[#E8DDD7] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center font-bold text-lg border border-[#63474D]/20 shrink-0">
            {application.organizer_organization?.[0] || 'O'}
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-[#2D1F23]">
              {application.organizer_organization || application.organizer_name}
            </h3>
            <p className="text-xs text-gray-500">
              Verified Event Organizer • Contact: {application.contact_name}
            </p>
          </div>
        </div>

        {/* Social logos */}
        {socialEntries.length > 0 && (
          <div className="flex items-center gap-2">
            {socialEntries.map(([platform, link]) => {
              const strLink = String(link || '');
              const cleanLink = strLink.startsWith('http') ? strLink : `https://${strLink}`;
              return (
                <a
                  key={platform}
                  href={cleanLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-[#63474D] hover:text-white text-gray-600 flex items-center justify-center transition-all border border-stone-200"
                >
                  {getSocialLogo(platform)}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Packages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2D1F23]">
            Sponsorship Packages
          </h2>
          <span className="text-xs font-semibold text-gray-500">
            Select a tier to apply
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
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-4 ${
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
            Custom package based on total goal: {application.funding_goal.toLocaleString()} {application.currency}
          </p>
        )}
      </div>

      {/* FORMAL SPONSORSHIP APPLICATION FORM (Active when no pending/approved deal or resubmitting) */}
      {(!existingDeal || isRejected || isResubmitting) && (
        <form onSubmit={handleFormalApplicationSubmit} className="bg-white rounded-3xl border border-[#E8DDD7] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1 border-b border-gray-100 pb-4">
            <h3 className="font-serif font-bold text-lg text-[#2D1F23] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#63474D]" />
              <span>Submit Formal Sponsorship Proposal</span>
            </h3>
            <p className="text-xs text-[#756366]">
              Every application is reviewed directly by Sheeba Administration. Once approved, the organizer is notified and granted access to your contact details.
            </p>
          </div>

          {/* Package & Proposed Amount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1.5">
                Selected Sponsorship Tier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                readOnly
                value={selectedPackage || 'Please select a package above'}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-100 border border-stone-200 rounded-xl font-bold text-[#2D1F23] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1.5">
                Proposed Sponsorship Amount ({application.currency}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={100}
                value={pledgedAmount !== undefined ? pledgedAmount : ''}
                onChange={(e) => setPledgedAmount(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="100,000"
                className="w-full px-3.5 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] font-bold text-[#63474D]"
              />
            </div>
          </div>

          {/* Proposal Message (Required) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#2D1F23]">
                Proposal Message & Objectives <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400">Min 10 characters</span>
            </div>
            <textarea
              required
              rows={4}
              value={proposalMessage}
              onChange={(e) => setProposalMessage(e.target.value)}
              placeholder="Explain your organization's sponsorship goals, requested brand placements, speaker nominations, or hackathon challenge requirements..."
              className="w-full p-3 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-gray-900 leading-relaxed"
            />
          </div>

          {/* Optional Sponsor Internal Notes */}
          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1.5">
              Internal Team Notes <span className="text-gray-400 font-normal">(Optional, for your pipeline tracking)</span>
            </label>
            <input
              type="text"
              value={sponsorNotes}
              onChange={(e) => setSponsorNotes(e.target.value)}
              placeholder="e.g. Budget approved by marketing committee on Monday..."
              className="w-full px-3.5 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] text-gray-700"
            />
          </div>

          {/* Feedback alert */}
          {feedbackMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border border-red-300 text-red-900'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* Submission Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleDeclinePitch}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 text-gray-600 hover:text-red-700 hover:border-red-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Decline Pitch
            </button>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[#63474D] hover:bg-[#4A3238] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-[#FFA686]" />
              <span>{actionLoading ? 'Submitting Application...' : 'Submit Formal Application'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
