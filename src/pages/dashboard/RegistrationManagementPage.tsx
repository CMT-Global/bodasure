import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RegistrationTable } from '@/components/registration/RegistrationTable';
import { RiderDetailDialog } from '@/components/registration/RiderDetailDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Filter } from 'lucide-react';
import { useRidersWithDetails, RiderWithDetails } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RegistrationManagementPage() {
  const { profile, roles } = useAuth();
  const [selectedRider, setSelectedRider] = useState<RiderWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [permitFilter, setPermitFilter] = useState<string>('all');

  // Get county_id from profile or first role
  const countyId = useMemo(() => {
    return profile?.county_id || roles.find(r => r.county_id)?.county_id || undefined;
  }, [profile, roles]);

  const { data: riders = [], isLoading } = useRidersWithDetails(countyId);

  // Enhanced search and filter
  const filteredRiders = useMemo(() => {
    return riders.filter((rider) => {
      // Status filter
      if (statusFilter !== 'all' && rider.status !== statusFilter) return false;
      
      // Compliance filter
      if (complianceFilter !== 'all' && rider.compliance_status !== complianceFilter) return false;
      
      // Permit filter
      if (permitFilter !== 'all') {
        if (permitFilter === 'has_permit' && !rider.permit) return false;
        if (permitFilter === 'no_permit' && rider.permit) return false;
        if (permitFilter !== 'has_permit' && permitFilter !== 'no_permit' && rider.permit?.status !== permitFilter) return false;
      }
      
      // Search query - search by name, phone, ID, or bike plate
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = rider.full_name.toLowerCase().includes(query);
        const matchesPhone = rider.phone.toLowerCase().includes(query);
        const matchesId = rider.id_number.toLowerCase().includes(query);
        const matchesBikePlate = rider.motorbike?.registration_number.toLowerCase().includes(query) || false;
        
        if (!matchesName && !matchesPhone && !matchesId && !matchesBikePlate) {
          return false;
        }
      }
      
      return true;
    });
  }, [riders, searchQuery, statusFilter, complianceFilter, permitFilter]);

  const handleView = (rider: RiderWithDetails) => {
    setSelectedRider(rider);
    setIsDetailOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Registration Management</h1>
            <p className="text-muted-foreground">
              View and manage all registered riders • {filteredRiders.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, ID, or bike plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={complianceFilter} onValueChange={setComplianceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Compliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Compliance</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                <SelectItem value="pending_review">Under Review</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>

            <Select value={permitFilter} onValueChange={setPermitFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Permit Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Permits</SelectItem>
                <SelectItem value="has_permit">Has Permit</SelectItem>
                <SelectItem value="no_permit">No Permit</SelectItem>
                <SelectItem value="active">Active Permit</SelectItem>
                <SelectItem value="expired">Expired Permit</SelectItem>
                <SelectItem value="pending">Pending Permit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table/Cards */}
        <RegistrationTable
          riders={filteredRiders}
          onView={handleView}
          isLoading={isLoading}
        />

        {/* Detail Dialog */}
        <RiderDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          rider={selectedRider}
          showStatusActions
        />
      </div>
    </DashboardLayout>
  );
}
