import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiderOwnerLayout } from '@/components/layout/RiderOwnerLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useRiderOwnerDashboard,
  EXPIRING_SOON_DAYS,
  type RiderOwnerDashboardData,
} from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock, Shield, XCircle, CreditCard, FileWarning } from 'lucide-react';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

type PermitDisplayStatus = 'active' | 'expired' | 'expiring_soon' | 'pending' | 'none';

function getPermitDisplayStatus(
  permit: RiderOwnerDashboardData['permits'][0] | undefined
): PermitDisplayStatus {
  if (!permit) return 'none';
  if (permit.status === 'pending') return 'pending';
  if (permit.status === 'expired') return 'expired';
  if (permit.status === 'active' && permit.expires_at) {
    const expiresAt = parseISO(permit.expires_at);
    if (isAfter(new Date(), expiresAt)) return 'expired';
    if (isAfter(addDays(new Date(), EXPIRING_SOON_DAYS), expiresAt)) return 'expiring_soon';
    return 'active';
  }
  return permit.status === 'active' ? 'active' : 'none';
}

type OverallStatus = 'compliant' | 'expiring_soon' | 'non_compliant';

function useComplianceState() {
  const { user } = useAuth();
  const { data, isLoading, error } = useRiderOwnerDashboard(user?.id);

  return useMemo(() => {
    if (!data?.rider) {
      return {
        rider: null,
        overall: null as OverallStatus | null,
        reasons: [] as string[],
        permitStatus: 'none' as PermitDisplayStatus,
        permitExpiry: null as string | null,
        score: 0,
        scoreExplanation: '',
        outstandingCount: 0,
        outstandingTotal: 0,
        isLoading,
        error,
      };
    }

    const { rider, permits, outstandingPenalties, outstandingPenaltiesTotal } = data;
    const latestPermit = permits?.[0];
    const permitStatus = getPermitDisplayStatus(latestPermit);
    const permitExpiry = latestPermit?.expires_at
      ? format(parseISO(latestPermit.expires_at), 'dd MMM yyyy')
      : null;

    const hasExpiredPermit = permitStatus === 'expired';
    const hasUnpaidPenalties = outstandingPenalties.length > 0;
    const isExpiringSoon = permitStatus === 'expiring_soon' && !hasExpiredPermit && !hasUnpaidPenalties;
    const isSystemNonCompliant =
      rider.compliance_status === 'non_compliant' || rider.compliance_status === 'blacklisted';

    const reasons: string[] = [];
    if (hasExpiredPermit) reasons.push('Permit expired');
    if (hasUnpaidPenalties) reasons.push('Unpaid penalties');

    let overall: OverallStatus = 'compliant';
    if (hasExpiredPermit || hasUnpaidPenalties || isSystemNonCompliant) {
      overall = 'non_compliant';
    } else if (isExpiringSoon) {
      overall = 'expiring_soon';
    }

    // Compliance score (0–100)
    let score = 100;
    score -= outstandingPenalties.length * 10;
    if (hasExpiredPermit || (latestPermit && latestPermit.status === 'expired')) score -= 20;
    if (rider.compliance_status === 'blacklisted') score = 0;
    else if (rider.compliance_status === 'non_compliant') score = Math.min(score, 40);
    else if (rider.compliance_status === 'pending_review') score = Math.min(score, 60);
    score = Math.max(0, Math.min(100, score));

    const parts: string[] = [];
    if (hasExpiredPermit) parts.push('expired permit');
    if (outstandingPenalties.length) parts.push(`${outstandingPenalties.length} unpaid penalty(ies)`);
    if (rider.compliance_status === 'blacklisted') parts.push('blacklist status');
    else if (rider.compliance_status === 'non_compliant') parts.push('non-compliant record');
    else if (rider.compliance_status === 'pending_review') parts.push('pending review');
    const scoreExplanation = parts.length
      ? `Based on ${parts.join(', ')}.`
      : 'Based on your permit status, unpaid penalties, and compliance record.';

    return {
      rider: data.rider,
      overall,
      reasons,
      permitStatus,
      permitExpiry,
      score,
      scoreExplanation,
      outstandingCount: outstandingPenalties.length,
      outstandingTotal: outstandingPenaltiesTotal,
      isLoading,
      error,
    };
  }, [data, isLoading, error]);
}

