import React from 'react';
import { RecycleBinView } from '../../components/recycleBin/RecycleBinView';
import { Calendar, Ticket, HandCoins, Store } from 'lucide-react';
import type { RecycleBinEntityType } from '../../types/recycleBin';

export const OrganizerRecycleBinPage: React.FC = () => {
  return (
    <RecycleBinView
      role="ORGANIZER"
      title="Organizer Recycle Bin"
      subtitle="Recover your deleted events, attendee roster registrations, sponsorship pitches, and exhibitor booths within 30 days."
      allowedEntityTypes={[
        { type: 'event' as RecycleBinEntityType, label: 'Events', icon: Calendar },
        { type: 'registration' as RecycleBinEntityType, label: 'Attendee Roster', icon: Ticket },
        { type: 'sponsorship_application' as RecycleBinEntityType, label: 'Sponsorship Pitches', icon: HandCoins },
        { type: 'event_vendor' as RecycleBinEntityType, label: 'Exhibitor Booths', icon: Store },
      ]}
    />
  );
};
