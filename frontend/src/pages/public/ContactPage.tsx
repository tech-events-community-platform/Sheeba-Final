import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  HelpCircle,
} from 'lucide-react';
import { ContactUsSection } from '../../components/sections/ContactUsSection';
import FadeIn from '../../components/FadeIn';

const FAQS = [
  {
    q: 'What happens after I send a message through this form?',
    a: 'Your message is processed in real time through our transactional Brevo email infrastructure and dispatched to the Sheeba leadership and event coordination team at sheebanet.events@gmail.com. You will also receive an automated confirmation receipt at your submitted email address, and one of our team members will follow up with you directly.',
  },
  {
    q: 'How does verifiable attendance check-in work on Sheeba?',
    a: 'When attendees arrive at your event, organizers scan their unique encrypted QR ticket using our dedicated mobile-ready scanner. Once verified, the door check-in is cryptographically recorded, immediately unlocking the attendee\'s permanent attendance badge and verifiable certificate.',
  },
  {
    q: 'How do corporate sponsors partner with tech events on Sheeba?',
    a: 'Sponsors can register for a corporate sponsor account to explore verified tech events, hackathons, and developer conferences across Ethiopia. Sponsors can pledge funding directly to event packages, review verified attendance statistics, and negotiate brand deliverable placements.',
  },
  {
    q: 'Can Sheeba support large-scale conferences or national summits?',
    a: 'Yes. Sheeba infrastructure was proven at national events such as STRIDE Ethiopia 2.0 with the Ministry of Innovation & Technology (MInT), processing thousands of attendees with real-time door validation and badge issuance.',
  },
  {
    q: 'How do I become an approved event organizer?',
    a: 'You can sign up on Sheeba and select "Host Events". Provide your organization or community details. Once our administrative team reviews your profile, your organizer studio will be activated.',
  },
];

export const ContactPage: React.FC = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    document.title = 'Contact Us | Sheeba Event Platform';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen pb-24 overflow-hidden">
      {/* Top Breadcrumb & Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link to="/" className="hover:text-[#63474D] transition-colors font-medium">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[#63474D] font-bold">Contact Us</span>
        </nav>
      </div>

      {/* Main Interactive Contact Section */}
      <div className="mb-20">
        <ContactUsSection id="contact-form" isStandalone={true} />
      </div>

      {/* FAQ Accordion Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <FadeIn direction="up">
          <div className="text-center mb-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F5] border border-[#E8DDD7] text-[#63474D] text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-[#FFA686]" />
              <span>Got Questions?</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
              Frequently Asked Questions
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Quick answers about verifiable credentials, organizer tooling, and community partnerships.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.q}
                  className="bg-white rounded-2xl border border-[#E8DDD7] overflow-hidden transition-all duration-200 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left font-serif text-sm sm:text-base font-bold text-[#2D1F23] hover:text-[#63474D] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#63474D]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-[#F4EFEB] bg-[#FAF7F5]/40 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FadeIn>
      </section>

      {/* Direct Communication Bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-16">
        <FadeIn direction="up">
          <div className="rounded-3xl bg-[#FAF7F5] border border-[#E8DDD7] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-serif text-lg sm:text-xl font-bold text-[#2D1F23]">
                Prefer to email us directly?
              </h4>
              <p className="text-xs sm:text-sm text-gray-600">
                You can write to us directly anytime from your personal email client.
              </p>
            </div>
            <a
              href="mailto:sheebanet.events@gmail.com"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#63474D] text-white text-xs font-bold shadow-md hover:bg-[#523a3f] transition-all cursor-pointer whitespace-nowrap"
            >
              <Mail className="w-4 h-4 text-[#FFA686]" />
              <span>sheebanet.events@gmail.com</span>
            </a>
          </div>
        </FadeIn>
      </section>
    </div>
  );
};
