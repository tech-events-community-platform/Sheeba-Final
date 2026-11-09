import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { SponsorPreferences } from '../../types/matching';
import {
  Building2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Phone,
  DollarSign,
  MapPin,
  Tag,
  Target,
  Layers,
  Award,
  Image,
  Plus,
  X,
  FileText,
  Upload,
  Loader2,
  Users,
} from 'lucide-react';
import { uploadToCloudinary } from '../../utils/cloudinary';

const INDUSTRY_CATEGORIES = [
  'Technology',
  'Finance & Banking',
  'Telecom',
  'Healthcare',
  'Education',
  'Consumer Goods',
  'Media & Entertainment',
  'Energy & Infrastructure',
  'Agriculture',
  'Entrepreneurship',
];

const OBJECTIVES_OPTIONS = [
  'Brand awareness',
  'Talent recruitment',
  'Startup discovery',
  'Community impact',
  'Product promotion',
  'Networking and partnerships',
];

const AUDIENCE_OPTIONS = [
  'University students',
  'Software developers',
  'Entrepreneurs and startup founders',
  'Researchers',
  'Technology professionals',
  'Business owners',
];

const CATEGORIES_OPTIONS = [
  'Hackathons',
  'Workshops',
  'Tech conferences',
  'Career fairs',
  'Startup competitions',
  'Training programs',
  'Innovation events',
];

const PREDEFINED_SKILLS = [
  'AI',
  'Software engineering',
  'Python',
  'Cloud computing',
  'Cybersecurity',
  'Data science',
  'Entrepreneurship',
];

const LOCATION_OPTIONS = [
  'Addis Ababa',
  'Hawassa',
  'Bahir Dar',
  'Dire Dawa',
  'Adama',
  'Remote / Virtual',
];

const BENEFITS_OPTIONS = [
  'Keynote speaking slot',
  'Prime exhibition booth',
  'Logo on banners & badges',
  'Resume & attendee database access',
  'Social media shoutouts',
  'Workshop hosting rights',
];

