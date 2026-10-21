import React, { useState, useEffect } from 'react';
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
  DollarSign,
  ArrowRight,
  Info,
} from 'lucide-react';

export const ExhibitorExplorePage: React.FC = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Application Modal State
  const [applyingCall, setApplyingCall] = useState<any | null>(null);
  const [spaceRequested, setSpaceRequested] = useState<number>(2);
  const [businessName, setBusinessName] = useState(user?.companyName || user?.name || '');
  const [category, setCategory] = useState(user?.industryCategory || 'Tech');
  const [contactName, setContactName] = useState(user?.name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [showcaseDescription, setShowcaseDescription] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const data = await api.exhibitors.exploreOpenCalls({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: search.trim() || undefined,
      });
      setCalls(data || []);
    } catch (err: any) {
      console.error('Failed to load open exhibitor calls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCalls();
  };

  const handleOpenApplyModal = (call: any) => {
    setApplyingCall(call);
    setSpaceRequested(2);
    setBusinessName(user?.companyName || user?.name || '');
    setContactName(user?.name || '');
    setContactEmail(user?.email || '');
    setContactPhone(user?.phone || '');
    setShowcaseDescription('');
    setSpecialRequirements('');
    setModalError(null);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingCall) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      // Manual vendor addition by exhibitor application
      await api.exhibitors.addManualVendor(applyingCall.eventId, {
        businessName,
        category,
        contactName,
        contactEmail,
        contactPhone,
        showcaseDescription,
        spaceSqm: spaceRequested,
        source: 'manual',
      });

      setSuccessToast(`Application for "${applyingCall.eventTitle}" submitted successfully! Status: Under Review.`);
      setTimeout(() => setSuccessToast(null), 5000);
      setApplyingCall(null);
      fetchCalls();
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit exhibitor application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedTotalAmount = applyingCall
    ? Math.round(applyingCall.finalPricePerSqm * spaceRequested)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
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
      <div className="bg-gradient-to-br from-[#2D1F23] to-[#4A3238] rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-xs">
            <Compass className="w-3.5 h-3.5 text-[#FFA686]" />
            <span>Exhibitors & Vendors Marketplace</span>
          </div>
          <h1 className="font-serif font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white">
            Discover Events & Book Physical Booth Space
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Showcase your products, services, and software at top events in Ethiopia. Discover events calling for exhibitors, apply for floor space, and connect with thousands of active attendees.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col sm:flex-row gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by event title, city venue, or specifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFA686]"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" className="shrink-0 bg-[#FFA686] text-black hover:bg-[#ffb69b]">
            Search Events
          </Button>
        </form>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {['all', 'Tech', 'Workshop', 'Hackathon', 'Meetup', 'Conference'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer capitalize ${
              selectedCategory === cat
                ? 'bg-[#63474D] text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat === 'all' ? 'All Categories' : cat}
          </button>
        ))}
      </div>

      {/* Event Cards Grid */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-7 h-7 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Loading open exhibitor calls...</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-[#FAF7F5] rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#2D1F23]">No open exhibitor calls found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            No events currently have an active, open call for exhibitors matching your search. Organizers open calls regularly—check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {calls.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-[#E8DDD7] rounded-3xl overflow-hidden shadow-2xs flex flex-col hover:shadow-md transition-all group"
            >
              {/* Event Image Banner */}
              <div className="h-40 bg-[#FAF7F5] relative overflow-hidden border-b border-gray-100 flex items-center justify-center">
                {c.bannerUrl ? (
                  <img
                    src={c.bannerUrl}
                    alt={c.eventTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Store className="w-10 h-10 text-gray-300" />
                )}
                <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                  Call Open
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
                    {c.eventCategory || 'Tech Event'} • {c.organizerOrganization}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-[#2D1F23] line-clamp-1 group-hover:text-[#63474D] transition-colors">
                    {c.eventTitle}
                  </h3>

                  {/* Logistics */}
                  <div className="space-y-1 text-xs text-gray-600 pt-1">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{new Date(c.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{c.venueName ? `${c.venueName}, ` : ''}{c.eventLocation}</span>
                    </p>
                  </div>

                  {/* Booth Space & Pricing Breakdown */}
                  <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-gray-100 space-y-1.5 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Booth Space:</span>
                      <strong className="text-[#2D1F23]">{c.spaceRemaining} m² remaining</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Price per m²:</span>
                      <strong className="text-emerald-700 font-serif text-sm">
                        {c.finalPricePerSqm.toLocaleString()} ETB
                      </strong>
                    </div>
                  </div>

                  {c.specifications && (
                    <p className="text-[11px] text-gray-500 line-clamp-2 pt-1">
                      <strong>Specs:</strong> {c.specifications}
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">
                    {c.confirmedVendorsCount} booth(s) booked
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenApplyModal(c)}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Apply for Booth
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply for Booth Modal */}
      {applyingCall && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmitting && setApplyingCall(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Booth Application
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  {applyingCall.eventTitle}
                </h3>
                <p className="text-xs text-gray-500">
                  Rate: {applyingCall.finalPricePerSqm.toLocaleString()} ETB / m² (Sheeba service fee included)
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
                <span className="text-[10px] uppercase font-bold text-emerald-800">Calculated Booth Price</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-emerald-900 font-medium">
                    {spaceRequested} m² × {applyingCall.finalPricePerSqm.toLocaleString()} ETB
                  </span>
                  <span className="font-serif font-extrabold text-lg text-emerald-950">
                    {calculatedTotalAmount.toLocaleString()} ETB
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700">
                  Payment will only be requested after the organizer approves your booth application.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  What will you be showcasing at your booth? *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe the products, services, or demos you plan to display..."
                  value={showcaseDescription}
                  onChange={(e) => setShowcaseDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
              </div>

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
    </div>
  );
};

