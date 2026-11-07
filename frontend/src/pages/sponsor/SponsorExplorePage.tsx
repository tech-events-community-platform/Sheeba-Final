import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Building2,
  ChevronRight,
  Compass,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { ISponsorshipApplication } from '../../types/sponsorship';
import { sponsorExploreFilterSchema, validateForm } from '../../schemas';

const CATEGORIES = [
  'All Categories',
  'Technology & AI',
  'Finance & Fintech',
  'Startup & Entrepreneurship',
  'Creative & Media',
  'Education & Youth',
  'Health & Wellness',
  'Cultural & Arts',
];

export const SponsorExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = (user?.role as string)?.toUpperCase() === 'ADMIN';

  const [allApplications, setAllApplications] = useState<ISponsorshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Admin take-down state
  const [pitchToTakeDown, setPitchToTakeDown] = useState<ISponsorshipApplication | null>(null);
  const [takingDown, setTakingDown] = useState(false);

  const loadApplications = async (query = searchQuery, isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: any = {};
      if (query.trim()) params.search = query.trim();
      if (isManualRefresh) {
        params.refresh = true;
        params.skipCache = true;
      }

      const validation = validateForm(sponsorExploreFilterSchema, { search: params.search });
      if (!validation.success) {
        console.warn('Invalid explore filter params:', validation.errors);
        return;
      }

      const data = await api.sponsorship.exploreApplications(params);
      setAllApplications(data || []);
      if (isManualRefresh) {
        setFeedbackMessage('Marketplace refreshed with latest proposals.');
        setTimeout(() => setFeedbackMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to load marketplace applications', err);
      setAllApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadApplications(searchQuery);
  };

  const handleConfirmTakeDown = async () => {
    if (!pitchToTakeDown) return;
    try {
      setTakingDown(true);
      await api.admin.takeDownSponsorshipPitch(pitchToTakeDown.id);
      setAllApplications((prev) => prev.filter((p) => p.id !== pitchToTakeDown.id));
      setFeedbackMessage(`Sponsorship pitch "${pitchToTakeDown.event_title}" was successfully taken down.`);
      setPitchToTakeDown(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to take down sponsorship pitch.');
    } finally {
      setTakingDown(false);
    }
  };

  // Compute how many applications match each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All Categories': allApplications.length,
    };
    CATEGORIES.forEach((cat) => {
      if (cat !== 'All Categories') {
        counts[cat] = allApplications.filter(
          (app) => app.category?.trim().toLowerCase() === cat.trim().toLowerCase()
        ).length;
      }
    });
    return counts;
  }, [allApplications]);

  // Display applications based on selected category
  const displayedApplications = useMemo(() => {
    if (selectedCategory === 'All Categories') return allApplications;
    return allApplications.filter(
      (app) => app.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    );
  }, [allApplications, selectedCategory]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#4A3238] to-[#63474D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[#FFA686]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top-right Refresh button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            type="button"
            disabled={refreshing || loading}
            onClick={() => loadApplications(searchQuery, true)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            title="Refresh marketplace pitches"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="relative z-10 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
            Discover Upcoming Events Seeking Backing
          </h1>
          <p className="text-white/80 text-sm sm:text-base mt-2 leading-relaxed">
            Browse proposed and upcoming events from trusted organizers across Ethiopia. Support initiatives aligned with your brand, review comprehensive pitch concepts, and reach out directly to coordinate.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by event title, location, or audience..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/15 backdrop-blur-md text-white placeholder-white/60 text-sm rounded-xl border border-white/20 focus:outline-none focus:bg-white/25 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-[#FFA686] hover:bg-[#ff956e] text-[#2D1F23] font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer shrink-0"
            >
              Search Pitches
            </button>
          </form>
        </div>
      </div>

      {/* Category Pills: Disabled when 0 applications match */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat] || 0;
          const isEnabled = cat === 'All Categories' || count > 0;
          const isSelected = selectedCategory === cat;

          if (isEnabled) {
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#63474D] text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-stone-100 border border-gray-200'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={cat}
              type="button"
              disabled={true}
              title="No active event pitches currently match this category"
              className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-stone-100/70 text-stone-400 border border-stone-200/60 opacity-50 cursor-not-allowed flex items-center gap-1.5 select-none"
            >
              <span>{cat}</span>
              <span className="text-[10px] opacity-60">0</span>
            </button>
          );
        })}
      </div>

      {/* Applications List: Structured as Rows */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <div className="animate-spin w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Loading sponsorship opportunities...</p>
        </div>
      ) : displayedApplications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-300 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-gray-400 flex items-center justify-center mx-auto mb-2">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-lg font-bold text-gray-900">No events found in this view</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {selectedCategory !== 'All Categories'
              ? `There are currently no proposals under "${selectedCategory}".`
              : 'No event applications found matching your query.'}
          </p>
          {selectedCategory !== 'All Categories' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('All Categories')}
              className="px-4 py-2 bg-[#63474D] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#523a3f] cursor-pointer"
            >
              View All Categories
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedApplications.map((app) => (
            <div
              key={app.id}
              onClick={() => navigate(`/sponsor/applications/${app.id}`)}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:border-[#63474D] hover:shadow-xs transition-all overflow-hidden flex flex-row items-stretch cursor-pointer group min-h-[128px]"
            >
              {/* Left Cover Image Container */}
              <div className="w-28 sm:w-36 shrink-0 overflow-hidden bg-stone-100 border-r border-gray-200/80 relative">
                <img
                  src="/coming-soon.webp"
                  loading="lazy"
                  alt={app.event_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Rest of the Row */}
              <div className="flex-1 px-3.5 sm:px-4 py-2.5 flex flex-col justify-between min-w-0">
                {/* Top Line: Title + Funding Goal & Arrow */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif font-bold text-sm sm:text-base text-[#2D1F23] group-hover:text-[#63474D] transition-colors truncate">
                      {app.event_title}
                    </h3>
                    <p className="text-[11px] text-[#756366] flex items-center gap-1.5 truncate">
                      <Building2 className="w-3 h-3 text-[#AA767C] shrink-0" />
                      <span>
                        By <strong className="text-gray-800 font-semibold">{app.organizer_organization || app.organizer_name}</strong>
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-500 font-mono text-[10px] uppercase">{app.event_type}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block leading-none">Goal</span>
                      <span className="font-serif font-bold text-sm sm:text-base text-[#63474D]">
                        {app.funding_goal.toLocaleString()} {app.currency}
                      </span>
                    </div>

                    {/* Admin Take-down button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPitchToTakeDown(app);
                        }}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                        title="Admin: Take down pitch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="hidden sm:flex items-center text-[#AA767C] group-hover:text-[#63474D] group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Middle: Category Pill + Social Proof Badges + Description */}
                <div className="flex items-center gap-1.5 min-w-0 py-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/30 shrink-0">
                    {app.category}
                  </span>
                  {app.affiliations?.past_sponsors && app.affiliations.past_sponsors.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shrink-0 flex items-center gap-1">
                      <img src="/sponsor-icon.webp" alt="Sponsor" className="w-3 h-3 object-contain shrink-0" />
                      <span>Proven Backers</span>
                    </span>
                  )}
                  {app.affiliations?.speakers && app.affiliations.speakers.length > 0 && (
                    <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#63474D]/10 text-[#63474D] border border-[#63474D]/20 shrink-0 items-center gap-1">
                      <img src="/speaker-icon.webp" alt="Speaker" className="w-3 h-3 object-contain shrink-0" />
                      <span>{app.affiliations.speakers.length} Speaker{app.affiliations.speakers.length > 1 ? 's' : ''}</span>
                    </span>
                  )}
                  <p className="text-xs text-[#523e43] truncate font-normal">
                    {app.description}
                  </p>
                </div>

                {/* Bottom Bar: Date, Location, Expected Attendees, and Action */}
                <div className="flex items-center justify-between gap-x-3 text-[11px] text-[#756366] pt-1.5 border-t border-gray-100">
                  <div className="flex items-center gap-x-3 gap-y-1 truncate">
                    <span className="flex items-center gap-1 font-medium shrink-0">
                      <img src="/calendar.webp" alt="Calendar" className="w-3 h-3 object-contain shrink-0" />
                      <span>{app.expected_date}</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium truncate max-w-[160px] sm:max-w-[220px]">
                      <img src="/location.webp" alt="Location" className="w-3 h-3 object-contain shrink-0" />
                      <span className="truncate">{app.location}</span>
                    </span>
                    <span className="hidden sm:flex items-center gap-1 font-medium shrink-0">
                      <Users className="w-3 h-3 text-[#AA767C] shrink-0" />
                      <span>{app.expected_attendees.toLocaleString()} guests</span>
                    </span>
                  </div>

                  <div className="text-[#63474D] font-bold text-xs flex items-center gap-0.5 shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform">
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Take-down Modal */}
      {pitchToTakeDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-gray-900">Take Down Sponsorship Pitch</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                As an admin, are you sure you want to take down <strong className="text-gray-900">"{pitchToTakeDown.event_title}"</strong>?
              </p>
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                This pitch will be immediately closed and removed from the marketplace for all users.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={takingDown}
                onClick={() => setPitchToTakeDown(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={takingDown}
                onClick={handleConfirmTakeDown}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {takingDown ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Taking down...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Take Down Pitch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
