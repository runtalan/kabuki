'use client';

import { CategoryIcon } from './category-icon';

interface MerchantAvatarProps {
  logoUrl?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  name?: string;
  className?: string; // outer circle size, e.g. "w-8 h-8"
  iconClassName?: string; // fallback category icon size, e.g. "w-3.5 h-3.5"
}

// Shared per-row avatar for anything transaction/merchant related: shows the
// cached Plaid merchant logo when we have one, falling back to the existing
// colored category-icon circle otherwise. Mirrors the InstitutionAvatar
// pattern on the Accounts page for institution logos.
export function MerchantAvatar({
  logoUrl,
  categoryIcon,
  categoryColor,
  name,
  className = 'w-8 h-8',
  iconClassName = 'w-3.5 h-3.5',
}: MerchantAvatarProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name || 'Merchant logo'}
        className={`${className} rounded-full object-contain bg-white p-1 flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${className} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{
        backgroundColor: (categoryColor || '#6b7280') + '1f',
        color: categoryColor || '#6b7280',
      }}
    >
      <CategoryIcon icon={categoryIcon} className={iconClassName} />
    </div>
  );
}
