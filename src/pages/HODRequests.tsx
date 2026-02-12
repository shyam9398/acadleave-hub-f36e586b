import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests, useUpdateLeaveStatus } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';

const HODRequests = () => {
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const updateStatus = useUpdateLeaveStatus();
  const { user } = useAuth();

  // Filter out HOD's own requests and show only pending
  const pendingRequests = requests.filter(r => r.status === 'pending' && r.user_id !== user?.id);

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
          onApprove={(id) => {
            const req = pendingRequests.find(r => r.id === id);
            if (req?.leave_type === 'od') return;
            updateStatus.mutate({ id, status: 'approved' });
          }}
          onReject={(id) => {
            const req = pendingRequests.find(r => r.id === id);
            if (req?.leave_type === 'od') return;
            updateStatus.mutate({ id, status: 'rejected' });
          }}
          onForward={(id) => updateStatus.mutate({ id, status: 'forwarded' })}
          odForwardOnly
        />
      </div>
    </DashboardLayout>
  );
};

export default HODRequests;
