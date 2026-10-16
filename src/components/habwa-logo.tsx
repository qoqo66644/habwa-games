import habwaLogo from "@/assets/habwa-logo.png.asset.json";

interface HabwaLogoProps {
  /** Pixel size of the rendered square logo */
  className?: string;
}

/**
 * Official HABWA brand mark. Always rendered square (object-contain) so the
 * artwork is never stretched or cropped, on a light plate so the gold lines
 * stay readable in both light and dark mode.
 */
export function HabwaLogo({ className = "w-10 h-10" }: HabwaLogoProps) {
  return (
    <img
      src={habwaLogo.url}
      alt="شعار حبوة"
      loading="eager"
      className={`${className} object-contain rounded-2xl bg-card p-0.5 shadow-sm`}
    />
  );
}
