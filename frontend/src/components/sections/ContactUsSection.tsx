import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  MapPin,
} from 'lucide-react';
import { submitContactMessage } from '../../services/api';
import FadeIn from '../FadeIn';
import { Link } from 'react-router-dom';

interface ContactUsSectionProps {
  id?: string;
  isStandalone?: boolean;
}

export const ContactUsSection: React.FC<ContactUsSectionProps> = ({
  id = 'contact',
  isStandalone = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const teamEmail = 'sheebanet.events@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(teamEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 5) {
      setErrorMessage('Please write your message.');
      return;
    }

    try {
      setLoading(true);
      await submitContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        category: 'General Inquiry',
        message: formData.message.trim(),
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorMessage(
        err?.message ||
          'Failed to send message. Please try again or reach out directly at ' + teamEmail
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      message: '',
    });
    setSubmitted(false);
    setErrorMessage(null);
  };

  return (
    <section id={id} className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <FadeIn direction="up">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D1F23] tracking-tight">
            Have questions? <span className="text-[#63474D]">We&apos;d love to hear from you.</span>
          </h2>

          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Whether you are organizing a gathering, sponsoring an event, or exploring verifiable badges—our team in Addis Ababa is ready to help.
          </p>
        </div>

        {/* Big Restructured Container Matching User Wireframe */}
        <div className="bg-white rounded-3xl border border-[#E8DDD7] p-6 sm:p-10 lg:p-12 shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Side: Sheeba Contact Details & How We Get Back */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D1F23]">
                  Direct Communication
                </h3>
                <p className="text-sm text-[#756366] leading-relaxed">
                  Messages are sent directly to the Sheeba team. You will receive a personal response to your question.
                </p>
              </div>

              {/* Official Team Email Box with Copy Button */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#756366]">
                  <span className="flex items-center gap-1.5 font-semibold text-[#63474D]">
                    <Mail className="w-3.5 h-3.5 text-[#FFA686]" />
                    <span>Official Team Email</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#63474D] hover:text-[#2D1F23] transition-colors cursor-pointer px-2 py-0.5 rounded bg-white border border-[#E8DDD7]"
                    title="Copy email address"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  href={`mailto:${teamEmail}`}
                  className="block text-sm sm:text-base font-bold text-[#2D1F23] hover:text-[#63474D] transition-colors break-all"
                >
                  {teamEmail}
                </a>
              </div>

              {/* How We Get Back To People & Location */}
              <div className="space-y-3 pt-1 text-xs sm:text-sm text-[#756366]">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#63474D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#2D1F23]">Response Guarantee</p>
                    <p className="text-xs text-[#756366]">We reply within 24 to 48 business hours.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#63474D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#2D1F23]">Addis Ababa, Ethiopia</p>
                    <p className="text-xs text-[#756366]">Serving Ethiopian event organizers and attendees.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Clean Straightforward Form */}
            <div className="lg:col-span-7">
              {submitted ? (
                <div className="text-center py-8 space-y-5 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="font-serif text-2xl font-bold text-[#2D1F23]">
                      Message Dispatched!
                    </h3>
                    <p className="text-sm text-gray-600">
                      Thank you, <strong className="text-[#2D1F23]">{formData.name}</strong>. We received your message and will reply to <span className="text-[#63474D] font-medium">{formData.email}</span> soon.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-full bg-[#FAF7F5] border border-[#E8DDD7] text-[#2D1F23] font-bold text-xs hover:bg-[#F3EAE6] transition-all cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your Name"
                      className="w-full px-4 py-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-sm text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Your Email Address"
                      className="w-full px-4 py-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-sm text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1">
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Write your message here..."
                      className="w-full px-4 py-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-sm text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all resize-y min-h-[120px]"
                    />
                  </div>

                  {/* Error Alert */}
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Submit Button (Oval as drawn in wireframe) */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#63474D] hover:bg-[#523a3f] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="w-4 h-4 text-[#FFA686]" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
};
