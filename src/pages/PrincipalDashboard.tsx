import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useForwardedAndOdRequests, useUpdateLeaveStatus } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Briefcase, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const PrincipalDashboard = () => {
  const { user } = useAuth();
  const { data: allRequests = [] } = useForwardedAndOdRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const updateStatus = useUpdateLeaveStatus();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const forwardedRequests = allRequests.filter(r => r.status === 'forwarded' && r.leave_type !== 'od');
  const odRequests = allRequests.filter(r => r.leave_type === 'od' && r.status === 'forwarded');
  const approvedRequests = allRequests.filter(r => r.status === 'approved' && r.approved_by === user?.id);
  const rejectedRequests = allRequests.filter(r => r.status === 'rejected' && r.approved_by === user?.id);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Principal Dashboard</h1>
            <p className="text-muted-foreground text-sm">Final approval for forwarded and OD leave requests</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Forward Requests', value: forwardedRequests.length, icon: <ClipboardList className="w-5 h-5" />, color: 'text-status-forwarded' },
            { label: 'OD Requests', value: odRequests.length, icon: <Briefcase className="w-5 h-5" />, color: 'text-status-pending' },
            { label: 'Approved', value: approvedRequests.length, icon: <CheckCircle className="w-5 h-5" />, color: 'text-status-approved' },
            { label: 'Rejected', value: rejectedRequests.length, icon: <XCircle className="w-5 h-5" />, color: 'text-status-rejected' },
          ].map(s => (
            <Card key={s.label} className="border border-border">
              <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
                <div className={s.color}>{s.icon}</div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Forward Requests</h2>
          <LeaveRequestsTable
            requests={forwardedRequests}
            showActions showFaculty profilesMap={profilesMap} departmentsMap={departmentsMap}
            actionableStatuses={['forwarded']}
            showDeptForPrincipal
            onApprove={(id) => updateStatus.mutate({ id, status: 'approved' })}
            onReject={(id) => updateStatus.mutate({ id, status: 'rejected' })}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">On-Duty Requests</h2>
          <LeaveRequestsTable
            requests={odRequests}
            showActions showFaculty profilesMap={profilesMap} departmentsMap={departmentsMap}
            actionableStatuses={['forwarded']}
            showDeptForPrincipal
            onApprove={(id) => updateStatus.mutate({ id, status: 'approved' })}
            onReject={(id) => updateStatus.mutate({ id, status: 'rejected' })}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Leave History</h2>
          <LeaveRequestsTable
            requests={[...approvedRequests, ...rejectedRequests]}
            showFaculty profilesMap={profilesMap} departmentsMap={departmentsMap}
            showDeptForPrincipal
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PrincipalDashboard;
