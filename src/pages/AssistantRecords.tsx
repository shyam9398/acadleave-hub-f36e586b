import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Printer, Share2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

const AssistantRecords = () => {
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filteredRequests = useMemo(() => {
    if (!fromDate && !toDate) return requests;
    return requests.filter(r => {
      if (fromDate && r.from_date < fromDate) return false;
      if (toDate && r.to_date > toDate) return false;
      return true;
    });
  }, [requests, fromDate, toDate]);

  const handleDownload = () => {
    const headers = ['S.No', 'Faculty', 'Type', 'From', 'To', 'Days', 'Reason', 'Status'];
    const rows = filteredRequests.map((r, i) => [
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
    a.download = `leave_records${fromDate ? `_from_${fromDate}` : ''}${toDate ? `_to_${toDate}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Leave records downloaded as CSV.' });
  };

  const handleShare = async () => {
    const text = filteredRequests.map((r, i) => {
      const name = profilesMap[r.user_id]?.full_name || 'Unknown';
      return `${i + 1}. ${name} - ${r.leave_type} (${r.from_date} to ${r.to_date}) - ${r.status}`;
    }).join('\n');

    if (navigator.share) {
      try { await navigator.share({ title: 'Leave Records', text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: 'Leave records copied to clipboard for sharing.' });
    }
  };

  const handlePrint = () => window.print();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Department Leave Records</h1>
            <p className="text-muted-foreground text-sm">Your department's leave records</p>
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

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-44" />
          </div>
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>
              Clear
            </Button>
          )}
        </div>

        <LeaveRequestsTable
          requests={filteredRequests}
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
