import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests, useUpdateLeaveStatus } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { useUserRolesMap } from '@/hooks/useUserRolesMap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveBalanceTable } from '@/components/LeaveBalanceTable';
import { useMyLeaveBalances } from '@/hooks/useLeaveBalances';

const HODDashboard = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: balances = [] } = useMyLeaveBalances();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const { data: rolesMap = {} } = useUserRolesMap();
  const updateStatus = useUpdateLeaveStatus();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  let filtered = requests.filter(r => r.user_id !== user?.id);
  if (filterType !== 'all') filtered = filtered.filter(r => r.leave_type === filterType);
  if (searchName) {
    filtered = filtered.filter(r => {
      const name = profilesMap[r.user_id]?.full_name || '';
      return name.toLowerCase().includes(searchName.toLowerCase());
    });
  }

  const pending = filtered.filter(r => r.status === 'pending');

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
            <h1 className="text-2xl font-bold mb-1">Department Leave Requests</h1>
            <p className="text-muted-foreground text-sm">Review and manage leave applications</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Requests', value: filtered.length, icon: <ClipboardList className="w-5 h-5" />, color: 'text-primary' },
            { label: 'Pending', value: pending.length, icon: <Clock className="w-5 h-5" />, color: 'text-status-pending' },
            { label: 'Processed', value: filtered.length - pending.length, icon: <CheckCircle className="w-5 h-5" />, color: 'text-status-approved' },
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
          <h2 className="text-lg font-semibold mb-3">Leave Balance</h2>
          <LeaveBalanceTable balances={balances} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Search by faculty name..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="w-full sm:max-w-xs" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="medical">Medical</SelectItem>
              <SelectItem value="od">On-Duty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <LeaveRequestsTable
          requests={filtered}
          showActions
          showFaculty
          profilesMap={profilesMap}
          departmentsMap={departmentsMap}
          facultyClickable
          facultyBasePath="/hod"
          showRoleInsteadOfDept
          rolesMap={rolesMap}
          onApprove={(id) => {
            const req = filtered.find(r => r.id === id);
            if (req?.leave_type === 'od') return;
            updateStatus.mutate({ id, status: 'approved' });
          }}
          onReject={(id) => {
            const req = filtered.find(r => r.id === id);
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

export default HODDashboard;
