import { useAuth } from '@/hooks/useAuth';
import { usePlatformSuperAdminCounty } from '@/contexts/PlatformSuperAdminCountyContext';
import { useAllCounties } from '@/hooks/useData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Value for "All counties" — when selected, effective county is undefined so data shows all counties. */
export const COUNTY_ALL = '_all';

/**
 * County dropdown for platform super admins — shown on every county portal page so they can filter data by county.
 * Renders nothing for non–platform-super-admin users.
 */
export function CountyFilterBar() {
  const { hasRole } = useAuth();
  const { selectedCountyId, setSelectedCountyId } = usePlatformSuperAdminCounty();
  const { data: counties = [] } = useAllCounties();

  const isPlatformSuperAdmin =
    hasRole('platform_super_admin') || hasRole('platform_admin');

  if (!isPlatformSuperAdmin) {
    return null;
  }

  const value = selectedCountyId ?? COUNTY_ALL;

  return (
    <div className="min-w-0 sm:max-w-[220px]">
      <Select
        value={value}
        onValueChange={(v) => setSelectedCountyId(v === COUNTY_ALL ? undefined : v)}
      >
        <SelectTrigger className="h-10 w-full min-h-[44px] sm:min-h-0 rounded-md px-3">
          <SelectValue placeholder="Select county" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={COUNTY_ALL}>All Counties</SelectItem>
          {counties.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
