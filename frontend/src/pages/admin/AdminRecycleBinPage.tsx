import React from 'react';
import { RecycleBinView } from '../../components/recycleBin/RecycleBinView';

export const AdminRecycleBinPage: React.FC = () => {
  return (
    <RecycleBinView
      role="ADMIN"
      title="Platform Recycle Bin & Governance"
      subtitle="Administrative oversight of soft-deleted platform entities, retention policy purge, and complete audit trail logs."
    />
  );
};