export const SponsorSettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industryCategory, setIndustryCategory] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoUploadError('Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Logo file size must not exceed 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);
    try {
      const url = await uploadToCloudinary(file, { folder: 'sheeba_sponsor_logos' });
      setCompanyLogo(url);
    } catch (err: any) {
      setLogoUploadError(err.message || 'Failed to upload company logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [maxBudget, setMaxBudget] = useState<string>('');

  const [objectives, setObjectives] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [skillsAndInterests, setSkillsAndInterests] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [preferredBenefits, setPreferredBenefits] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Custom skill input
  const [customSkillInput, setCustomSkillInput] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await api.sponsorship.getPreferences();

      setFullName((data as any).fullName || user?.name || '');
      setCompanyName(data.companyName || user?.companyName || user?.organization || '');
      setIndustryCategory(data.industryCategory || user?.industryCategory || 'Technology');
      setCompanyDescription(data.bio || user?.bio || '');
      const cleanAvatar = (data.avatarUrl && !data.avatarUrl.includes('ui-avatars.com')) 
        ? data.avatarUrl 
        : ((user?.avatarUrl && !user.avatarUrl.includes('ui-avatars.com')) ? user.avatarUrl : '');
      setCompanyLogo(cleanAvatar || '');
      setCompanyWebsite(data.companyWebsite || user?.companyWebsite || '');
      setCompanyPhone(data.companyPhone || user?.companyPhone || user?.phone || '');

      const prefs: Partial<SponsorPreferences> = data.preferences || {};
      setObjectives(prefs.sponsorshipObjectives || []);
      setTargetAudience(prefs.targetAudience || []);
      setPreferredCategories(prefs.preferredEventCategories || prefs.preferredEventTypes || []);
      setSkillsAndInterests(prefs.targetSkills || prefs.targetInterests || []);
      setPreferredLocations(prefs.preferredLocations || []);
      setMaxBudget(prefs.maxBudget !== undefined && prefs.maxBudget !== null ? String(prefs.maxBudget) : '');
      setPreferredBenefits(prefs.preferredBenefits || []);
      setAdditionalNotes(
        prefs.additionalPreferences?.notes ||
        prefs.additionalPreferences?.criteria ||
        ''
      );
    } catch (err: any) {
      console.error('Failed to load sponsor preferences', err);
      setErrorMessage(err.message || 'Failed to load sponsor preferences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const toggleArrayItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (trimmed && !skillsAndInterests.includes(trimmed)) {
      setSkillsAndInterests([...skillsAndInterests, trimmed]);
      setCustomSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsAndInterests(skillsAndInterests.filter((s) => s !== skill));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validate Logo URL if provided
    if (companyLogo && companyLogo.trim()) {
      try {
        new URL(companyLogo.trim());
      } catch {
        setErrorMessage('Company logo must be a valid URL (e.g. https://example.com/logo.png).');
        setSaving(false);
        return;
      }
    }

    // Validate Website URL if provided
    if (companyWebsite && companyWebsite.trim()) {
      try {
        new URL(companyWebsite.trim().startsWith('http') ? companyWebsite.trim() : `https://${companyWebsite.trim()}`);
      } catch {
        setErrorMessage('Company website must be a valid URL.');
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        fullName: fullName.trim() || undefined,
        companyName: companyName.trim() || undefined,
        industryCategory: industryCategory.trim() || undefined,
        companyDescription: companyDescription.trim(),
        companyLogo: companyLogo.trim() || null,
        companyWebsite: companyWebsite.trim() || null,
        companyPhone: companyPhone.trim() || null,
        sponsorshipObjectives: objectives,
        targetAudience,
        preferredEventCategories: preferredCategories,
        targetSkills: skillsAndInterests,
        targetInterests: Array.from(new Set([...skillsAndInterests, ...preferredCategories, industryCategory].filter(Boolean))),
        preferredLocations,
        maxBudget: maxBudget ? parseFloat(maxBudget) : null,
        preferredBenefits,
        additionalPreferences: additionalNotes.trim() ? { notes: additionalNotes.trim() } : {},
      };

      await api.sponsorship.updatePreferences(payload);

      if (refreshUser) {
        await refreshUser();
      }

      setSuccessMessage('Sponsor settings and AI matching preferences updated successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to update sponsor preferences', err);
      setErrorMessage(err.message || 'Failed to update sponsor preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500 bg-white rounded-3xl border border-gray-100 max-w-4xl mx-auto">
        <div className="animate-spin w-10 h-10 border-3 border-[#63474D] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm font-medium">Loading sponsor settings & preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#4A3238] to-[#63474D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[#FFA686] text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI Partner Settings
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Company Profile & Sponsorship Preferences
          </h1>
          <p className="text-white/80 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
            Customize your corporate presence and matching criteria. The Sheeba AI matching engine continuously analyzes verified event telemetry against these preferences to surface the highest-fit tech communities for your brand.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Company Profile Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">Company Identity</h2>
              <p className="text-xs text-gray-500">Public corporate details visible to event organizers upon approval.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Tech Ethiopia"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                Contact Representative Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name of representative"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Industry Category
              </label>
              <select
                value={industryCategory}
                onChange={(e) => setIndustryCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none font-medium cursor-pointer"
              >
                {INDUSTRY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                Website URL
              </label>
              <input
                type="text"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                Contact Phone
              </label>
              <input
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="+251 911 000 000"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none"
              />
            </div>
          </div>

          {/* Company Logo Upload & Live Preview */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-gray-400" />
              Company Logo <span className="text-gray-400 font-normal lowercase">(Optional - PNG, JPG, WebP up to 5MB)</span>
            </label>
            {companyLogo ? (
              <div className="flex items-center gap-3 p-2.5 bg-stone-50 border border-gray-300 rounded-xl">
                <img
                  src={companyLogo}
                  alt="Company Logo Preview"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-12 h-12 object-contain rounded-xl border border-gray-200 bg-white p-1 shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#2D1F23] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Logo attached</span>
                  </p>
                  <p className="text-[11px] text-[#756366] truncate">{companyLogo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompanyLogo('')}
                  className="p-1.5 text-[#756366] hover:text-red-600 transition-colors cursor-pointer"
                  title="Remove logo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 bg-stone-50 hover:bg-stone-100 border border-dashed border-gray-300 rounded-xl cursor-pointer transition-all">
                {isUploadingLogo ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#63474D]" />
                ) : (
                  <Upload className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-xs font-medium text-gray-600">
                  {isUploadingLogo ? 'Uploading logo to Cloudinary...' : 'Click to upload company logo from computer'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  disabled={isUploadingLogo}
                  onChange={handleLogoUpload}
                />
              </label>
            )}
            {logoUploadError && (
              <p className="text-[11px] text-red-600 mt-1">{logoUploadError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Company Description & Mission
            </label>
            <textarea
              rows={3}
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              placeholder="Tell event organizers and developers about your mission, developer tools, or market focus..."
              className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Section 2: Sponsorship Objectives */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">Sponsorship Objectives</h2>
              <p className="text-xs text-gray-500">What does your company aim to achieve through event sponsorships?</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {OBJECTIVES_OPTIONS.map((obj) => {
              const active = objectives.includes(obj);
              return (
                <button
                  type="button"
                  key={obj}
                  onClick={() => toggleArrayItem(objectives, setObjectives, obj)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${active
                    ? 'bg-[#63474D] text-white shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-gray-700 border border-gray-200'
                    }`}
                >
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFA686]" />}
                  <span>{obj}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Target Audience & Demographics */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">Target Audience Demographics</h2>
              <p className="text-xs text-gray-500">Whom do you wish to engage at sponsored events?</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {AUDIENCE_OPTIONS.map((aud) => {
              const active = targetAudience.includes(aud);
              return (
                <button
                  type="button"
                  key={aud}
                  onClick={() => toggleArrayItem(targetAudience, setTargetAudience, aud)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${active
                    ? 'bg-[#63474D] text-white shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-gray-700 border border-gray-200'
                    }`}
                >
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFA686]" />}
                  <span>{aud}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Preferred Event Categories */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center font-bold">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">Preferred Event Formats</h2>
              <p className="text-xs text-gray-500">Event types that best align with your marketing & recruitment strategy.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {CATEGORIES_OPTIONS.map((cat) => {
              const active = preferredCategories.includes(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleArrayItem(preferredCategories, setPreferredCategories, cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${active
                    ? 'bg-[#63474D] text-white shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-gray-700 border border-gray-200'
                    }`}
                >
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFA686]" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Target Skills & Technology Interests */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">Target Skills & Technical Interests</h2>
              <p className="text-xs text-gray-500">Technologies and skills the AI engine looks for in attendee rosters and event tracks.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {PREDEFINED_SKILLS.map((sk) => {
              const active = skillsAndInterests.includes(sk);
              return (
                <button
                  type="button"
                  key={sk}
                  onClick={() => toggleArrayItem(skillsAndInterests, setSkillsAndInterests, sk)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${active
                    ? 'bg-[#63474D] text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-gray-700'
                    }`}
                >
                  {sk}
                </button>
              );
            })}

            {/* Custom tags added by user */}
            {skillsAndInterests
              .filter((sk) => !PREDEFINED_SKILLS.includes(sk))
              .map((custom) => (
                <span
                  key={custom}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/40 flex items-center gap-1.5"
                >
                  <span>{custom}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(custom)}
                    className="hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
          </div>

          {/* Add custom skill input */}
          <div className="flex items-center gap-2 pt-2 max-w-sm">
            <input
              type="text"
              value={customSkillInput}
              onChange={(e) => setCustomSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomSkill();
                }
              }}
              placeholder="Add specialized skill or tag (e.g. Flutter)..."
              className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCustomSkill}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Section 6: Budget & Locations */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">Budget & Geographic Scope</h2>
              <p className="text-xs text-gray-500">Helps AI filter events that fit within your budget and regional boundaries.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Maximum Sponsorship Budget per Event (ETB)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  placeholder="e.g. 250,000"
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none font-bold text-[#63474D]"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-400">
                  ETB
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                Preferred Locations
              </label>
              <div className="flex flex-wrap gap-1.5">
                {LOCATION_OPTIONS.map((loc) => {
                  const active = preferredLocations.includes(loc);
                  return (
                    <button
                      type="button"
                      key={loc}
                      onClick={() => toggleArrayItem(preferredLocations, setPreferredLocations, loc)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${active
                        ? 'bg-[#63474D] text-white'
                        : 'bg-stone-100 hover:bg-stone-200 text-gray-700'
                        }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Preferred Deliverables & Additional Criteria */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">Benefits & Custom Criteria</h2>
              <p className="text-xs text-gray-500">Deliverables and perks you prioritize in package negotiations.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Desired Sponsorship Deliverables
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BENEFITS_OPTIONS.map((ben) => {
                const active = preferredBenefits.includes(ben);
                return (
                  <button
                    type="button"
                    key={ben}
                    onClick={() => toggleArrayItem(preferredBenefits, setPreferredBenefits, ben)}
                    className={`p-3 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer flex items-center justify-between border ${active
                      ? 'bg-[#63474D]/5 border-[#63474D] text-[#63474D]'
                      : 'bg-stone-50 border-gray-200 text-gray-700 hover:bg-stone-100'
                      }`}
                  >
                    <span>{ben}</span>
                    {active ? (
                      <CheckCircle2 className="w-4 h-4 text-[#63474D]" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Additional Custom Criteria or Requirements
            </label>
            <textarea
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Prefer events with over 200 software developers, must have verified door check-in..."
              className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-gray-300 rounded-xl focus:border-[#63474D] focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-[#63474D] hover:bg-[#4E373C] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-[#FFA686]" />
            <span>{saving ? 'Saving Preferences...' : 'Save Settings & Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

