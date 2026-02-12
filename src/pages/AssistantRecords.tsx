import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { useDepartmentLeaveRequests } from '@/hooks/useLeaveRequests';
import { useProfilesMap, useDepartmentsMap } from '@/hooks/useProfiles';
import { useUserRolesMap } from '@/hooks/useUserRolesMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Printer, Share2 } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

const AssistantRecords = () => {
  const { data: requests = [] } = useDepartmentLeaveRequests();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: departmentsMap = {} } = useDepartmentsMap();
  const { data: rolesMap = {} } = useUserRolesMap();
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const filteredRequests = useMemo(() => {
    if (!fromDate && !toDate) return requests;
    return requests.filter(r => {
      if (fromDate && r.from_date < fromDate) return false;
      if (toDate && r.to_date > toDate) return false;
      return true;
    });
  }, [requests, fromDate, toDate]);

  const handleDownloadPDF = () => {
    // Use browser print-to-PDF with only the table content
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Leave Records</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
      </style></head><body>
      <h2>Department Leave Records${fromDate ? ` from ${fromDate}` : ''}${toDate ? ` to ${toDate}` : ''}</h2>
      <table><thead><tr>
        <th>S.No</th><th>Faculty</th><th>Role</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>
      </tr></thead><tbody>
       ${filteredRequests.map((r, i) => {
         const name = profilesMap[r.user_id]?.full_name || 'Unknown';
         const role = rolesMap[r.user_id] || 'Faculty';
         return `<tr><td>${i+1}</td><td>${name}</td><td>${role}</td><td>${r.leave_type}</td><td>${r.from_date}</td><td>${r.to_date}</td><td>${r.number_of_days}</td><td>${r.reason}</td><td>${r.status}</td></tr>`;
      }).join('')}
      </tbody></table></body></html>
    `);
    win.document.close();
    win.print();
    toast({ title: 'PDF', description: 'Print dialog opened for PDF download.' });
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

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) { window.print(); return; }
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Leave History</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
      </style></head><body>
      <h2>Leave History</h2>
      ${printContent.querySelector('table')?.outerHTML || ''}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

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
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-1" /> PDF
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

        <div ref={printRef}>
          <LeaveRequestsTable
            requests={filteredRequests}
            showFaculty
            profilesMap={profilesMap}
            departmentsMap={departmentsMap}
            facultyClickable
            facultyBasePath="/assistant"
            showRoleInsteadOfDept
            rolesMap={rolesMap}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssistantRecords;
