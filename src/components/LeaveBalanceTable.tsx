import { LeaveBalanceRow } from '@/hooks/useLeaveBalances';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const typeLabels: Record<string, string> = {
  casual: 'Casual Leave',
  earned: 'Earned Leave',
  medical: 'Medical Leave',
  od: 'On-Duty (OD)',
  special: 'Special Leave',
};

const typeOrder = ['casual', 'earned', 'medical', 'od', 'special'];

export const LeaveBalanceTable = ({ balances }: { balances: LeaveBalanceRow[] }) => {
  const sorted = [...balances].sort(
    (a, b) => typeOrder.indexOf(a.leave_type) - typeOrder.indexOf(b.leave_type)
  );

  return (
    <div className="rounded-xl border border-border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Leave Type</TableHead>
            <TableHead className="font-semibold text-center">Total</TableHead>
            <TableHead className="font-semibold text-center">Used</TableHead>
            <TableHead className="font-semibold text-center">Remaining</TableHead>
            <TableHead className="font-semibold text-center">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((b) => {
            const isOd = b.leave_type === 'od';
            const available = isOd ? b.used : (b.available ?? (b.opening - b.used));
            const remaining = isOd ? 0 : (b.opening - b.used);
            const isNegative = remaining < 0;

            return (
              <TableRow key={b.id}>
                <TableCell className="font-medium text-sm">
                  {typeLabels[b.leave_type] || b.leave_type}
                </TableCell>
                <TableCell className="text-center font-semibold text-muted-foreground">
                  {isOd ? '—' : b.opening}
                </TableCell>
                <TableCell className="text-center font-semibold text-orange-500">
                  {isOd ? `+${b.used}` : b.used}
                </TableCell>
                <TableCell className={`text-center font-semibold ${isNegative ? 'text-destructive' : 'text-red-500'}`}>
                  {isOd ? '—' : (isNegative ? `${remaining} (LOP)` : remaining)}
                </TableCell>
                <TableCell className="text-center font-semibold text-green-600">
                  {isOd ? `+${b.used}` : (available < 0 ? 0 : available)}
                </TableCell>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No leave balance data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