function ComplianceStatusContent() {
  const navigate = useNavigate();
  const state = useComplianceState();

  if (state.error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">Failed to load compliance status</p>
        <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div className="space-y-4 max-w-full min-w-0">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!state.rider) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center max-w-md mx-auto">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No rider profile linked</h2>
        <p className="text-sm text-muted-foreground">
          Your account is not linked to a rider record. Contact your Sacco or county admin to link
          your profile.
        </p>
      </div>
    );
  }

  const statusConfig = {
    compliant: {
      icon: CheckCircle,
      label: 'Compliant',
      description: 'Your permit is active and you have no outstanding penalties.',
      className: 'bg-success/10 border-success/30 text-success',
      iconClassName: 'text-success',
    },
    expiring_soon: {
      icon: Clock,
      label: 'Expiring soon',
      description: `Your permit expires within ${EXPIRING_SOON_DAYS} days. Renew to stay compliant.`,
      className: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
      iconClassName: 'text-amber-600 dark:text-amber-400',
    },
    non_compliant: {
      icon: XCircle,
      label: 'Non-compliant',
      description: 'Address the issues below to restore compliance.',
      className: 'bg-destructive/10 border-destructive/30 text-destructive',
      iconClassName: 'text-destructive',
    },
  };

  const config = statusConfig[state.overall];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6 max-w-full min-w-0 overflow-x-hidden">
      {/* Overall status */}
      <Card className={cn('border-2', config.className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn('h-8 w-8 shrink-0', config.iconClassName)} />
            <div>
              <CardTitle className="text-lg">{config.label}</CardTitle>
              <CardDescription className="mt-0.5">{config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Reasons for non-compliance */}
      {state.reasons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Reasons for non-compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {state.reasons.map((r) => (
                <li key={r} className="flex items-center gap-2 text-destructive">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
              {state.reasons.includes('Permit expired') && (
                <Button
                  size="sm"
                  onClick={() => navigate('/rider-owner/permit-payments')}
                  className="gap-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
                >
                  <CreditCard className="h-4 w-4 shrink-0" />
                  Renew permit
                </Button>
              )}
              {state.reasons.includes('Unpaid penalties') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/rider-owner/penalties-payments')}
                  className="gap-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
                >
                  <CreditCard className="h-4 w-4 shrink-0" />
                  Pay penalties
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permit & penalties summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription>Permit and penalty details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Permit status</span>
            <span
              className={cn(
                'font-medium',
                state.permitStatus === 'expired' && 'text-destructive',
                state.permitStatus === 'expiring_soon' && 'text-amber-600 dark:text-amber-400'
              )}
            >
              {state.permitStatus === 'active'
                ? 'Active'
                : state.permitStatus === 'expiring_soon'
                  ? 'Expiring soon'
                  : state.permitStatus === 'expired'
                    ? 'Expired'
                    : state.permitStatus === 'pending'
                      ? 'Pending'
                      : '—'}
            </span>
          </div>
          {state.permitExpiry && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Permit expiry</span>
              <span className="font-medium">{state.permitExpiry}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unpaid penalties</span>
            <span className={cn('font-medium', state.outstandingCount > 0 && 'text-destructive')}>
              {state.outstandingCount > 0
                ? `${state.outstandingCount} (${new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                  }).format(state.outstandingTotal)})`
                : 'None'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Compliance score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance score
          </CardTitle>
          <CardDescription>{state.scoreExplanation}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold',
                state.score >= 70 && 'bg-success/20 text-success',
                state.score >= 40 && state.score < 70 && 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
                state.score < 40 && 'bg-destructive/20 text-destructive'
              )}
            >
              {state.score}
            </div>
            <p className="text-sm text-muted-foreground">
              Score is out of 100. It reflects permit status, unpaid penalties, and your compliance
              record.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ComplianceStatusPage() {
  return (
    <RiderOwnerLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Compliance status</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your compliance status, reasons for non-compliance, and score.
          </p>
        </div>
        <ComplianceStatusContent />
      </div>
    </RiderOwnerLayout>
  );
}
