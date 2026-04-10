import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Edit3, Eye, UserMinus } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { resolveDisplayName, roleConfig } from '../../../lib/userUtils';
import { useTripData } from '../../../contexts/TripDataContext';

interface MemberItemProps {
  key?: React.Key;
  uid: string;
  role: string;
  isMe: boolean;
  isOwner: boolean;
  displayName: string;
  onRoleChange: (uid: string, newRole: string) => void;
  onRemoveMember: (uid: string) => void;
}

export function MemberItem({
  uid,
  role,
  isMe,
  isOwner,
  displayName,
  onRoleChange,
  onRemoveMember
}: MemberItemProps) {
  const { user } = useAuth();
  const { memberProfiles } = useTripData();
  const { t, language } = useLanguage();
  const config = (roleConfig as any)[role] || roleConfig.viewer;
  const RoleIcon = config.icon;

  const resolvedName = resolveDisplayName(uid, user?.uid, memberProfiles, t('you'));

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`${config.bg} p-2 rounded-full`}>
          <RoleIcon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {resolvedName}
            {isMe && <span className="ml-1 text-xs text-gray-400">({t('me')})</span>}
          </p>
          <p className={`text-xs ${config.color} font-medium`}>
            {language === 'th' ? config.thLabel : config.label}
          </p>
        </div>
      </div>

      {isOwner && !isMe && (
        <div className="flex items-center gap-1.5">
          <select
            className="text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={role}
            onChange={(e) => onRoleChange(uid, e.target.value)}
          >
            <option value="editor">{language === 'th' ? 'แก้ไขได้' : 'Editor'}</option>
            <option value="viewer">{language === 'th' ? 'ดูได้อย่างเดียว' : 'Viewer'}</option>
          </select>
        </div>
      )}
    </div>
  );
}
