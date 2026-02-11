import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Bell, Download, Printer, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AssistantDashboard = () => {
  const { toast } = useToast();
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();

  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'approved').length,
    pending: requests.filter(r => r.status === 'pending').length,
  };

  const handleDownload = () => {
    const headers = ['S.No', 'Faculty', 'Type', 'From', 'To', 'Days', 'Reason', 'Status'];
    const rows = requests.map((r, i) => [
      i + 1,
      profilesMap[r.user_id]?.full_name || 'Unknown',
      r.leave_type,
      r.from_date,
      r.to_date,
      r.number_of_days,
      `"${r.reason.replace(/"/g, '""')}"`,
      r.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leave_records.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Leave records downloaded as CSV.' });
  };

  const handleShare = async () => {
    const text = requests.map((r, i) => {
      const name = profilesMap[r.user_id]?.full_name || 'Unknown';
      return `${i + 1}. ${name} - ${r.leave_type} (${r.from_date} to ${r.to_date}) - ${r.status}`;
    }).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Leave Records', text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: 'Leave records copied to clipboard for sharing.' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">Department Leave Records</h1>
            <p className="text-muted-foreground text-sm">Your department's leave records and status summaries</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" /> Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" /> Share
            </Button>
          </div>
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

export default AssistantDashboard;
