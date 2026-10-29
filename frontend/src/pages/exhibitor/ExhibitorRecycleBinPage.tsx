import React from 'react';
import { RecycleBinView } from '../../components/recycleBin/RecycleBinView';
import { Store } from 'lucide-react';
import type { RecycleBinEntityType } from '../../types/recycleBin';

export const ExhibitorRecycleBinPage: React.FC = () => {
  return (
    <RecycleBinView
      role="EXHIBITOR"
      title="Exhibitor Recycle Bin"
      subtitle="Recover your deleted booth applications, vendor placements, and booking requests within 30 days."
      allowedEntityTypes={[
        { type: 'event_vendor' as RecycleBinEntityType, label: 'Booth Bookings', icon: Store },
      ]}
    />
  );
};
