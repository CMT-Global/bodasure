import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { COUNTY_ALL } from '@/components/shared/CountyFilterBar';

interface PlatformSuperAdminCountyContextType {
  selectedCountyId: string | undefined;
  setSelectedCountyId: (countyId: string | undefined) => void;
}

const PlatformSuperAdminCountyContext = createContext<
  PlatformSuperAdminCountyContextType | undefined
>(undefined);

export function PlatformSuperAdminCountyProvider({ children }: { children: ReactNode }) {
  const [selectedCountyId, setSelectedCountyIdState] = useState<string | undefined>(undefined);

  const setSelectedCountyId = useCallback((countyId: string | undefined) => {
    setSelectedCountyIdState(countyId);
  }, []);

  return (
    <PlatformSuperAdminCountyContext.Provider
      value={{ selectedCountyId, setSelectedCountyId }}
    >
      {children}
    </PlatformSuperAdminCountyContext.Provider>
  );
}

export function usePlatformSuperAdminCounty() {
  const context = useContext(PlatformSuperAdminCountyContext);
  if (context === undefined) {
    throw new Error(
      'usePlatformSuperAdminCounty must be used within PlatformSuperAdminCountyProvider'
    );
  }
  return context;
}

/**
 * Effective county ID for data: platform super admin uses selected county from dropdown; others use auth county.
 * When platform super admin selects "All counties" (COUNTY_ALL), returns undefined so pages can show all-county data.
 */
export function useEffectiveCountyId(): string | undefined {
  const { countyId, hasRole } = useAuth();
  const { selectedCountyId } = usePlatformSuperAdminCounty();

  const isPlatformSuperAdmin =
    hasRole('platform_super_admin') || hasRole('platform_admin');

  if (isPlatformSuperAdmin) {
    if (selectedCountyId === undefined || selectedCountyId === COUNTY_ALL) {
      return undefined;
    }
    return selectedCountyId;
  }

  return countyId;
}
