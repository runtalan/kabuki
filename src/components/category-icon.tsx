'use client';

import {
  ShoppingCart,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Zap,
  Popcorn,
  Heart,
  BookOpen,
  ArrowLeftRight,
  FileText,
  Activity,
  Plane,
  Clock,
  TrendingUp,
  Wallet,
  CreditCard,
  PiggyBank,
  Home,
  Monitor,
  Gamepad2,
  Coffee,
  Dumbbell,
  Pill,
  Music,
  GraduationCap,
  Briefcase,
  DollarSign,
  Eye,
  Gift,
  Scissors,
  Smartphone,
  Sofa,
  Film,
  Megaphone,
  MapPin,
  Folder,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  ShoppingCart,
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Zap,
  Popcorn,
  Heart,
  BookOpen,
  ArrowLeftRight,
  FileText,
  Activity,
  Plane,
  Clock,
  TrendingUp,
  Wallet,
  CreditCard,
  PiggyBank,
  Home,
  Monitor,
  Gamepad2,
  Coffee,
  Dumbbell,
  Pill,
  Music,
  GraduationCap,
  Briefcase,
  DollarSign,
  Eye,
  Gift,
  Scissors,
  Smartphone,
  Sofa,
  Film,
  Megaphone,
  MapPin,
  folder: Folder,
};

interface CategoryIconProps {
  icon?: string | null;
  color?: string | null;
  className?: string;
}

export function CategoryIcon({ icon, color, className = 'w-4 h-4' }: CategoryIconProps) {
  const Icon = (icon && CATEGORY_ICON_MAP[icon]) || Folder;
  return <Icon className={className} style={color ? { color } : undefined} />;
}
