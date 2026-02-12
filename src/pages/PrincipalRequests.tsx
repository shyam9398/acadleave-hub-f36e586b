import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useForwardedAndOdRequests } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';

const PrincipalRequests = () => {
  const { user } = useAuth();
  const { data: allRequests = [] } = useForwardedAndOdRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();

  // Full history: only leaves approved/rejected by this principal
  const historyRequests = allRequests
    .filter(r => (r.status === 'approved' || r.status === 'rejected') && r.approved_by === user?.id)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Leave History</h1>
          <p className="text-muted-foreground text-sm">All leaves approved or rejected by you</p>
        </div>
        <LeaveRequestsTable
          requests={historyRequests}
          showFaculty profilesMap={profilesMap} departmentsMap={departmentsMap}
          showDeptForPrincipal
        />
      </div>
    </DashboardLayout>
  );
};

export default PrincipalRequests;
