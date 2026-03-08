import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Bell, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LeaveBalanceTable } from '@/components/LeaveBalanceTable';
import { useMyLeaveBalances } from '@/hooks/useLeaveBalances';
import { useAuth } from '@/contexts/AuthContext';

const AssistantDashboard = () => {
  const { user } = useAuth();
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: balances = [] } = useMyLeaveBalances();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Count faculty in same department
  const { data: facultyCount = 0 } = useQuery({
    queryKey: ['dept-faculty-count', user?.departmentId],
    enabled: !!user?.departmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('department_id', user!.departmentId!);
      if (error) throw error;
      return data as unknown as number;
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();

  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'approved').length,
    pending: requests.filter(r => r.status === 'pending').length,
  };

  // Show only today's recent leave history
  const today = new Date().toISOString().split('T')[0];
  const todayRequests = requests.filter(r => r.created_at.startsWith(today));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">Department Leave Records</h1>
            <p className="text-muted-foreground text-sm">Your department's leave records and status summaries</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Records', value: stats.total, icon: <FileText className="w-5 h-5" />, color: 'text-primary' },
            { label: 'Approved', value: stats.approved, icon: <Users className="w-5 h-5" />, color: 'text-status-approved' },
            { label: 'Pending', value: stats.pending, icon: <Bell className="w-5 h-5" />, color: 'text-status-pending' },
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

        <div>
          <h2 className="text-lg font-semibold mb-3">Today's Leave History</h2>
          <LeaveRequestsTable
            requests={todayRequests}
            showFaculty
            profilesMap={profilesMap}
            departmentsMap={departmentsMap}
            facultyClickable
            facultyBasePath="/assistant"
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssistantDashboard;
