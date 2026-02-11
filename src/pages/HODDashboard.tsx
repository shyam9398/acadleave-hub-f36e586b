import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests, useUpdateLeaveStatus } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Clock, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const HODDashboard = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const updateStatus = useUpdateLeaveStatus();

  let filtered = requests;
  if (filterType !== 'all') filtered = filtered.filter(r => r.leave_type === filterType);
  if (searchName) {
    filtered = filtered.filter(r => {
      const name = profilesMap[r.user_id]?.full_name || '';
      return name.toLowerCase().includes(searchName.toLowerCase());
    });
  }

  const pending = requests.filter(r => r.status === 'pending');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Department Leave Requests</h1>
          <p className="text-muted-foreground text-sm">Review and manage leave applications</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Requests', value: requests.length, icon: <ClipboardList className="w-5 h-5" />, color: 'text-primary' },
            { label: 'Pending', value: pending.length, icon: <Clock className="w-5 h-5" />, color: 'text-status-pending' },
            { label: 'Processed', value: requests.length - pending.length, icon: <CheckCircle className="w-5 h-5" />, color: 'text-status-approved' },
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

        <div className="flex gap-3">
          <Input placeholder="Search by faculty name..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="max-w-xs" />
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
          onApprove={(id) => updateStatus.mutate({ id, status: 'approved' })}
          onReject={(id) => updateStatus.mutate({ id, status: 'rejected' })}
          onForward={(id) => updateStatus.mutate({ id, status: 'forwarded' })}
        />
      </div>
    </DashboardLayout>
  );
};

export default HODDashboard;
