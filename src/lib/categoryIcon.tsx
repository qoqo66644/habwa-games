import {
  Scroll,
  Globe,
  FlaskConical,
  Trophy,
  BookOpen,
  Lightbulb,
  MessageSquareOff,
  Star,
  Music,
  Film,
  Gamepad2,
  Heart,
  Plane,
  Car,
  Coffee,
  Camera,
  Palette,
  Cpu,
  Building,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export const ICON_NAMES = [
  "Star",
  "Scroll",
  "Globe",
  "FlaskConical",
  "Trophy",
  "BookOpen",
  "Lightbulb",
  "MessageSquareOff",
  "Music",
  "Film",
  "Gamepad2",
  "Heart",
  "Plane",
  "Car",
  "Coffee",
  "Camera",
  "Palette",
  "Cpu",
  "Building",
  "Utensils",
] as const;

const iconMap: Record<string, LucideIcon> = {
  Scroll,
  Globe,
  FlaskConical,
  Trophy,
  BookOpen,
  Lightbulb,
  MessageSquareOff,
  Star,
  Music,
  Film,
  Gamepad2,
  Heart,
  Plane,
  Car,
  Coffee,
  Camera,
  Palette,
  Cpu,
  Building,
  Utensils,
};

interface CategoryVisualProps {
  iconKey?: string | undefined;
  iconUrl?: string | undefined;
  className?: string;
}

export function CategoryVisual({ iconKey, iconUrl, className = "" }: CategoryVisualProps) {
  // If iconUrl is provided, render image
  if (iconUrl && /^https?:\/\//i.test(iconUrl)) {
    return (
      <img
        src={iconUrl}
        alt=""
        className={`object-contain rounded ${className}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  // Otherwise render icon
  const Icon = iconMap[iconKey || "Star"] || Star;
  return <Icon className={className} />;
}
