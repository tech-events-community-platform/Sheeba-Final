import React, { useState, useEffect, useRef } from 'react';
import type { Event, EventType } from '../../types/event';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  FileText,
  DollarSign,
  Users,
  Image,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import {
  uploadToCloudinary,
  getCloudinaryConfig,
  saveCloudinaryConfig,
} from '../../utils/cloudinary';
import { formatDateForInput, getCalendarTile } from '../../utils/date';

interface EditEventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: (updatedEvent: Event) => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  event,
  isOpen,
  onClose,
  onEventUpdated,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'summit' as EventType,
    customType: '',
    date: '',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    location: '',
    venueName: '',
    description: '',
    capacity: 100,
    isPaid: false,
    ticketPrice: 0,
    posterImageUrl: '',
  });

  const [bannerSource, setBannerSource] = useState<'upload' | 'url'>('url');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [showCloudinaryConfig, setShowCloudinaryConfig] = useState(false);
  const [tempCloudName, setTempCloudName] = useState(() => getCloudinaryConfig().cloudName);
  const [tempUploadPreset, setTempUploadPreset] = useState(() => getCloudinaryConfig().uploadPreset);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (event && isOpen) {
      const eventDate = formatDateForInput(event.date);

      const standardTypes: EventType[] = ['summit', 'workshop', 'meetup', 'hackathon', 'conference'];
      const isStandard = standardTypes.includes(event.type as EventType);

      setFormData({
        title: event.title || '',
        type: isStandard ? (event.type as EventType) : 'other',
        customType: isStandard ? '' : event.type || '',
        date: eventDate,
        startTime: event.startTime || '09:00 AM',
        endTime: event.endTime || '05:00 PM',
        location: event.location || '',
        venueName: event.venueName || event.location || '',
        description: event.description || '',
        capacity: event.capacity || 100,
        isPaid: Boolean(event.isPaid),
        ticketPrice: event.ticketPrice || 0,
        posterImageUrl: event.posterImageUrl || event.bannerUrl || '',
      });

      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [event, isOpen]);

  if (!isOpen || !event) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const config = getCloudinaryConfig();
    if (!config.cloudName || !config.uploadPreset) {
      setShowCloudinaryConfig(true);
      return;
    }

    setIsUploadingBanner(true);
    setBannerUploadError(null);
    try {
      const url = await uploadToCloudinary(file);
      setFormData((prev) => ({ ...prev, posterImageUrl: url }));
    } catch (err: any) {
      setBannerUploadError(err.message || 'Failed to upload image. Please check Cloudinary configuration.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSaveCloudinaryConfig = () => {
    if (!tempCloudName.trim() || !tempUploadPreset.trim()) {
      alert('Please enter both Cloud Name and Upload Preset');
      return;
    }
    saveCloudinaryConfig(tempCloudName.trim(), tempUploadPreset.trim());
    setShowCloudinaryConfig(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.title.trim()) {
      setErrorMsg('Event Title is required.');
      return;
    }
    if (!formData.location.trim()) {
      setErrorMsg('Event Place/Location is required.');
      return;
    }
    if (!formData.date) {
      setErrorMsg('Event Date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalType = formData.type === 'other' ? (formData.customType.trim() || 'Event') : formData.type;
      const timeStr = `${formData.startTime || '09:00 AM'} - ${formData.endTime || '05:00 PM'} EAT`;

      const payload: Partial<Event> = {
        title: formData.title.trim(),
        type: finalType as EventType,
        date: formData.date,
        startTime: formData.startTime.trim(),
        endTime: formData.endTime.trim(),
        time: timeStr,
        location: formData.location.trim(),
        venueName: (formData.venueName.trim() || formData.location.trim()),
        description: formData.description.trim(),
        capacity: Number(formData.capacity) || 100,
        isPaid: Boolean(formData.isPaid),
        ticketPrice: formData.isPaid ? Number(formData.ticketPrice) || 0 : 0,
        posterImageUrl: formData.posterImageUrl.trim(),
        bannerUrl: formData.posterImageUrl.trim(),
      };

      const updated = await api.events.update(event.id, payload);

      setSuccessMsg('Event details updated and live on your generated link!');
      onEventUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err: any) {
      console.error('Failed to update event:', err);
      setErrorMsg(err.message || 'Failed to update event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#63474D]/10 text-[#63474D] rounded-xl">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2D1F23]">
                Edit Form (Event Details & Poster)
              </h2>
            </div>
            <p className="text-xs text-[#756366] mt-0.5">
              Updates made here immediately reflect on your public generated shareable link.
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

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form id="edit-event-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1.5 space-y-5">
          {/* Section 1: Title & Event Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-[#2D1F23]">
                Event Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. STRIDE ETHIOPIA 2.0 SUMMIT"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2D1F23]">
                Event Type <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] appearance-none cursor-pointer"
                >
                  <option value="summit">Summit</option>
                  <option value="workshop">Workshop</option>
                  <option value="meetup">Meetup</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="conference">Conference</option>
                  <option value="other">Other (Custom Type)</option>
                </select>
                <Tag className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {formData.type === 'other' && (
              <div className="sm:col-span-3 space-y-1.5 animate-fade-in">
                <label className="block text-xs font-bold text-[#2D1F23]">
                  Custom Event Type Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customType}
                  onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
                  placeholder="e.g. Expo, Festival, Gala, Forum"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            )}
          </div>

          {/* Section 2: Date & Time */}
          <div className="p-4 bg-[#FAF7F5] rounded-2xl border border-gray-200/70 space-y-3">
            <span className="text-xs font-bold text-[#63474D] uppercase tracking-wider block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date & Time Schedule
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#2D1F23]">
                  Event Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
                {formData.date && (
                  <p className="text-[10.5px] font-semibold text-[#63474D] flex items-center gap-1 mt-1">
                    <span>🗓️ {getCalendarTile(formData.date).weekday}, {getCalendarTile(formData.date).fullDate}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#2D1F23] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#AA767C]" /> Start Time
                </label>
                <input
                  type="text"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  placeholder="09:00 AM"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#2D1F23] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#AA767C]" /> End Time
                </label>
                <input
                  type="text"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  placeholder="05:00 PM"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Place & Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2D1F23] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#63474D]" />
                City / Location Address <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Addis Ababa, Ethiopia"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2D1F23]">
                Venue / Hall / Building Name
              </label>
              <input
                type="text"
                value={formData.venueName}
                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                placeholder="e.g. Ministry of Innovation and Technology"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>
          </div>

          {/* Section 4: About Event Paragraph / Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2D1F23]">
              About Event (Description Paragraph) <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide event overview, topics, objectives, and details for prospective attendees..."
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] leading-relaxed resize-y"
            />
          </div>

          {/* Section 5: Pricing & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end p-4 bg-gray-50/80 rounded-2xl border border-gray-200/70">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2D1F23] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#63474D]" /> Attendee Capacity
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2D1F23] flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#63474D]" /> Admission Type
              </label>
              <div className="flex items-center gap-4 h-10 px-3 bg-white border border-gray-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D1F23]">
                  <input
                    type="radio"
                    name="isPaid"
                    checked={!formData.isPaid}
                    onChange={() => setFormData({ ...formData, isPaid: false, ticketPrice: 0 })}
                    className="text-[#63474D] focus:ring-[#63474D]"
                  />
                  <span>Free</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D1F23]">
                  <input
                    type="radio"
                    name="isPaid"
                    checked={formData.isPaid}
                    onChange={() => setFormData({ ...formData, isPaid: true })}
                    className="text-[#63474D] focus:ring-[#63474D]"
                  />
                  <span>Paid</span>
                </label>
              </div>
            </div>

            {formData.isPaid && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-xs font-bold text-[#2D1F23]">
                  Ticket Price (ETB) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.ticketPrice}
                  onChange={(e) => setFormData({ ...formData, ticketPrice: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            )}
          </div>

          {/* Section 6: Poster / Banner with Upload from PC & Live Preview */}
          <div className="space-y-3 p-4 bg-[#FAF7F5] rounded-2xl border border-gray-200/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-[#2D1F23] flex items-center gap-1.5">
                <Image className="w-4 h-4 text-[#63474D]" /> Poster / Banner Image
              </label>
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setBannerSource('upload')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    bannerSource === 'upload'
                      ? 'bg-[#63474D] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Upload from PC
                </button>
                <button
                  type="button"
                  onClick={() => setBannerSource('url')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    bannerSource === 'url'
                      ? 'bg-[#63474D] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Paste Image URL
                </button>
              </div>
            </div>

            {bannerSource === 'upload' ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div
                  onClick={() => !isUploadingBanner && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                    isUploadingBanner
                      ? 'border-[#63474D] bg-[#63474D]/5'
                      : 'border-gray-300 hover:border-[#63474D] bg-white'
                  }`}
                >
                  {isUploadingBanner ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="w-5 h-5 border-2 border-[#63474D] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-[#63474D]">Uploading to Cloudinary...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 py-2">
                      <div className="p-2.5 bg-[#63474D]/10 rounded-full text-[#63474D]">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-[#2D1F23]">
                        Click to upload new poster from your PC
                      </p>
                      <p className="text-[10px] text-[#756366]">
                        Supports WebP, PNG, JPG (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {bannerUploadError && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl flex items-center justify-between">
                    <span>{bannerUploadError}</span>
                    <button
                      type="button"
                      onClick={() => setShowCloudinaryConfig(true)}
                      className="underline font-bold ml-2 cursor-pointer"
                    >
                      Configure Cloudinary
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="url"
                  value={formData.posterImageUrl}
                  onChange={(e) => setFormData({ ...formData, posterImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            )}

            {/* Wholly visible live preview */}
            {formData.posterImageUrl && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-[#756366] uppercase tracking-wider block">
                  Poster Live Preview (Wholly visible)
                </span>
                <div className="w-full h-44 sm:h-52 bg-white rounded-2xl border border-gray-200 p-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={formData.posterImageUrl}
                    alt="Event Poster Preview"
                    className="w-full h-full object-contain rounded-xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-event-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="px-6 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Updating...</span>
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {/* Cloudinary Config Modal fallback */}
      {showCloudinaryConfig && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-black/70 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-[#2D1F23]">Cloudinary Setup</h3>
              <button
                type="button"
                onClick={() => setShowCloudinaryConfig(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#756366]">
              Enter your Cloudinary <strong>Cloud Name</strong> and <strong>Unsigned Upload Preset</strong> to upload directly from your PC.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">Cloud Name *</label>
                <input
                  type="text"
                  value={tempCloudName}
                  onChange={(e) => setTempCloudName(e.target.value)}
                  placeholder="e.g. dxyz123"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">Upload Preset (Unsigned) *</label>
                <input
                  type="text"
                  value={tempUploadPreset}
                  onChange={(e) => setTempUploadPreset(e.target.value)}
                  placeholder="e.g. sheeba_unsigned"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCloudinaryConfig(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveCloudinaryConfig}>
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
