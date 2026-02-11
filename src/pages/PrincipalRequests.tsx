import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useForwardedAndOdRequests, useUpdateLeaveStatus } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';

const PrincipalRequests = () => {
  const { data: requests = [] } = useForwardedAndOdRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const updateStatus = useUpdateLeaveStatus();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">All Requests for Approval</h1>
          <p className="text-muted-foreground text-sm">Forwarded and OD requests requiring final approval</p>
        </div>
        <LeaveRequestsTable
          requests={requests}
          showActions showFaculty profilesMap={profilesMap} departmentsMap={departmentsMap}
          actionableStatuses={['pending', 'forwarded']}
          onApprove={(id) => updateStatus.mutate({ id, status: 'approved' })}
          onReject={(id) => updateStatus.mutate({ id, status: 'rejected' })}
        />
      </div>
    </DashboardLayout>
  );
};

export default PrincipalRequests;
