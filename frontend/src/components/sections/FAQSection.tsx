import React, { useState } from 'react';
import FadeIn from '../FadeIn';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'What is Sheeba?',
    answer:
      'Sheeba is an all-in-one event platform built in Ethiopia. It helps people discover gatherings, workshops, and hackathons, while giving organizers tools to manage registrations, scan tickets at the door, and issue verified participation badges.',
  },
  {
    question: 'How do I get my ticket after registering?',
    answer:
      'As soon as you register for an event, your digital ticket pass is created with a unique QR code. You can access and show your ticket on your phone anytime from your account or the event confirmation page.',
  },
  {
    question: 'How does check-in work at the venue entrance?',
    answer:
      'Just open your digital ticket on your phone and show the QR code at the entrance. The organizer scans it in less than a second to confirm your entry—no paper tickets or waiting in long lines.',
  },
  {
    question: 'Can anyone host an event on Sheeba?',
    answer:
      'Yes! Anyone can sign up as an organizer to host community meetups, workshops, hackathons, or national summits. You can create registration links, track attendee counts, and scan guests at the door.',
  },
  {
    question: 'What are verified participation badges?',
    answer:
      'When your ticket is scanned at the event door, Sheeba automatically issues an official digital badge confirming you attended. You can view and share these badges on your profile as proof of your participation.',
  },
  {
    question: 'How do sponsorships and exhibition booths work?',
    answer:
      'Companies can discover upcoming events looking for corporate backing, partner with organizers, or reserve physical booth spaces on the exhibition floor to demo products directly to attendees.',
  },
  {
    question: 'Is Sheeba free to use?',
    answer:
      'Yes! Browsing publicized events, creating an account, and registering for free community events is completely free. Organizers can also host free community meetups at no platform charge.',
  },
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-28">
      <FadeIn direction="up">
        {/* Simple & Clean Header */}
        <div className="text-center space-y-3 mb-10 sm:mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D1F23] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-[#756366] max-w-xl mx-auto leading-relaxed">
            Everything you need to know about discovering, attending, and hosting events on Sheeba.
          </p>
        </div>

        {/* Simplistic Accordion */}
        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="bg-white border border-[#E8DDD7] rounded-2xl overflow-hidden transition-all duration-200 hover:border-[#AA767C]/50"
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(index)}
                  className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif font-bold text-base sm:text-lg text-[#2D1F23]">
                    {faq.question}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? 'bg-[#63474D] text-white rotate-180'
                        : 'bg-[#FAF7F5] text-[#756366] border border-[#E8DDD7]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 text-xs sm:text-sm text-[#756366] leading-relaxed border-t border-gray-50 animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FadeIn>
    </section>
  );
};
