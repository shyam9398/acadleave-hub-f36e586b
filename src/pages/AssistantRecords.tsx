import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';

const AssistantRecords = () => {
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Department Leave Records</h1>
          <p className="text-muted-foreground text-sm">Your department's leave records</p>
        </div>
        <LeaveRequestsTable
          requests={requests}
          showFaculty
          profilesMap={profilesMap}
          departmentsMap={departmentsMap}
          facultyClickable
          facultyBasePath="/assistant"
        />
      </div>
    </DashboardLayout>
  );
};

export default AssistantRecords;
