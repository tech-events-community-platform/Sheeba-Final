import React, { useState } from 'react';
import { Event, RegistrationQuestion } from '../../types/event';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { uploadToCloudinary } from '../../utils/cloudinary';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  FileCheck,
  HelpCircle,
} from 'lucide-react';

interface ManualAddAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onSuccess: (message: string) => void;
}

export const ManualAddAttendeeModal: React.FC<ManualAddAttendeeModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  // Paid event fields
  const [paymentOption, setPaymentOption] = useState<'verified' | 'pending'>(
    event.isPaid ? 'verified' : 'pending'
  );
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState<Record<string, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const customQuestions: RegistrationQuestion[] = Array.isArray(event.customQuestions)
    ? event.customQuestions
    : [];

  const handleAnswerChange = (qId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleFileUpload = async (qId: string, file: File) => {
    setIsUploadingFile((prev) => ({ ...prev, [qId]: true }));
    setErrorMessage(null);
    try {
      const url = await uploadToCloudinary(file);
      handleAnswerChange(qId, url);
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed.');
    } finally {
      setIsUploadingFile((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    setIsUploadingFile((prev) => ({ ...prev, screenshot: true }));
    setErrorMessage(null);
    try {
      const url = await uploadToCloudinary(file);
      setScreenshotUrl(url);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment receipt upload failed.');
    } finally {
      setIsUploadingFile((prev) => ({ ...prev, screenshot: false }));
    }
  };

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMessage('Please provide the attendee’s full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    // Validate custom questions
    for (const q of customQuestions) {
      const qVal = answers[q.id];
      const isFilled =
        typeof qVal === 'string'
          ? qVal.trim().length > 0
          : Array.isArray(qVal)
          ? qVal.length > 0
          : qVal !== undefined && qVal !== null && qVal !== '';

      if (q.isRequired && !isFilled) {
        setErrorMessage(`Please provide an answer for required question: "${q.questionText}"`);
        return;
      }

      if (isFilled && q.type === 'email' && typeof qVal === 'string') {
        if (!emailRegex.test(qVal.trim())) {
          setErrorMessage(`Please enter a valid email for question: "${q.questionText}"`);
          return;
        }
      }
    }

    // Paid event validation
    if (event.isPaid && event.ticketPrice > 0 && paymentOption === 'verified') {
      if (!paymentReference.trim() && !screenshotUrl.trim()) {
        setErrorMessage('Please enter a bank transaction reference or upload a payment receipt screenshot.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await api.checkIn.addManualAttendee({
        eventId: event.id,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || undefined,
        answers,
        paymentReference: paymentOption === 'verified' ? paymentReference.trim() || undefined : undefined,
        paymentMethod: paymentOption === 'verified' ? paymentMethod || undefined : undefined,
        screenshotUrl: paymentOption === 'verified' ? screenshotUrl || undefined : undefined,
        paymentStatus: event.isPaid
          ? paymentOption === 'verified'
            ? 'settled'
            : 'unsettled'
          : 'settled',
      });

      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      console.error('Manual registration submission error:', err);
      const msg = err.message || 'Failed to complete manual registration.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => !isSubmitting && onClose()}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D] bg-[#63474D]/10 px-2 py-0.5 rounded-full">
                Manual Registration
              </span>
              {event.isPaid ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Paid Event • {event.ticketPrice} ETB
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Free Event
                </span>
              )}
            </div>
            <h3 className="font-serif font-bold text-xl text-[#2D1F23] mt-1">
              Register Attendee Manually
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {event.title} • Registers attendee, collects form responses, and dispatches automated invitation & access link
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={validateAndSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-[#63474D] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              1. Attendee Basic Details
            </h4>

            <div>
              <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Abebe Bikila"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#2D1F23] mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#63474D]" />
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. abebe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D1F23] mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#63474D]" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +251 91 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Custom Registration Questions */}
          {customQuestions.length > 0 && (
            <div className="space-y-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-bold text-[#63474D] uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5" />
                2. Event Registration Questions ({customQuestions.length})
              </h4>

              <div className="space-y-4">
                {customQuestions.map((q, idx) => {
                  const qType = (q.type || 'text').toLowerCase();
                  const qValue = answers[q.id];

                  return (
                    <div key={q.id} className="space-y-1.5 p-3.5 rounded-2xl bg-[#FAF7F5]/80 border border-[#E8DDD7]">
                      <label className="block text-xs font-semibold text-[#2D1F23]">
                        {idx + 1}. {q.questionText}{' '}
                        {q.isRequired && <span className="text-red-500">*</span>}
                      </label>

                      {/* Dropdown / Select */}
                      {(qType === 'select' || qType === 'dropdown') && q.options && q.options.length > 0 ? (
                        <select
                          value={qValue || ''}
                          required={q.isRequired}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        >
                          <option value="">Select an option...</option>
                          {q.options.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (qType === 'choice' || qType === 'radio') && q.options && q.options.length > 0 ? (
                        /* Radio options */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, i) => {
                            const isSelected = qValue === opt;
                            return (
                              <label
                                key={i}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-[#63474D] bg-[#63474D]/10 font-semibold'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question_${q.id}`}
                                  value={opt}
                                  checked={isSelected}
                                  onChange={() => handleAnswerChange(q.id, opt)}
                                  className="w-3.5 h-3.5 text-[#63474D] focus:ring-[#63474D]"
                                />
                                <span className="text-xs text-[#2D1F23]">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (qType === 'multi_choice' || qType === 'checkbox') && q.options && q.options.length > 0 ? (
                        /* Checkboxes */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, i) => {
                            const currentList: string[] = Array.isArray(qValue)
                              ? qValue
                              : typeof qValue === 'string' && qValue
                              ? qValue.split(', ')
                              : [];
                            const isChecked = currentList.includes(opt);

                            return (
                              <label
                                key={i}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                  isChecked
                                    ? 'border-[#63474D] bg-[#63474D]/10 font-semibold'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  value={opt}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const nextList = e.target.checked
                                      ? [...currentList, opt]
                                      : currentList.filter((item) => item !== opt);
                                    handleAnswerChange(q.id, nextList);
                                  }}
                                  className="w-3.5 h-3.5 rounded text-[#63474D] focus:ring-[#63474D]"
                                />
                                <span className="text-xs text-[#2D1F23]">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : qType === 'file' || qType === 'upload' ? (
                        /* File Upload */
                        <div className="space-y-2">
                          <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[#63474D]/40 bg-white rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                            <Upload className="w-4 h-4 text-[#63474D]" />
                            <span className="text-xs font-semibold text-[#63474D]">
                              {isUploadingFile[q.id]
                                ? 'Uploading file...'
                                : qValue
                                ? 'Change uploaded file'
                                : 'Upload document or image'}
                            </span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              disabled={isUploadingFile[q.id]}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(q.id, file);
                              }}
                              className="hidden"
                            />
                          </label>
                          {qValue && (
                            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Uploaded: {qValue}</span>
                            </div>
                          )}
                        </div>
                      ) : qType === 'date' ? (
                        /* Date Input */
                        <input
                          type="date"
                          required={q.isRequired}
                          value={qValue || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        />
                      ) : qType === 'email' ? (
                        /* Email Input */
                        <input
                          type="email"
                          required={q.isRequired}
                          placeholder="name@domain.com"
                          value={qValue || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        />
                      ) : (
                        /* Standard Text Input */
                        <input
                          type="text"
                          required={q.isRequired}
                          placeholder="Attendee answer"
                          value={qValue || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Payment Verification (Paid events only) */}
          {event.isPaid && event.ticketPrice > 0 && (
            <div className="space-y-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-bold text-[#63474D] uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                3. Payment Details ({event.ticketPrice} ETB)
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentOption('verified')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    paymentOption === 'verified'
                      ? 'border-[#63474D] bg-[#63474D]/10 font-bold text-[#2D1F23]'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <p className="text-xs">Bank / Wallet Paid</p>
                  <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                    Verify reference & issue instant QR ticket
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentOption('pending')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    paymentOption === 'pending'
                      ? 'border-[#63474D] bg-[#63474D]/10 font-bold text-[#2D1F23]'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <p className="text-xs">Payment Pending</p>
                  <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                    Record registration; ticket holds until paid
                  </p>
                </button>
              </div>

              {paymentOption === 'verified' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-[#FAF7F5]/80 border border-[#E8DDD7]">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                      Transaction Reference / ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CBE or Telebirr reference code"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                        Payment Provider
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                      >
                        <option value="">Select provider...</option>
                        <option value="cbe">Commercial Bank of Ethiopia (CBE)</option>
                        <option value="telebirr">Telebirr</option>
                        <option value="awash">Awash Bank</option>
                        <option value="boa">Bank of Abyssinia</option>
                        <option value="manual">Cash / Direct Organizer Verification</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                        Receipt Screenshot (Optional)
                      </label>
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-[#63474D]/40 bg-white rounded-xl cursor-pointer hover:bg-gray-50 text-xs text-[#63474D] font-medium">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingFile.screenshot ? 'Uploading...' : screenshotUrl ? 'Change image' : 'Upload receipt'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingFile.screenshot}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleScreenshotUpload(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workflow info callout */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              If this email belongs to an existing Sheeba user, they will receive a registration confirmation email and can access their pass via their existing password. If this email is new, a secure account setup link will be emailed to them.
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              variant="primary"
              className="px-5 py-2 text-xs font-bold"
            >
              Complete Registration
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
