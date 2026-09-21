import React, { useState, useEffect } from 'react';
import {
  HandCoins,
  CheckCircle2,
  XCircle,
  Send,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Layers,
  Building2,
  ExternalLink,
  Edit3,
  Save,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ISponsorshipDeal } from '../../types/sponsorship';

export const SponsorDealsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INTERESTED' | 'DECLINED'>('INTERESTED');
  const [deals, setDeals] = useState<ISponsorshipDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const data = await api.sponsorship.getMyDeals(activeTab);
      setDeals(data);
    } catch (err: any) {
      console.error('Failed to load deals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, [activeTab]);

  const handleUpdateStatus = async (dealId: string, newStatus: 'INTERESTED' | 'DECLINED') => {
    try {
      setUpdatingId(dealId);
      await api.sponsorship.updateDeal(dealId, { status: newStatus });
      // Remove from current list view since tab is filtered by status
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    } catch (err: any) {
      alert(err.message || 'Failed to update deal status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (dealId: string) => {
    try {
      setUpdatingId(dealId);
      await api.sponsorship.updateDeal(dealId, {
        status: activeTab,
        sponsor_notes: notesDraft,
      });
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, sponsor_notes: notesDraft } : d))
      );
      setEditingNotesId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save notes.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Total pledged calculation for interested tab
  const totalPledged = deals.reduce((acc, deal) => acc + (deal.pledged_amount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#4A3238] to-[#63474D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[#FFA686] text-xs font-semibold uppercase tracking-wider mb-3">
            <HandCoins className="w-3.5 h-3.5" />
            Deal Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Deals & Pledges Pipeline
          </h1>
          <p className="text-white/80 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
            Manage your sponsorships across Interested and Declined categories. Access direct organizer contact lines to coordinate sponsorships off-platform.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button
              onClick={() => setActiveTab('INTERESTED')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'INTERESTED'
                  ? 'bg-white text-[#2D1F23] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Interested Deals</span>
            </button>

            <button
              onClick={() => setActiveTab('DECLINED')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'DECLINED'
                  ? 'bg-white text-[#2D1F23] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <XCircle className="w-4 h-4 text-gray-400" />
              <span>Declined Deals</span>
            </button>

            {activeTab === 'INTERESTED' && (
              <div className="ml-auto px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-xs">
                <span className="text-white/70">Total Pledged in Pipeline: </span>
                <span className="font-serif font-bold text-[#FFA686] text-sm ml-1">
                  {totalPledged.toLocaleString()} ETB
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deals List */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <div className="animate-spin w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Loading your deals...</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-300">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <HandCoins className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            No deals marked as {activeTab.toLowerCase()}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Browse the Explore marketplace to discover upcoming events and mark interest.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {deals.map((deal) => {
            const app = deal.application || (deal as any);
            if (!app || !app.event_title) return null;

            const isEditingNotes = editingNotesId === deal.id;

            return (
              <div
                key={deal.id}
                className="bg-white rounded-3xl p-6 border border-[#AA767C]/15 shadow-sm space-y-5"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/30">
                        {app.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                        {app.event_type}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          deal.status === 'INTERESTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {deal.status}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900">{app.event_title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Organized by {app.organizer_organization || app.organizer_name}
                    </p>
                  </div>

                  {/* Status Toggle Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {deal.status === 'INTERESTED' ? (
                      <button
                        type="button"
                        disabled={updatingId === deal.id}
                        onClick={() => handleUpdateStatus(deal.id, 'DECLINED')}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                        <span>Move to Declined</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={updatingId === deal.id}
                        onClick={() => handleUpdateStatus(deal.id, 'INTERESTED')}
                        className="px-3.5 py-2 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#FFA686]" />
                        <span>Restore to Interested</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Event Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#63474D]" />
                    <span>{app.expected_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#63474D]" />
                    <span>{app.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#63474D]" />
                    <span>{app.expected_attendees?.toLocaleString() || 0} Attendees</span>
                  </div>
                </div>

                {/* Selected Package & Pledged Amount Banner */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">Selected Tier</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {deal.package_name || 'Standard Sponsorship'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">Pledged / Budget</span>
                    <span className="font-serif font-bold text-[#63474D] text-base">
                      {(deal.pledged_amount || app.funding_goal || 0).toLocaleString()} {app.currency || 'ETB'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">Added on</span>
                    <span className="text-gray-700 font-medium">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Direct Organizer Contact Box */}
                <div className="bg-[#FAF7F5] border border-[#63474D]/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
                      Direct Organizer Contact
                    </p>
                    <span className="text-[11px] text-gray-500 font-medium">{app.contact_name}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={`tel:${app.contact_phone}`}
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#63474D] text-xs font-semibold text-gray-800 flex items-center gap-1.5 transition-colors"
                    >
                      <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
                      <span>{app.contact_phone}</span>
                    </a>

                    <a
                      href={`mailto:${app.contact_email}?subject=Sponsorship%20Confirmation%20-%20${encodeURIComponent(app.event_title)}`}
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#63474D] text-xs font-semibold text-gray-800 flex items-center gap-1.5 transition-colors"
                    >
                      <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
                      <span>{app.contact_email}</span>
                    </a>

                    {app.contact_telegram && (
                      <a
                        href={
                          app.contact_telegram.startsWith('http')
                            ? app.contact_telegram
                            : `https://t.me/${app.contact_telegram.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#63474D] text-xs font-semibold text-gray-800 flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-500" />
                        <span>Telegram: {app.contact_telegram}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Notes section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Internal Sponsor Notes
                    </span>
                    {!isEditingNotes && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNotesId(deal.id);
                          setNotesDraft(deal.sponsor_notes || '');
                        }}
                        className="text-xs font-bold text-[#63474D] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Notes</span>
                      </button>
                    )}
                  </div>

                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Add private deal notes, agreements, next meeting date..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:border-[#63474D] outline-none"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingNotesId(null)}
                          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === deal.id}
                          onClick={() => handleSaveNotes(deal.id)}
                          className="px-3 py-1 bg-[#63474D] text-white text-xs font-bold rounded-lg hover:bg-[#4E373C] flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      {deal.sponsor_notes || 'No notes added yet.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
