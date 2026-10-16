import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useLicenseStore, useContentStore } from "@/store/contentStore";
import { HabwaLogo } from "@/components/habwa-logo";
import { supabase } from "@/integrations/supabase/client";

const ACTIVATED_KEY = "habwa-activated";
const ADMIN_ACTIVATED_KEY = "habwa-admin-activated";
const ACTIVE_CODE_KEY = "habwa-active-code";

// Pages that don't require a signed-in account
const PUBLIC_PATHS = ["/login", "/admin-login", "/admin"];
const ADMIN_PIN_SESSION = "habwa-admin-unlocked";

function isAdminUnlocked() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(ADMIN_PIN_SESSION) === "1";
}

function isPublicPath(pathname: string) {
  // Admin has a fully independent session: once unlocked with the admin code,
  // no player account or activation key is ever required.
  if (isAdminUnlocked()) return true;
  return PUBLIC_PATHS.includes(pathname) || pathname === "/qr" || pathname.startsWith("/qr/");
}


export function GatekeeperWrapper({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { fetchFromCloud: fetchLicenses } = useLicenseStore();
  const { fetchFromCloud: fetchContent } = useContentStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    const loadCloud = async () => {
      try {
        await Promise.all([fetchLicenses(), fetchContent()]);
      } catch (error) {
        console.error("[habwa] Error fetching from cloud:", error);
      }
    };

    if (isPublicPath(pathname)) {
      setIsChecking(false);
      setIsActivated(true);
      if (isAdminUnlocked()) void loadCloud();
      return;
    }


    const checkAccess = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/login", replace: true });
        setIsChecking(false);
        return;
      }

      setIsActivated(true);
      await loadCloud();
      setIsChecking(false);
    };

    void checkAccess();
  }, [pathname, navigate, fetchLicenses, fetchContent]);


  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <HabwaLogo className="w-20 h-20 mx-auto" />
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الاشتراك...</p>
        </div>
      </div>
    );
  }

  if (isActivated || isPublicPath(pathname)) {
    return <>{children}</>;
  }

  return null;
}

export function revokeActivation() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACTIVATED_KEY);
    window.localStorage.removeItem(ADMIN_ACTIVATED_KEY);
    window.localStorage.removeItem(ACTIVE_CODE_KEY);
  }
}


export function isUserActivated(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(ACTIVATED_KEY) === "1" ||
    window.localStorage.getItem(ADMIN_ACTIVATED_KEY) === "1"
  );
}

export function isAdminActivated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_ACTIVATED_KEY) === "1";
}
