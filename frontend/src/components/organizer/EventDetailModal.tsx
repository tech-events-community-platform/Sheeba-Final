import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../types/event';
import { Badge } from '../ui/Badge';
import {
  X,
  Users,
  QrCode,
  Award,
  DollarSign,
  BarChart3,
  ExternalLink,
  Copy,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { EditEventQuestionsModal } from './EditEventQuestionsModal';

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteClick?: (event: Event) => void;
  onEventUpdated?: (updatedEvent: Event) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onDeleteClick,
  onEventUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditQuestionsOpen, setIsEditQuestionsOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(event);

  React.useEffect(() => {
    setCurrentEvent(event);
  }, [event]);

  if (!isOpen || !event || !currentEvent) return null;

  const publicUrl = `${window.location.origin}/e/${currentEvent.shareLinkToken}`;
  const fillRate = currentEvent.capacity > 0 ? Math.round((currentEvent.registeredCount / currentEvent.capacity) * 100) : 100;
  const turnoutRate = currentEvent.registeredCount > 0 ? Math.round((currentEvent.checkedInCount / currentEvent.registeredCount) * 100) : 0;
  const grossRevenue = currentEvent.isPaid ? currentEvent.registeredCount * currentEvent.ticketPrice : 0;
  const remainingSpots = Math.max(0, currentEvent.capacity - currentEvent.registeredCount);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="uppercase font-mono text-[10px]">
                {event.type}
              </Badge>
              <Badge variant={event.status === 'open' ? 'success' : 'gray'}>
                {event.status === 'open' ? 'Registration Active' : event.status}
              </Badge>
              <span className="text-xs font-bold text-[#C84B18]">
                {event.isPaid ? `${event.ticketPrice} ETB` : 'FREE'}
              </span>
            </div>
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-sheeba-dark leading-tight pt-1">
              {event.title}
            </h2>
            <p className="text-xs text-gray-500 font-light">
              Organized by {event.organizerName} • Event ID: <span className="font-mono">{event.id}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Comprehensive Event Table */}
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fcfafc] border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Operational Dimension</th>
                  <th className="py-3 px-4">Current Status & Metric</th>
                  <th className="py-3 px-4 text-right">Ecosystem Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50/70">
                  <td className="py-3 px-4 font-semibold text-sheeba-dark flex items-center gap-1.5">
                    <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain shrink-0" /> Schedule & Time
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800">
                    {event.date} • {event.time || `${event.startTime} - ${event.endTime}`}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400 font-light">
                    Single-Day Session
                  </td>
                </tr>

                <tr className="hover:bg-gray-50/70">
                  <td className="py-3 px-4 font-semibold text-sheeba-dark flex items-center gap-1.5">
                    <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" /> Venue & Hall
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800">
                    {event.venueName || event.location}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400 font-light">
                    Addis Ababa, Ethiopia
                  </td>
                </tr>

                <tr className="hover:bg-gray-50/70">
                  <td className="py-3 px-4 font-semibold text-sheeba-dark flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sheeba-purple" /> Registration Capacity
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-sheeba-dark">{event.registeredCount}</span>
                    <span className="text-gray-400"> / {event.capacity} spots ({fillRate}% full)</span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-[#2A7B5F]">
                    {remainingSpots > 0 ? `${remainingSpots} spots remaining` : 'Capacity Reached'}
                  </td>
                </tr>

                <tr className="hover:bg-gray-50/70">
                  <td className="py-3 px-4 font-semibold text-sheeba-dark flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#2A7B5F]" /> Door Scanned Turnout
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-[#2A7B5F]">{event.checkedInCount} checked in</span>
                    <span className="text-gray-400"> ({turnoutRate}% verified)</span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400 font-light">
                    Door Scanner Active
                  </td>
                </tr>

                <tr className="hover:bg-gray-50/70">
                  <td className="py-3 px-4 font-semibold text-sheeba-dark flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#C84B18]" /> Ticketing & Revenue
                  </td>
                  <td className="py-3 px-4 font-bold text-sheeba-dark">
                    {event.isPaid ? `${grossRevenue.toLocaleString()} ETB` : 'Free Community Event'}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400 font-light">
                    {event.isPaid ? 'Chapa Direct Payout' : 'Zero Ticket Fee'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Share Link Row */}
        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-600 font-light truncate w-full sm:w-auto">
            <ShieldCheck className="w-4 h-4 text-[#2A7B5F] shrink-0" />
            <span className="truncate font-mono text-[11px]">{publicUrl}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-sheeba-dark text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <img src="/tick.webp" alt="Copied" className="w-3.5 h-3.5 object-contain shrink-0" /> : <Copy className="w-3.5 h-3.5 text-[#C84B18]" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <Link
              to={`/e/${event.shareLinkToken}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sheeba-purple text-white text-xs font-semibold hover:bg-sheeba-indigo transition-colors"
            >
              <span>Public Form</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsEditQuestionsOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white border border-gray-200 hover:border-[#63474D] text-[#63474D] text-xs font-semibold transition-colors shadow-2xs text-center cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Edit Questions</span>
          </button>
          <Link
            to={`/organizer/events/${currentEvent.id}/scanner`}
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white border border-gray-200 hover:border-[#C84B18] text-[#C84B18] text-xs font-semibold transition-colors shadow-2xs text-center"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Check-in</span>
          </Link>
          <Link
            to={`/organizer/events/${currentEvent.id}/attendees`}
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white border border-gray-200 hover:border-[#C84B18] text-[#C84B18] text-xs font-semibold transition-colors shadow-2xs text-center"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Badges</span>
          </Link>
          <Link
            to={`/organizer/reports/${currentEvent.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white border border-gray-200 hover:border-[#C84B18] text-[#C84B18] text-xs font-semibold transition-colors shadow-2xs text-center"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Report</span>
          </Link>
        </div>

        {/* Optional Delete Button */}
        {onDeleteClick && (
          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteClick(currentEvent);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            >
              <span>Delete This Event</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Registration Questions Modal */}
      <EditEventQuestionsModal
        event={currentEvent}
        isOpen={isEditQuestionsOpen}
        onClose={() => setIsEditQuestionsOpen(false)}
        onQuestionsUpdated={(updatedQuestions) => {
          if (currentEvent) {
            const updated = { ...currentEvent, customQuestions: updatedQuestions };
            setCurrentEvent(updated);
            if (onEventUpdated) {
              onEventUpdated(updated);
            }
          }
        }}
      />
    </div>
  );
};
