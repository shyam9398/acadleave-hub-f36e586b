import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useForwardedAndOdRequests, useUpdateLeaveStatus } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Briefcase, CheckCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';

const PrincipalDashboard = () => {
  const { data: allRequests = [] } = useForwardedAndOdRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const updateStatus = useUpdateLeaveStatus();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const forwardedRequests = allRequests.filter(r => r.status === 'forwarded' && r.leave_type !== 'od');
  const odRequests = allRequests.filter(r => r.leave_type === 'od' && r.status === 'forwarded');

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Forwarded Requests', value: forwardedRequests.length, icon: <ClipboardList className="w-5 h-5" />, color: 'text-status-forwarded' },
            { label: 'OD Requests', value: odRequests.length, icon: <Briefcase className="w-5 h-5" />, color: 'text-status-pending' },
            { label: 'Total Processed', value: allRequests.filter(r => r.status === 'approved').length, icon: <CheckCircle className="w-5 h-5" />, color: 'text-status-approved' },
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
          <h2 className="text-lg font-semibold mb-3">Forwarded Requests</h2>
          <LeaveRequestsTable
            requests={forwardedRequests}
            showActions showFaculty profilesMap={profilesMap} departmentsMap={departmentsMap}
            actionableStatuses={['forwarded']}
            onApprove={(id) => updateStatus.mutate({ id, status: 'approved' })}
            onReject={(id) => updateStatus.mutate({ id, status: 'rejected' })}
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold">On-Duty Requests</h2>
            <Badge variant="outline" className="text-status-pending border-status-pending">Highlighted</Badge>
          </div>
          <LeaveRequestsTable
            requests={odRequests}
            showActions showFaculty profilesMap={profilesMap} departmentsMap={departmentsMap}
            actionableStatuses={['forwarded']}
            onApprove={(id) => updateStatus.mutate({ id, status: 'approved' })}
            onReject={(id) => updateStatus.mutate({ id, status: 'rejected' })}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PrincipalDashboard;
