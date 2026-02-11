import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests, useUpdateLeaveStatus } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';

const HODRequests = () => {
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const updateStatus = useUpdateLeaveStatus();
  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Pending Leave Requests</h1>
          <p className="text-muted-foreground text-sm">All pending requests requiring your action</p>
        </div>
        <LeaveRequestsTable
          requests={pendingRequests}
          showActions
          showFaculty
          profilesMap={profilesMap}
          departmentsMap={departmentsMap}
          facultyClickable
          facultyBasePath="/hod"
          onApprove={(id) => updateStatus.mutate({ id, status: 'approved' })}
          onReject={(id) => updateStatus.mutate({ id, status: 'rejected' })}
          onForward={(id) => updateStatus.mutate({ id, status: 'forwarded' })}
        />
      </div>
    </DashboardLayout>
  );
};

export default HODRequests;
