import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Building2,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ISponsorshipApplication } from '../../types/sponsorship';

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

  const [allApplications, setAllApplications] = useState<ISponsorshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  const loadApplications = async (query = searchQuery) => {
    try {
      setLoading(true);
      const params: any = {};
      if (query.trim()) params.search = query.trim();

      const data = await api.sponsorship.exploreApplications(params);
      setAllApplications(data || []);
    } catch (err: any) {
      console.error('Failed to load marketplace applications', err);
      setAllApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadApplications(searchQuery);
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
      {/* Hero Banner (Tag removed per user request) */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#4A3238] to-[#63474D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[#FFA686]/10 rounded-full blur-3xl pointer-events-none" />
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

      {/* Applications List: Structured as Rows (Like Organizer Dashboard, Fatter & Longer Vertically) */}
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
              className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:border-[#63474D] hover:shadow-xs transition-all overflow-hidden flex flex-row items-stretch cursor-pointer group h-32 sm:h-32"
            >
              {/* Left Cover Image Container with coming-soon.webp (Flush Slot) */}
              <div className="w-28 sm:w-36 h-full shrink-0 overflow-hidden bg-stone-100 border-r border-gray-200/80 relative">
                <img
                  src="/coming-soon.webp"
                  loading="lazy"
                  alt={app.event_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Rest of the Row (Sleek, a few px taller than organizer's h-28) */}
              <div className="flex-1 px-3.5 sm:px-4 py-2 sm:py-2.5 flex flex-col justify-between min-w-0">
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

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block leading-none">Goal</span>
                      <span className="font-serif font-bold text-sm sm:text-base text-[#63474D]">
                        {app.funding_goal.toLocaleString()} {app.currency}
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center text-[#AA767C] group-hover:text-[#63474D] group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Middle: Category Pill + Description */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/30 shrink-0">
                    {app.category}
                  </span>
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
    </div>
  );
};
