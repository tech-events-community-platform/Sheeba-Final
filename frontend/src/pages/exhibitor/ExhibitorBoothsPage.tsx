import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  Layers,
  Calendar,
  MapPin,
  Check,
  Clock,
  AlertCircle,
  CreditCard,
  Plus,
  Users,
  ExternalLink,
  Store,
} from 'lucide-react';

export const ExhibitorBoothsPage: React.FC = () => {
  const [filterTab, setFilterTab] = useState<'all' | 'confirmed' | 'pending' | 'awaiting_payment'>('all');

  // Sample/initial booth applications to showcase for teammates
  const [booths] = useState<any[]>([
    {
      id: 'app_1',
      eventTitle: 'Addis Tech Expo 2026',
      eventDate: '2026-11-15',
      eventLocation: 'Millennium Hall, Addis Ababa',
      spaceSqm: 4,
      boothNumber: 'B-14',
      status: 'confirmed',
      totalAmount: 5200,
      paymentStatus: 'paid',
      showcaseDescription: 'Demonstration of cloud infrastructure tools and developer APIs.',
    },
    {
      id: 'app_2',
      eventTitle: 'Ethiopian AI & Robotics Summit',
      eventDate: '2026-12-05',
      eventLocation: 'Skylight Hotel, Addis Ababa',
      spaceSqm: 2,
      boothNumber: 'Unassigned',
      status: 'accepted_awaiting_payment',
      totalAmount: 2600,
      paymentStatus: 'unpaid',
      showcaseDescription: 'Robotic educational kits and hardware starter packs.',
    },
    {
      id: 'app_3',
      eventTitle: 'Fintech Innovation Forum',
      eventDate: '2027-01-20',
      eventLocation: 'UNECA Conference Center, Addis Ababa',
      spaceSqm: 3,
      boothNumber: 'Unassigned',
      status: 'pending',
      totalAmount: 3900,
      paymentStatus: 'unpaid',
      showcaseDescription: 'Payment gateway SDK and mobile wallet checkout demos.',
    },
  ]);

  const filteredBooths = booths.filter((b) => {
    if (filterTab === 'confirmed') return b.status === 'confirmed';
    if (filterTab === 'pending') return b.status === 'pending';
    if (filterTab === 'awaiting_payment') return b.status === 'accepted_awaiting_payment';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
            Exhibitor Dashboard
          </span>
          <h1 className="font-serif font-black text-2xl sm:text-3xl text-[#2D1F23]">
            My Booths & Applications
          </h1>
          <p className="text-xs text-gray-500">
            Track your booth applications, payment approvals, and allocated floor spaces.
          </p>
        </div>

        <Link to="/exhibitor/explore">
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
            Explore More Events
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'all', label: 'All Bookings', count: booths.length },
          { id: 'confirmed', label: 'Confirmed (Paid)', count: booths.filter((b) => b.status === 'confirmed').length },
          { id: 'awaiting_payment', label: 'Awaiting Payment', count: booths.filter((b) => b.status === 'accepted_awaiting_payment').length },
          { id: 'pending', label: 'Under Review', count: booths.filter((b) => b.status === 'pending').length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === tab.id
                ? 'bg-[#63474D] text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Booth Cards */}
      <div className="space-y-4">
        {filteredBooths.map((booth) => (
          <div
            key={booth.id}
            className="bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4 hover:shadow-md transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-[#2D1F23]">
                    {booth.eventTitle}
                  </h3>
                  {booth.status === 'confirmed' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Confirmed & Active
                    </span>
                  ) : booth.status === 'accepted_awaiting_payment' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      Accepted • Awaiting Payment
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Under Review
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {booth.eventDate}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {booth.eventLocation}
                  </span>
                </div>
              </div>

              {/* Booth Number & Space */}
              <div className="flex items-center gap-3 bg-[#FAF7F5] px-4 py-2 rounded-2xl border border-gray-100 self-start sm:self-auto">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Booth</span>
                  <strong className="text-xs text-[#2D1F23] font-mono">{booth.boothNumber}</strong>
                </div>
                <div className="w-px h-6 bg-gray-200" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Space</span>
                  <strong className="text-xs text-[#2D1F23]">{booth.spaceSqm} m²</strong>
                </div>
                <div className="w-px h-6 bg-gray-200" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Total</span>
                  <strong className="text-xs text-emerald-700">{booth.totalAmount.toLocaleString()} ETB</strong>
                </div>
              </div>
            </div>

            {/* Showcase Note & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <p className="text-gray-600">
                <strong className="text-[#2D1F23]">Showcase:</strong> {booth.showcaseDescription}
              </p>

              <div className="flex items-center gap-2 shrink-0">
                {booth.status === 'accepted_awaiting_payment' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CreditCard className="w-3.5 h-3.5" />}
                    onClick={() => alert('Chapa payment checkout simulation will open for ' + booth.totalAmount + ' ETB.')}
                  >
                    Pay for Space ({booth.totalAmount.toLocaleString()} ETB)
                  </Button>
                )}
                {booth.status === 'confirmed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Users className="w-3.5 h-3.5" />}
                    onClick={() => alert('Booth Lead Capture Tool: You can register attendees who stop by booth ' + booth.boothNumber + '.')}
                  >
                    Log Booth Visitor
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

