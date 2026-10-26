import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import {
  Compass,
  Search,
  Calendar,
  MapPin,
  Store,
  Layers,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Clock,
  ArrowRight,
  Info,
  Building2,
  ShieldCheck,
  HelpCircle,
  RotateCcw,
  LogIn,
  CreditCard,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { RegistrationQuestion } from '../../types/event';
import type { IExhibitorBooth } from '../../types/exhibitor';

export const ExhibitorExplorePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [calls, setCalls] = useState<any[]>([]);
  const [myBooths, setMyBooths] = useState<IExhibitorBooth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Application Modal State
  const [applyingCall, setApplyingCall] = useState<any | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<any | null>(null);
  const [submittedAppSummary, setSubmittedAppSummary] = useState<any | null>(null);

  const [spaceRequested, setSpaceRequested] = useState<number>(2);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Tech');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [showcaseDescription, setShowcaseDescription] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchCalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, userBooths] = await Promise.all([
        api.exhibitors.exploreOpenCalls({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: search.trim() || undefined,
        }),
        user ? api.exhibitors.getMyBooths().catch(() => []) : Promise.resolve([]),
      ]);
      setCalls(data || []);
      setMyBooths(userBooths || []);
    } catch (err: any) {
      console.error('Failed to load open exhibitor calls:', err);
      setError(err?.message || 'Unable to load exhibitor opportunities. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [selectedCategory, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCalls();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
  };

  const handleOpenApplyModal = (call: any) => {
    // If not authenticated, prompt user to log in or register as exhibitor
    if (!user) {
      setShowAuthModal(call);
      return;
    }

    setApplyingCall(call);
    setSpaceRequested(call.pricingMode === 'fixed' ? 4 : 2);
    setBusinessName(user?.companyName || user?.organization || user?.name || '');
    if (user?.industryCategory) setCategory(user.industryCategory);
    setContactName(user?.name || '');
    setContactEmail(user?.email || '');
    setContactPhone(user?.companyPhone || user?.phone || '');
    setShowcaseDescription(user?.bio || '');
    setSpecialRequirements('');
    setQuestionAnswers({});
    setModalError(null);
  };

  // Check if user returned after authentication with an intended event application
  useEffect(() => {
    if (loading || calls.length === 0) return;

    const applyEventId = searchParams.get('applyEventId') || (location.state as any)?.applyEventId;
    if (applyEventId) {
      // Validate against the currently loaded eligible public calls
      const matched = calls.find((c) => c.eventId === applyEventId || c.id === applyEventId);
      if (matched && user) {
        handleOpenApplyModal(matched);
      }
      // Clean up search param so reloads or closing modal won't re-trigger it
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('applyEventId');
      setSearchParams(nextParams, { replace: true });
    }
  }, [loading, calls, user]);

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingCall) return;

    // Validate required custom questions if any
    if (applyingCall.customQuestions && applyingCall.customQuestions.length > 0) {
      for (const q of applyingCall.customQuestions as RegistrationQuestion[]) {
        const isReq = q.isRequired ?? (q as any).required;
        const qText = q.questionText || (q as any).question || 'Question';
        if (isReq) {
          const ans = questionAnswers[q.id];
          if (ans === undefined || ans === null || String(ans).trim() === '') {
            setModalError(`Please answer the required question: "${qText}"`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await api.exhibitors.apply(applyingCall.eventId, {
        businessName,
        category,
        contactName,
        contactEmail,
        contactPhone,
        showcaseDescription,
        specialRequirements: specialRequirements.trim() || undefined,
        spaceSqm: spaceRequested,
        pricingMode: applyingCall.pricingMode || 'per_sqm',
        questionAnswers: Object.keys(questionAnswers).length > 0 ? questionAnswers : undefined,
      });

      setSubmittedAppSummary({
        eventTitle: applyingCall.eventTitle,
        businessName,
        spaceRequested,
        pricingMode: applyingCall.pricingMode || 'per_sqm',
        totalEstimatedAmount: calculatedTotalAmount,
      });
      setApplyingCall(null);
      fetchCalls();
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit exhibitor application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pricing calculations
  const isFixedPricing = applyingCall?.pricingMode === 'fixed';
  const calculatedTotalAmount = applyingCall
    ? isFixedPricing
      ? applyingCall.finalFixedFee || 0
      : Math.round((applyingCall.finalPricePerSqm || 0) * spaceRequested)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in pb-16">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in">
          <div className="bg-[#2D1F23] text-white px-4.5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1317] via-[#2D1F23] to-[#3D252C] border border-[#63474D]/30 p-6 sm:p-10 lg:p-12 text-white shadow-xl space-y-6">
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#FFA686]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#AA767C]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-[#FFD0C2] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#FFA686]" />
            <span>Curated Exhibitor Opportunities</span>
          </div>

          <h1 className="font-serif font-black text-2xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-tight">
            Discover Exhibitor Calls &amp;{' '}
            <span className="bg-gradient-to-r from-[#FFA686] via-[#FFD0C2] to-white bg-clip-text text-transparent">
              Book Prime Booths
            </span>
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-gray-200/90 leading-relaxed font-normal">
            Showcase your brand, launch cutting-edge products, and connect with high-intent event audiences. Explore active exhibitor calls, review transparent booth terms, and apply with zero upfront payment until confirmed.
          </p>

          {/* Micro value badges */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Upfront Fee to Apply</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300 backdrop-blur-xs">
              <Building2 className="w-3.5 h-3.5 text-[#FFA686]" />
              <span>Verified Event Organizers</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300 backdrop-blur-xs">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Fast Application Review</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col sm:flex-row gap-2.5 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by event title, venue location, or exhibitor specs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFA686] focus:border-transparent transition-all shadow-inner"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="shrink-0 bg-gradient-to-r from-[#FFA686] to-[#ffb69b] hover:from-[#ff9c78] hover:to-[#ffa686] text-[#2D1F23] font-bold shadow-md shadow-[#FFA686]/20 rounded-2xl px-6 py-3 text-xs sm:text-sm transition-all"
          >
            Search Opportunities
          </Button>
          {(search || selectedCategory !== 'all') && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClearFilters}
              className="shrink-0 text-white border-white/30 hover:bg-white/10 rounded-2xl px-4 py-3 text-xs transition-all"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
          )}
        </form>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {['all', 'Tech', 'Workshop', 'Hackathon', 'Meetup', 'Conference'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer capitalize ${
              selectedCategory === cat
                ? 'bg-[#63474D] text-white shadow-sm ring-2 ring-[#63474D]/20'
                : 'bg-white border border-[#E8DDD7] text-gray-600 hover:bg-gray-50 hover:text-[#63474D]'
            }`}
          >
            {cat === 'all' ? 'All Categories' : cat}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Checking open exhibitor opportunities...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white border border-red-200 rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto shadow-xs">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-base text-[#2D1F23]">Failed to Load Opportunities</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{error}</p>
          </div>
          <Button variant="primary" size="sm" onClick={fetchCalls} icon={<RotateCcw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && calls.length === 0 && (
        <div className="bg-white border border-dashed border-[#E8DDD7] rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 bg-[#FAF7F5] rounded-3xl flex items-center justify-center mx-auto text-[#63474D]">
            <Store className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif font-bold text-lg text-[#2D1F23]">No Eligible Exhibitor Calls Open</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              There are currently no events accepting exhibitor applications matching your criteria. Either calls have reached full booth capacity, deadlines have passed, or none are open in this category.
            </p>
          </div>
          {(search || selectedCategory !== 'all') && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Search &amp; Filters
            </Button>
          )}
        </div>
      )}

      {/* Event Cards Grid */}
      {!loading && !error && calls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {calls.map((c) => {
            const isFixed = c.pricingMode === 'fixed';
            const hasDeadline = Boolean(c.applicationDeadline);
            const remainingSlots = Math.max(0, (c.maxExhibitors || 10) - (c.confirmedVendorsCount || 0));
            const userBooth = user ? myBooths.find((b) => b.eventId === c.eventId) : null;

            return (
              <div
                key={c.id}
                className="bg-white border border-[#E8DDD7] rounded-3xl overflow-hidden shadow-xs flex flex-col hover:shadow-md transition-all group"
              >
                {/* Event Image Banner */}
                <div className="h-44 bg-[#FAF7F5] relative overflow-hidden border-b border-gray-100 flex items-center justify-center">
                  {c.bannerUrl ? (
                    <img
                      src={c.bannerUrl}
                      alt={c.eventTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Store className="w-12 h-12 text-gray-300" />
                  )}
                  {/* Status Badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {userBooth ? (
                      userBooth.status === 'confirmed' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3" /> Confirmed
                        </span>
                      ) : userBooth.status === 'accepted_awaiting_payment' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xs flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> Payment Required
                        </span>
                      ) : userBooth.status === 'pending' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white shadow-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Under Review
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-xs">
                          Declined
                        </span>
                      )
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                        Call Open
                      </span>
                    )}
                  </div>
                  {/* Pricing Mode Badge */}
                  <div className="absolute bottom-3 left-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs ${
                        isFixed
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {isFixed ? 'Fixed Fee' : 'Per m² Pricing'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                      <span className="text-[#63474D] truncate max-w-[180px]">{c.eventCategory || 'Tech Event'}</span>
                      <span className="truncate max-w-[120px]">{c.organizerOrganization}</span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-[#2D1F23] line-clamp-1 group-hover:text-[#63474D] transition-colors">
                      {c.eventTitle}
                    </h3>

                    {/* Logistics */}
                    <div className="space-y-1.5 text-xs text-gray-600 pt-0.5">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          {new Date(c.eventDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {c.venueName ? `${c.venueName}, ` : ''}
                          {c.eventLocation}
                        </span>
                      </p>
                    </div>

                    {/* Description excerpt */}
                    {(c.spaceDescription || c.eventDescription) && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed pt-1">
                        {c.spaceDescription || c.eventDescription}
                      </p>
                    )}

                    {/* Pricing Breakdown Box */}
                    <div className="p-3.5 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-2 mt-2">
                      {isFixed ? (
                        <>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-500 font-medium">Fixed Exhibitor Fee:</span>
                            <strong className="text-emerald-700 font-serif text-base">
                              {(c.finalFixedFee || 0).toLocaleString()} ETB
                            </strong>
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center justify-between">
                            <span>Flat rate per booth</span>
                            <span>{remainingSlots} of {c.maxExhibitors || 10} slots left</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-500 font-medium">Rate per m²:</span>
                            <strong className="text-emerald-700 font-serif text-base">
                              {(c.finalPricePerSqm || 0).toLocaleString()} ETB
                            </strong>
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center justify-between">
                            <span>Available Floor Space:</span>
                            <strong className="text-[#2D1F23]">
                              {c.spaceRemaining} m² remaining
                            </strong>
                          </div>
                        </>
                      )}

                      {/* Application Deadline */}
                      {hasDeadline && (
                        <div className="pt-2 border-t border-gray-200/60 flex items-center gap-1 text-[11px] text-amber-800 font-medium">
                          <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>
                            Deadline: {new Date(c.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {c.specifications && (
                      <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-start gap-1.5">
                        <Info className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2"><strong>Specs:</strong> {c.specifications}</span>
                      </div>
                    )}

                    {/* Personal Application Status Banner if applied */}
                    {userBooth && (
                      <div className="pt-2">
                        {userBooth.status === 'accepted_awaiting_payment' ? (
                          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                              <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>Application approved — payment required</span>
                            </div>
                            <p className="text-[11px] text-indigo-800 leading-relaxed">
                              Your booth space ({userBooth.spaceSqm} m²) has been approved. Total amount due:{' '}
                              <strong>{(userBooth.totalFinalAmount || 0).toLocaleString()} ETB</strong>. Please submit payment and your receipt to confirm your booth.
                            </p>
                          </div>
                        ) : userBooth.status === 'pending' ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Application Under Organizer Review</span>
                            </div>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              You have applied for {userBooth.spaceSqm} m². The organizer must review your application. Your booth is not confirmed and no payment is due now.
                            </p>
                          </div>
                        ) : userBooth.status === 'confirmed' ? (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Booth confirmed</span>
                            </div>
                            <p className="text-[11px] text-emerald-800 leading-relaxed">
                              Your booth is confirmed and active. Booth #{userBooth.boothNumber || 'Assigned'} • {userBooth.spaceSqm} m².
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-red-900">
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                              <span>Application Declined</span>
                            </div>
                            <p className="text-[11px] text-red-800 leading-relaxed">
                              {userBooth.rejectionReason
                                ? `Reason: ${userBooth.rejectionReason}`
                                : 'Your application for this event was not approved by the organizer.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Button & Bookings */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] text-gray-400 font-medium truncate"
                      title="Total confirmed exhibitors across this event"
                    >
                      {c.confirmedVendorsCount || 0} total event exhibitor(s)
                    </span>

                    {userBooth ? (
                      userBooth.status === 'accepted_awaiting_payment' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/exhibitor/booths?payBoothId=${userBooth.id}`)}
                          icon={<CreditCard className="w-3.5 h-3.5" />}
                          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                          Continue to Payment
                        </Button>
                      ) : userBooth.status === 'confirmed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/exhibitor/booths')}
                          icon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
                          className="shrink-0 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                        >
                          View Confirmed Booth
                        </Button>
                      ) : userBooth.status === 'pending' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/exhibitor/booths')}
                          icon={<Clock className="w-3.5 h-3.5 text-amber-600" />}
                          className="shrink-0 text-amber-800 border-amber-300 hover:bg-amber-50"
                        >
                          View in My Booths
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/exhibitor/booths')}
                          className="shrink-0 text-gray-600 border-gray-300"
                        >
                          View in My Booths
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenApplyModal(c)}
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                        className="shrink-0"
                      >
                        Apply for Booth
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unauthenticated Login / Register Prompt Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setShowAuthModal(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFA686]/20 text-[#63474D] flex items-center justify-center mx-auto">
              <Store className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                Exhibitor Sign In Required
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                To submit a booth application for <strong className="text-[#2D1F23]">&ldquo;{showAuthModal.eventTitle}&rdquo;</strong>, please sign in or register with an Exhibitor account.
              </p>
              <div className="p-3 bg-[#FAF7F5] rounded-xl text-[11px] text-[#2D1F23]/80 border border-[#E8DDD7] text-left flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Browsing opportunities is always free. Registering lets you manage your booth showcase profile, track application review, and log visitors.
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAuthModal(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Keep Browsing
              </button>
              <Button
                variant="primary"
                size="sm"
                className="w-full py-2.5 font-bold"
                onClick={() =>
                  navigate('/exhibitor/auth', {
                    state: { returnTo: location.pathname, eventId: showAuthModal.eventId },
                  })
                }
                icon={<LogIn className="w-3.5 h-3.5" />}
              >
                Sign In / Register
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Authenticated Apply for Booth Modal */}
      {applyingCall && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmitting && setApplyingCall(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Booth Application
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  {applyingCall.eventTitle}
                </h3>
                <p className="text-xs text-gray-500">
                  {isFixedPricing
                    ? `Fixed Fee: ${applyingCall.finalFixedFee.toLocaleString()} ETB (all-inclusive flat rate)`
                    : `Rate: ${applyingCall.finalPricePerSqm.toLocaleString()} ETB / m² (Sheeba platform fee included)`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyingCall(null)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Business / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+251 91 123 4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Requested Floor Space (m²) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={applyingCall.spaceRemaining || 100}
                    step={0.5}
                    required
                    value={spaceRequested}
                    onChange={(e) => setSpaceRequested(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              {/* Real-time Pricing Summary */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800">
                  {isFixedPricing ? 'Fixed Exhibitor Fee' : 'Calculated Price'}
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-emerald-900 font-medium">
                    {isFixedPricing
                      ? 'Flat Rate per Booth'
                      : `${spaceRequested} m² × ${applyingCall.finalPricePerSqm.toLocaleString()} ETB`}
                  </span>
                  <span className="font-serif font-extrabold text-lg text-emerald-950">
                    {calculatedTotalAmount.toLocaleString()} ETB
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700">
                  Zero upfront payment. Payment is only requested after the organizer reviews and accepts your application.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  What will you be showcasing at your booth? *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe your product demo, hardware, software, or promotional materials..."
                  value={showcaseDescription}
                  onChange={(e) => setShowcaseDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Special Requirements or Specifications (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 220V power outlets, corner booth preference, table setup..."
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
              </div>

              {/* Custom Questions configured by Organizer */}
              {applyingCall.customQuestions && applyingCall.customQuestions.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
                  <span className="text-xs font-bold text-[#2D1F23] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#63474D]" />
                    Organizer Application Questions
                  </span>

                  {applyingCall.customQuestions.map((q: RegistrationQuestion) => {
                    const isReq = q.isRequired ?? (q as any).required;
                    const qText = q.questionText || (q as any).question || 'Question';
                    const isSelect = q.type === 'select' || q.type === 'dropdown' || q.type === 'choice';

                    return (
                      <div key={q.id} className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-700">
                          {qText} {isReq && <span className="text-red-500">*</span>}
                        </label>
                        {isSelect ? (
                          <select
                            required={isReq}
                            value={questionAnswers[q.id] || ''}
                            onChange={(e) =>
                              setQuestionAnswers({ ...questionAnswers, [q.id]: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                          >
                            <option value="">Select an option...</option>
                            {q.options?.map((opt: string) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={q.type || 'text'}
                            required={isReq}
                            value={questionAnswers[q.id] || ''}
                            onChange={(e) =>
                              setQuestionAnswers({ ...questionAnswers, [q.id]: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApplyingCall(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  variant="primary"
                  size="sm"
                  icon={<Check className="w-3.5 h-3.5" />}
                >
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Submitted Confirmation Modal */}
      {submittedAppSummary && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setSubmittedAppSummary(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                Application Received
              </span>
              <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                Application Submitted Successfully!
              </h3>
              <p className="text-xs text-gray-500">
                for <strong className="text-[#2D1F23]">{submittedAppSummary.eventTitle}</strong>
              </p>
            </div>

            {/* Crucial Context Box */}
            <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-left space-y-2 text-xs text-amber-950">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Status: Under Organizer Review</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                The event organizer will review your business profile, requested floor space ({submittedAppSummary.spaceRequested} m²), showcase pitch, and custom answers.
              </p>
              <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-normal font-medium">
                <strong>Important:</strong> Your booth space is <u>not confirmed yet</u>, and <strong>no payment is due at this time</strong>.
              </div>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed text-left">
              Once the organizer approves your application, your status will update to <strong>Application approved — payment required</strong>, and you will be provided with offline payment instructions and receipt submission.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSubmittedAppSummary(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Browse More Events
              </button>
              <Button
                variant="primary"
                size="sm"
                className="w-full py-2.5 font-bold"
                onClick={() => {
                  setSubmittedAppSummary(null);
                  navigate('/exhibitor/booths');
                }}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Go to My Booths
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
