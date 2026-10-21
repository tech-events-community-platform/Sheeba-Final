import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  Users,
  Calendar,
  MapPin,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Target,
  Briefcase,
  Lightbulb,
} from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type {
  ScoredEventRecommendation,
  SponsorPreferences,
  SponsorRecommendationsResponse,
} from '../../types/matching';

const AVAILABLE_OBJECTIVES = [
  { id: 'talent_recruitment', label: 'Technical Talent Recruitment', icon: Users },
  { id: 'startup_discovery', label: 'Startup & Innovation Discovery', icon: Lightbulb },
  { id: 'brand_awareness', label: 'Brand Visibility & Exposure', icon: TrendingUp },
  { id: 'community_impact', label: 'Community Development & CSR', icon: Briefcase },
];

const COMMON_INTERESTS = [
  'Technology & AI',
  'Software Engineering',
  'Cloud Infrastructure',
  'Fintech & Financial Services',
  'Startup & Entrepreneurship',
  'Education & Youth Skills',
  'Creative & Media',
  'Health & Wellness',
];

const COMMON_SKILLS = [
  'Software Engineer',
  'AI / Machine Learning',
  'TypeScript',
  'Python',
  'DevOps',
  'Frontend Developer',
  'Founder / Entrepreneur',
  'UI/UX Designer',
  'Data Analyst',
  'Student / Graduate',
];

const EVENT_TYPES = ['hackathon', 'workshop', 'meetup', 'summit'];

