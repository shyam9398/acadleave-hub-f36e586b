import DashboardLayout from '@/components/DashboardLayout';
import { LeaveBalanceTable } from '@/components/LeaveBalanceTable';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useMyLeaveRequests } from '@/hooks/useLeaveRequests';
import { useMyLeaveBalances } from '@/hooks/useLeaveBalances';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const FacultyDashboard = () => {
  const { data: requests = [] } = useMyLeaveRequests();
  const { data: balances = [] } = useMyLeaveBalances();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'approved').length,
    pending: requests.filter(r => r.status === 'pending').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const recentRequests = requests.slice(0, 4);

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
            <h1 className="text-2xl font-bold mb-1">Leave Overview</h1>
            <p className="text-muted-foreground text-sm">Track your leave balance and history</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Applied', value: stats.total, icon: <CalendarDays className="w-5 h-5" />, color: 'text-primary' },
            { label: 'Approved', value: stats.approved, icon: <CheckCircle className="w-5 h-5" />, color: 'text-status-approved' },
            { label: 'Pending', value: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'text-status-pending' },
            { label: 'Rejected', value: stats.rejected, icon: <XCircle className="w-5 h-5" />, color: 'text-status-rejected' },
          ].map((stat) => (
            <Card key={stat.label} className="border border-border">
              <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
                <div className={stat.color}>{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
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
          <h2 className="text-lg font-semibold mb-3">Recent Leave History</h2>
          <LeaveRequestsTable requests={recentRequests} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FacultyDashboard;
