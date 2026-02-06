import { useMemo, useState, useEffect } from 'react';
import { SaccoPortalLayout } from '@/components/layout/SaccoPortalLayout';
import { MemberProfileDialog } from '@/components/sacco/MemberProfileDialog';
import { RegistrationTable } from '@/components/registration/RegistrationTable';
import { useSaccos, useSaccoMembers, RiderWithDetails } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Download } from 'lucide-react';

export default function MemberManagementPage() {
  const { profile, roles } = useAuth();
  const countyId = useMemo(
    () => profile?.county_id ?? roles.find((r) => r.county_id)?.county_id ?? undefined,
    [profile, roles]
  );

  const { data: saccos = [], isLoading: saccosLoading } = useSaccos(countyId);
  const [saccoId, setSaccoId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (saccos.length > 0 && !saccoId) setSaccoId(saccos[0].id);
    if (saccos.length === 0) setSaccoId(undefined);
  }, [saccos, saccoId]);

  const { data: members = [], isLoading: membersLoading } = useSaccoMembers(saccoId, countyId);

  const [selectedMember, setSelectedMember] = useState<RiderWithDetails | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (stageFilter !== 'all' && m.stage_id !== stageFilter) return false;
      if (complianceFilter !== 'all' && m.compliance_status !== complianceFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      const trimmed = searchQuery.trim();
      if (trimmed) {
        const q = trimmed.toLowerCase();
        const name = String(m.full_name ?? '').toLowerCase();
        const idNumRaw = String(m.id_number ?? '').toLowerCase();
        const idNumDigits = idNumRaw.replace(/\D/g, '');
        const qDigits = q.replace(/\D/g, '');
        const phoneStr = String(m.phone ?? '').toLowerCase();
        const plate = String(m.motorbike?.registration_number ?? '').toLowerCase();
        const matchName = name.includes(q);
        const matchId = idNumRaw.includes(q) || (qDigits.length > 0 && idNumDigits.includes(qDigits));
        const matchPhone = phoneStr.includes(q) || (qDigits.length > 0 && phoneStr.replace(/\D/g, '').includes(qDigits));
        const matchPlate = plate.includes(q);
        if (!matchName && !matchId && !matchPhone && !matchPlate) return false;
      }
      return true;
    });
  }, [members, searchQuery, stageFilter, complianceFilter, statusFilter]);

  const stageOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    members
      .filter((m) => m.stage_id && m.stage?.name)
      .forEach((m) => map.set(m.stage_id!, { id: m.stage_id!, name: m.stage!.name! }));
    return Array.from(map.values());
  }, [members]);

  const handleView = (rider: RiderWithDetails) => {
    setSelectedMember(rider);
    setIsProfileOpen(true);
  };

  const handleExport = () => {
    if (!filteredMembers.length) return;
    const rows = filteredMembers.map((m) => ({
      full_name: m.full_name ?? '',
      id_number: m.id_number ?? '',
      phone: m.phone ?? '',
      status: m.status ?? '',
      compliance_status: m.compliance_status ?? '',
      stage: m.stage?.name ?? '',
      sacco: m.sacco?.name ?? '',
      registration_number: m.motorbike?.registration_number ?? '',
      permit_number: m.permit?.permit_number ?? '',
      permit_status: m.permit?.status ?? '',
      permit_expires_at: m.permit?.expires_at ?? '',
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const v = row[h as keyof typeof row];
            if (v == null) return '';
            const s = String(v);
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sacco_members_${saccoId ?? 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <SaccoPortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl">Member Management</h1>
              <p className="text-muted-foreground">
                View all members • Search and filter • Open profile • Approve, suspend, or transfer
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={handleExport}
                disabled={!saccoId || membersLoading || filteredMembers.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {countyId && (
            <div className="w-full max-w-xs">
              <Select
                value={saccoId ?? ''}
                onValueChange={(v) => setSaccoId(v || undefined)}
                disabled={saccosLoading || saccos.length === 0}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder={saccosLoading ? 'Loading…' : 'Select sacco'} />
                </SelectTrigger>
                <SelectContent>
                  {saccos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, phone, or plate…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                <Filter className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {stageOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={complianceFilter} onValueChange={setComplianceFilter}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                <SelectValue placeholder="Compliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All compliance</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="non_compliant">Non-compliant</SelectItem>
                <SelectItem value="pending_review">Under review</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!countyId ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No county linked. Contact an administrator.
          </div>
        ) : (saccos.length === 0 && !saccosLoading) ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No saccos in your county.
          </div>
        ) : !saccoId ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            Select a sacco to manage members.
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} • View profile
              to see permit status, penalties, compliance history, and to approve, suspend, or
              transfer.
            </p>
            <RegistrationTable
              riders={filteredMembers}
              onView={handleView}
              isLoading={membersLoading}
            />
          </>
        )}

        <MemberProfileDialog
          open={isProfileOpen}
          onOpenChange={setIsProfileOpen}
          rider={selectedMember}
          countyId={countyId}
          saccoId={saccoId}
        />
      </div>
    </SaccoPortalLayout>
  );
}
