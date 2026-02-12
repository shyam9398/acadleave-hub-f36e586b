import { LeaveRequestRow } from '@/hooks/useLeaveRequests';
import { StatusBadge } from './StatusBadge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X, Forward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface LeaveRequestsTableProps {
  requests: LeaveRequestRow[];
  showActions?: boolean;
  showFaculty?: boolean;
  actionableStatuses?: string[];
  profilesMap?: Record<string, { full_name: string; department_id: string | null }>;
  departmentsMap?: Record<string, string>;
  rolesMap?: Record<string, string>;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onForward?: (id: string) => void;
  facultyClickable?: boolean;
  facultyBasePath?: string;
  odForwardOnly?: boolean;
  showRoleInsteadOfDept?: boolean;
  showDeptForPrincipal?: boolean;
}

const leaveTypeLabels: Record<string, string> = {
  casual: 'Casual', earned: 'Earned', medical: 'Medical', od: 'On-Duty', special: 'Special',
};

export const LeaveRequestsTable = ({
  requests, showActions = false, showFaculty = false,
  actionableStatuses = ['pending'],
  profilesMap = {}, departmentsMap = {}, rolesMap = {},
  onApprove, onReject, onForward,
  facultyClickable = false, facultyBasePath = '',
  odForwardOnly = false,
  showRoleInsteadOfDept = false,
  showDeptForPrincipal = false,
}: LeaveRequestsTableProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        No leave requests found
      </div>
    );
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {requests.map((req, index) => {
          const profile = profilesMap[req.user_id];
          const facultyName = profile?.full_name || 'Unknown';
          const deptName = req.department_id ? (departmentsMap[req.department_id] || '') : '';
          const isOd = req.leave_type === 'od';
          const isActionable = actionableStatuses.includes(req.status);

          let subtitle = deptName;
          if (showRoleInsteadOfDept) {
            subtitle = rolesMap[req.user_id] || 'Faculty';
          } else if (showDeptForPrincipal) {
            subtitle = deptName;
          }

          return (
            <div key={req.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {showFaculty && (
                    <div
                      className={facultyClickable ? 'cursor-pointer hover:underline' : ''}
                      onClick={() => facultyClickable && facultyBasePath && navigate(`${facultyBasePath}/faculty/${req.user_id}`)}
                    >
                      <p className="font-semibold text-sm truncate">{facultyName}</p>
                      <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                  )}
                </div>
                <StatusBadge status={req.status as any} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                    {leaveTypeLabels[req.leave_type] || req.leave_type}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Days</p>
                  <p className="font-medium">{req.number_of_days}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p>{req.from_date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">To</p>
                  <p>{req.to_date}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="text-sm break-words">{req.reason}</p>
              </div>

              {showActions && isActionable && (
                <div className="flex gap-2 pt-1 border-t border-border">
                  {isOd && odForwardOnly ? (
                    onForward && (
                      <Button size="sm" variant="outline" className="text-status-forwarded" onClick={() => onForward(req.id)}>
                        <Forward className="w-4 h-4 mr-1" /> Forward
                      </Button>
                    )
                  ) : (
                    <>
                      {onApprove && (
                        <Button size="sm" variant="outline" className="text-status-approved" onClick={() => onApprove(req.id)}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      )}
                      {onReject && (
                        <Button size="sm" variant="outline" className="text-status-rejected" onClick={() => onReject(req.id)}>
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      )}
                      {onForward && (
                        <Button size="sm" variant="outline" className="text-status-forwarded" onClick={() => onForward(req.id)}>
                          <Forward className="w-4 h-4 mr-1" /> Forward
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop/tablet table layout
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
          {requests.map((req, index) => {
            const profile = profilesMap[req.user_id];
            const facultyName = profile?.full_name || 'Unknown';
            const deptName = req.department_id ? (departmentsMap[req.department_id] || '') : '';
            const isOd = req.leave_type === 'od';
            const isActionable = actionableStatuses.includes(req.status);

            let subtitle = deptName;
            if (showRoleInsteadOfDept) {
              subtitle = rolesMap[req.user_id] || 'Faculty';
            } else if (showDeptForPrincipal) {
              subtitle = deptName;
            }

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
                      <p className="text-xs text-muted-foreground">{subtitle}</p>
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
                {showActions && isActionable && (
                  <TableCell>
                    <div className="flex gap-1">
                      {isOd && odForwardOnly ? (
                        onForward && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-status-forwarded hover:bg-accent" onClick={() => onForward(req.id)}>
                            <Forward className="w-4 h-4" />
                          </Button>
                        )
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
                {showActions && !isActionable && (
                  <TableCell className="text-xs text-muted-foreground">—</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
