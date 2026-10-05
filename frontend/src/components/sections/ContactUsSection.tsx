import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  MapPin,
  Clock,
  Sparkles,
  MessageSquare,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { submitContactMessage } from '../../services/api';
import FadeIn from '../FadeIn';
import { Link } from 'react-router-dom';

const INQUIRY_CATEGORIES = [
  'General Inquiry',
  'Event Organizer',
  'Sponsorship & Partners',
  'Badge & Verification',
  'Technical Support',
];

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
    subject: '',
    category: 'General Inquiry',
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
      setErrorMessage('Please provide your name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (!formData.subject.trim()) {
      setErrorMessage('Please provide a subject for your message.');
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setErrorMessage('Please write a message with at least 10 characters.');
      return;
    }

    try {
      setLoading(true);
      await submitContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        category: formData.category,
        message: formData.message.trim(),
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorMessage(
        err?.message ||
          'Failed to deliver message. Please try again or email us directly at ' + teamEmail
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      subject: '',
      category: 'General Inquiry',
      message: '',
    });
    setSubmitted(false);
    setErrorMessage(null);
  };

  return (
    <section id={id} className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <FadeIn direction="up">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#63474D]/10 border border-[#63474D]/20 text-[#63474D] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#FFA686]" />
            <span>Connect With Us</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D1F23] tracking-tight">
            Have questions? <span className="text-[#63474D]">We&apos;d love to hear from you.</span>
          </h2>

          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Whether you are organizing a national tech summit, sponsoring community hackathons, or
            exploring verifiable badges — our team in Addis Ababa is ready to help.
          </p>
        </div>

        {/* Content 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Direct Info Cards (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Primary Direct Contact Box */}
            <div className="bg-gradient-to-br from-[#2D1F23] via-[#4A3238] to-[#63474D] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#FFA686]/15 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Support Desk Online</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-white">Direct Communication</h3>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                    Messages are delivered directly to the Sheeba operations team inbox. You will
                    receive a confirmation receipt and personal response.
                  </p>
                </div>

                {/* Email Chip with Copy Button */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5 text-[#FFA686]" />
                      <span>Official Team Email</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/90 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
                      title="Copy email address"
                    >
                      {copiedEmail ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
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
                    className="block text-sm sm:text-base font-bold text-white hover:text-[#FFA686] transition-colors break-all"
                  >
                    {teamEmail}
                  </a>
                </div>

                {/* Meta details list */}
                <div className="space-y-3 pt-2 text-xs sm:text-sm text-white/85">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#FFA686] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Addis Ababa, Ethiopia</p>
                      <p className="text-xs text-white/70">Serving East African Tech Communities</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#FFA686] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Response Guarantee</p>
                      <p className="text-xs text-white/70">Replies within 24 to 48 business hours</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-[#FFA686] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Direct Brevo Delivery</p>
                      <p className="text-xs text-white/70">
                        High-priority routing to community coordinators
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Helper Card */}
            <div className="bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#63474D]">
                <HelpCircle className="w-4 h-4 text-[#FFA686]" />
                <span>Frequently Asked Inquiries</span>
              </div>
              <ul className="space-y-2 text-xs text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-[#63474D] font-bold">•</span>
                  <span><strong>Organizers:</strong> Request check-in hardware, QR scanner setups, or door badge sync.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#63474D] font-bold">•</span>
                  <span><strong>Sponsors:</strong> Discover verified tech events seeking funding and corporate partner packages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#63474D] font-bold">•</span>
                  <span><strong>Attendees:</strong> Inquire about attendance badges, ticket transfers, or cryptographic credentials.</span>
                </li>
              </ul>
              {!isStandalone && (
                <div className="pt-2">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#63474D] hover:text-[#2D1F23] transition-colors"
                  >
                    <span>Open Dedicated Contact Portal & FAQ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Form (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-[#E8DDD7] p-6 sm:p-10 shadow-xl shadow-[#63474D]/5 relative">
              {submitted ? (
                /* Success View */
                <div className="text-center py-10 sm:py-14 space-y-6 animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
                      Message Dispatched!
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Thank you, <strong className="text-[#2D1F23]">{formData.name}</strong>. Your message
                      has been forwarded to <strong className="text-[#63474D]">{teamEmail}</strong>.
                    </p>
                    <p className="text-xs text-gray-500 pt-1">
                      Our coordinators will reply directly to your email (
                      <span className="font-medium text-gray-700">{formData.email}</span>).
                    </p>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-6 py-3 rounded-xl bg-[#FAF7F5] border border-[#E8DDD7] text-[#2D1F23] font-bold text-xs hover:bg-[#F3EAE6] transition-all cursor-pointer"
                    >
                      Send Another Message
                    </button>
                    <Link
                      to="/"
                      className="px-6 py-3 rounded-xl bg-[#63474D] text-white font-bold text-xs hover:bg-[#523a3f] shadow-md transition-all cursor-pointer"
                    >
                      Return to Sheeba Home
                    </Link>
                  </div>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Topic / Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {INQUIRY_CATEGORIES.map((cat) => {
                        const isSelected = formData.category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: cat })}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#63474D] text-white shadow-xs'
                                : 'bg-[#FAF7F5] text-gray-700 border border-[#E8DDD7] hover:border-[#63474D]/40'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name and Email 2-col */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-name"
                        className="block text-xs font-bold text-gray-700"
                      >
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Abebe Kebede"
                        className="w-full px-4 py-3 rounded-xl border border-[#E8DDD7] bg-[#FAF7F5]/50 text-sm text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-bold text-gray-700"
                      >
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. abebe@domain.com"
                        className="w-full px-4 py-3 rounded-xl border border-[#E8DDD7] bg-[#FAF7F5]/50 text-sm text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-subject"
                      className="block text-xs font-bold text-gray-700"
                    >
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g. Inquiring about organizing our upcoming AI hackathon"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8DDD7] bg-[#FAF7F5]/50 text-sm text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Message Area */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-bold text-gray-700"
                      >
                        Your Message <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {formData.message.length} chars
                      </span>
                    </div>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please share details about your event, partnership request, or question..."
                      className="w-full px-4 py-3 rounded-xl border border-[#E8DDD7] bg-[#FAF7F5]/50 text-sm text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all resize-y min-h-[120px]"
                    />
                  </div>

                  {/* Error Alert */}
                  {errorMessage && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#63474D] to-[#2D1F23] hover:from-[#523a3f] hover:to-[#201518] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Delivering Message via Brevo...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message to Sheeba Team</span>
                          <Send className="w-4 h-4 text-[#FFA686]" />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-gray-500 text-center mt-2.5">
                      🔒 Your inquiry is sent directly to <strong>{teamEmail}</strong>. We never share your contact details.
                    </p>
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
