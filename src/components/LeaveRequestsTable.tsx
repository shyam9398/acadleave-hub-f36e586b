import { LeaveRequestRow } from '@/hooks/useLeaveRequests';
import { StatusBadge } from './StatusBadge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X, Forward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaveRequestsTableProps {
  requests: LeaveRequestRow[];
  showActions?: boolean;
  showFaculty?: boolean;
  actionableStatuses?: string[];
  profilesMap?: Record<string, { full_name: string; department_id: string | null }>;
  departmentsMap?: Record<string, string>;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onForward?: (id: string) => void;
  facultyClickable?: boolean;
  facultyBasePath?: string;
}

const leaveTypeLabels: Record<string, string> = {
  casual: 'Casual', earned: 'Earned', medical: 'Medical', od: 'On-Duty',
};

export const LeaveRequestsTable = ({
  requests, showActions = false, showFaculty = false,
  actionableStatuses = ['pending'],
  profilesMap = {}, departmentsMap = {},
  onApprove, onReject, onForward,
  facultyClickable = false, facultyBasePath = '',
}: LeaveRequestsTableProps) => {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">S.No</TableHead>
            {showFaculty && <TableHead className="font-semibold">Faculty</TableHead>}
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">From</TableHead>
            <TableHead className="font-semibold">To</TableHead>
            <TableHead className="font-semibold">Days</TableHead>
            <TableHead className="font-semibold">Reason</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            {showActions && <TableHead className="font-semibold">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 9 : 8} className="text-center py-8 text-muted-foreground">
                No leave requests found
              </TableCell>
            </TableRow>
          ) : (
            requests.map((req, index) => {
              const profile = profilesMap[req.user_id];
              const facultyName = profile?.full_name || 'Unknown';
              const deptName = req.department_id ? (departmentsMap[req.department_id] || '') : '';
              return (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  {showFaculty && (
                    <TableCell>
                      <div
                        className={facultyClickable ? 'cursor-pointer hover:underline' : ''}
                        onClick={() => facultyClickable && facultyBasePath && navigate(`${facultyBasePath}/faculty/${req.user_id}`)}
                      >
                        <p className="font-medium text-sm">{facultyName}</p>
                        <p className="text-xs text-muted-foreground">{deptName}</p>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                      {leaveTypeLabels[req.leave_type] || req.leave_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{req.from_date}</TableCell>
                  <TableCell className="text-sm">{req.to_date}</TableCell>
                  <TableCell className="text-sm font-medium">{req.number_of_days}</TableCell>
                  <TableCell className="text-sm max-w-[300px] whitespace-normal break-words">{req.reason}</TableCell>
                  <TableCell><StatusBadge status={req.status as any} /></TableCell>
                  {showActions && actionableStatuses.includes(req.status) && (
                    <TableCell>
                      <div className="flex gap-1">
                        {onApprove && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-status-approved hover:bg-accent" onClick={() => onApprove(req.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        {onReject && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-status-rejected hover:bg-accent" onClick={() => onReject(req.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        {onForward && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-status-forwarded hover:bg-accent" onClick={() => onForward(req.id)}>
                            <Forward className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {showActions && !actionableStatuses.includes(req.status) && (
                    <TableCell className="text-xs text-muted-foreground">—</TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