export const SponsorRecommendationsSection: React.FC = () => {
  const [recommendations, setRecommendations] = useState<ScoredEventRecommendation[]>([]);
  const [preferences, setPreferences] = useState<SponsorPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Preference tuning modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [tuningPrefs, setTuningPrefs] = useState<SponsorPreferences>({
    targetInterests: [],
    targetSkills: [],
    sponsorshipObjectives: ['talent_recruitment'],
    preferredEventTypes: [],
    preferredLocations: [],
  });

  // Expanded breakdown cards tracking
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});

  // Active quick filter objective
  const [selectedObjectiveFilter, setSelectedObjectiveFilter] = useState<string>('all');

  const fetchRecommendations = async (overrideObjective?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { limit: 10 };
      if (overrideObjective && overrideObjective !== 'all') {
        params.objective = overrideObjective;
      }

      const res: SponsorRecommendationsResponse = await api.sponsorship.getRecommendations(params);
      setRecommendations(res.matches || []);
      if (res.preferences) {
        setPreferences(res.preferences);
        setTuningPrefs(res.preferences);
      }
    } catch (err: any) {
      console.error('Failed to load sponsor recommendations:', err);
      setError(err?.message || 'Unable to generate personalized event recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleObjectiveTabChange = (objId: string) => {
    setSelectedObjectiveFilter(objId);
    fetchRecommendations(objId);
  };

  const toggleBreakdown = (eventId: string) => {
    setExpandedBreakdowns((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPrefs(true);
      const updated = await api.sponsorship.updatePreferences(tuningPrefs);
      setPreferences(updated);
      setIsModalOpen(false);
      await fetchRecommendations(selectedObjectiveFilter);
    } catch (err: any) {
      console.error('Failed to update sponsor preferences:', err);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleArrayItem = (list: string[], item: string): string[] => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with AI Badge & Tune Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAF7F5] to-white p-6 rounded-3xl border border-[#E8DDD7] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#63474D]/10 text-[#63474D] text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#FFA686]" />
              AI Match Intelligence
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-500">
              Personalized for your organization
            </span>
          </div>

          <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">
            Top Recommended Events for Your Brand
          </h2>

          <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
            Algorithmic recommendations powered by verified attendee turnout, registered skillsets, and your corporate sponsorship objectives.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => fetchRecommendations(selectedObjectiveFilter)}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => setIsModalOpen(true)}
          >
            Tune Preferences
          </Button>
        </div>
      </div>

      {/* 2. Objective Quick Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => handleObjectiveTabChange('all')}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 ${
            selectedObjectiveFilter === 'all'
              ? 'bg-[#63474D] text-white shadow-xs'
              : 'bg-white text-gray-600 border border-[#E8DDD7] hover:border-[#63474D]/40'
          }`}
        >
          All Recommendations
        </button>

        {AVAILABLE_OBJECTIVES.map((obj) => {
          const Icon = obj.icon;
          const isActive = selectedObjectiveFilter === obj.id;
          return (
            <button
              key={obj.id}
              onClick={() => handleObjectiveTabChange(obj.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-[#63474D] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-[#E8DDD7] hover:border-[#63474D]/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{obj.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-white border border-[#E8DDD7] shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-gray-200 rounded-full" />
                <div className="h-6 w-20 bg-gray-200 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-gray-200 rounded-md" />
              <div className="h-4 w-1/2 bg-gray-100 rounded-md" />
              <div className="h-16 w-full bg-[#FAF7F5] rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* 4. Error Display */}
      {!loading && error && (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Failed to Load Recommendations</h4>
            <p className="text-xs">{error}</p>
            <button
              onClick={() => fetchRecommendations()}
              className="text-xs underline font-semibold mt-2 hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="bg-white border border-[#E8DDD7] rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
            <Target className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-serif font-bold text-lg text-[#2D1F23]">
              No Matching Events Found
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              We couldn&apos;t find upcoming events matching your exact filters right now. Try broadening your target interests or event types in your preference settings.
            </p>
          </div>
          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              onClick={() => setIsModalOpen(true)}
            >
              Adjust Preferences
            </Button>
          </div>
        </div>
      )}

      {/* 6. Ranked List of Top 10 Events */}
      {!loading && !error && recommendations.length > 0 && (
        <div className="space-y-4">
          {recommendations.map((item, index) => {
            const ev = item.event;
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const isExpanded = Boolean(expandedBreakdowns[ev.id]);

            // Score badge color tone
            const scoreColor =
              item.overallScore >= 80
                ? 'from-[#2A7B5F] to-[#1E5C46] text-white'
                : item.overallScore >= 65
                ? 'from-[#63474D] to-[#453136] text-white'
                : 'from-gray-700 to-gray-800 text-white';

            return (
              <div
                key={ev.id}
                className="bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 shadow-xs hover:border-[#63474D]/40 transition-all duration-200 space-y-4"
              >
                {/* Top Row: Rank & Score */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold font-mono tracking-tight ${
                        rank === 1
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : rank === 2
                          ? 'bg-slate-100 text-slate-800 border border-slate-300'
                          : rank === 3
                          ? 'bg-orange-100 text-orange-900 border border-orange-300'
                          : 'bg-[#FAF7F5] text-[#63474D] border border-[#E8DDD7]'
                      }`}
                    >
                      #{rank} Top Match
                    </span>

                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize font-medium">
                      {ev.category}
                    </span>

                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFA686]/20 text-[#63474D] capitalize font-medium">
                      {ev.eventType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 rounded-full bg-gradient-to-r ${scoreColor} text-xs font-bold tracking-wide shadow-xs flex items-center gap-1.5`}
                    >
                      <Sparkles className="w-3 h-3 text-[#FFA686]" />
                      <span>{item.overallScore}% Match</span>
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="font-serif text-xl font-bold text-[#2D1F23] hover:text-[#63474D] transition-colors">
                    <Link to={`/events/${ev.id}`}>{ev.title}</Link>
                  </h3>
                  {ev.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-light">
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Metrics & Telemetry Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E8DDD7]/60 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-[#63474D] shrink-0" />
                    <span className="truncate">
                      {ev.eventDate ? new Date(ev.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upcoming'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-[#63474D] shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Users className="w-3.5 h-3.5 text-[#63474D] shrink-0" />
                    <span>
                      <strong>{ev.registeredCount}</strong> registered
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#2A7B5F] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {ev.checkedInCount > 0
                        ? `${ev.checkedInCount} verified check-ins`
                        : 'Registration open'}
                    </span>
                  </div>
                </div>

                {/* Evidence & Explanation Box */}
                <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7]/80 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#63474D]/10 text-[#63474D] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-[#FFA686]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#2D1F23]">
                        {item.explanation.primaryReason}
                      </p>
                      <ul className="space-y-1 text-[11px] text-gray-600">
                        {item.explanation.evidence.map((evItem, evIdx) => (
                          <li key={evIdx} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[#63474D] shrink-0" />
                            <span>{evItem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Strengths tags */}
                  {item.explanation.strengths && item.explanation.strengths.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {item.explanation.strengths.map((str, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-[#E8DDD7] text-[10.5px] font-medium text-[#63474D]"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#2A7B5F]" />
                          <span>{str}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score Breakdown Accordion Toggle */}
                <div>
                  <button
                    onClick={() => toggleBreakdown(ev.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-[#63474D] transition-colors"
                  >
                    <span>{isExpanded ? 'Hide Score Breakdown' : 'View Scoring Breakdown'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-fade-in">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                          Semantic Similarity
                        </span>
                        <div className="font-mono font-bold text-gray-800 text-sm mt-0.5">
                          {Math.round(item.scoreBreakdown.semanticRelevance * 100)}%
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-[#63474D] h-full rounded-full"
                            style={{ width: `${item.scoreBreakdown.semanticRelevance * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                          Category Match
                        </span>
                        <div className="font-mono font-bold text-gray-800 text-sm mt-0.5">
                          {Math.round(item.scoreBreakdown.categoryFit * 100)}%
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-[#63474D] h-full rounded-full"
                            style={{ width: `${item.scoreBreakdown.categoryFit * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                          Audience / Skills
                        </span>
                        <div className="font-mono font-bold text-gray-800 text-sm mt-0.5">
                          {Math.round(item.scoreBreakdown.audienceSkillFit * 100)}%
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-[#63474D] h-full rounded-full"
                            style={{ width: `${item.scoreBreakdown.audienceSkillFit * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                          Verified Credibility
                        </span>
                        <div className="font-mono font-bold text-gray-800 text-sm mt-0.5">
                          {Math.round(item.scoreBreakdown.eventCredibility * 100)}%
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-[#2A7B5F] h-full rounded-full"
                            style={{ width: `${item.scoreBreakdown.eventCredibility * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-gray-400">
                    Event ID: <span className="font-mono">{ev.id.slice(0, 8)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to={`/events/${ev.id}`}>
                      <Button size="sm" variant="outline">
                        View Event
                      </Button>
                    </Link>

                    <Link to={`/sponsor/explore?search=${encodeURIComponent(ev.title)}`}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        Explore Sponsorship Deals
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Tune Preferences Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Customize Sponsorship Preferences"
        maxWidth="lg"
      >
        <form onSubmit={handleSavePreferences} className="space-y-5 text-xs">
          <p className="text-gray-500 leading-relaxed font-light">
            Set your target participant demographics, preferred event formats, and core sponsorship objectives. Our AI model will tune your Top 10 recommendations based on these preferences.
          </p>

          {/* Primary Sponsorship Objectives */}
          <div className="space-y-2">
            <label className="font-semibold text-gray-700 block">
              Primary Sponsorship Objectives
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_OBJECTIVES.map((obj) => {
                const Icon = obj.icon;
                const isSelected = tuningPrefs.sponsorshipObjectives.includes(obj.id);
                return (
                  <button
                    type="button"
                    key={obj.id}
                    onClick={() =>
                      setTuningPrefs((prev) => ({
                        ...prev,
                        sponsorshipObjectives: toggleArrayItem(prev.sponsorshipObjectives, obj.id),
                      }))
                    }
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#63474D] bg-[#63474D]/5 text-[#63474D] font-semibold'
                        : 'border-[#E8DDD7] bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-[#FFA686]" />
                    <span className="text-xs leading-snug">{obj.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Interests */}
          <div className="space-y-2">
            <label className="font-semibold text-gray-700 block">
              Target Event Topics & Domains
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_INTERESTS.map((interest) => {
                const isSelected = tuningPrefs.targetInterests.includes(interest);
                return (
                  <button
                    type="button"
                    key={interest}
                    onClick={() =>
                      setTuningPrefs((prev) => ({
                        ...prev,
                        targetInterests: toggleArrayItem(prev.targetInterests, interest),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#63474D] text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-[#E8DDD7] hover:border-gray-400'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Skills */}
          <div className="space-y-2">
            <label className="font-semibold text-gray-700 block">
              Target Attendee Roles & Skillsets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SKILLS.map((skill) => {
                const isSelected = tuningPrefs.targetSkills.includes(skill);
                return (
                  <button
                    type="button"
                    key={skill}
                    onClick={() =>
                      setTuningPrefs((prev) => ({
                        ...prev,
                        targetSkills: toggleArrayItem(prev.targetSkills, skill),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#2A7B5F] text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-[#E8DDD7] hover:border-gray-400'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Event Types */}
          <div className="space-y-2">
            <label className="font-semibold text-gray-700 block">
              Preferred Event Formats
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((type) => {
                const isSelected = (tuningPrefs.preferredEventTypes || []).includes(type);
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() =>
                      setTuningPrefs((prev) => ({
                        ...prev,
                        preferredEventTypes: toggleArrayItem(prev.preferredEventTypes || [], type),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs capitalize font-medium transition-all ${
                      isSelected
                        ? 'bg-[#63474D] text-white'
                        : 'bg-white text-gray-600 border border-[#E8DDD7]'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8DDD7]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingPrefs}
              icon={savingPrefs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
            >
              {savingPrefs ? 'Saving...' : 'Save & Refresh Recommendations'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
