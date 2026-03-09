import { LeaveBalanceRow } from '@/hooks/useLeaveBalances';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const typeLabels: Record<string, string> = {
  casual: 'Casual Leave',
  medical: 'Medical Leave',
  earned: 'Earned Leave',
  od: 'On Duty',
  lop: 'Loss of Pay',
};

const typeOrder = ['casual', 'medical', 'earned', 'od'];

export const LeaveBalanceTable = ({ balances }: { balances: LeaveBalanceRow[] }) => {
  const filtered = balances.filter(b => typeOrder.includes(b.leave_type));
  const sorted = [...filtered].sort(
    (a, b) => typeOrder.indexOf(a.leave_type) - typeOrder.indexOf(b.leave_type)
  );

  // Calculate LOP dynamically: sum of (used - opening) for CL/EL/ML where used > opening
  const clElMl = sorted.filter(b => ['casual', 'earned', 'medical'].includes(b.leave_type));
  const totalOpening = clElMl.reduce((s, b) => s + b.opening, 0);
  const totalUsed = clElMl.reduce((s, b) => s + b.used, 0);
  const lopDays = Math.max(0, totalUsed - totalOpening);

  const allRows = [
    ...sorted,
    // Dynamic LOP row
    { id: 'lop-dynamic', user_id: '', leave_type: 'lop', opening: 0, used: lopDays, available: null, academic_year: '' } as LeaveBalanceRow,
  ];

  return (
    <div className="rounded-lg border border-border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 border-b-2 border-border">
            <TableHead className="font-semibold text-center w-12 text-xs">Sl.No</TableHead>
            <TableHead className="font-semibold text-xs">Leave Type</TableHead>
            <TableHead className="font-semibold text-center text-xs">Total</TableHead>
            <TableHead className="font-semibold text-center text-xs">Used</TableHead>
            <TableHead className="font-semibold text-center text-xs">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allRows.map((b, idx) => {
            const total = b.opening;
            const used = b.used;
            const available = total - used;

            return (
              <TableRow key={b.id} className="border-b border-border/50">
                <TableCell className="text-center text-xs text-muted-foreground py-3">{idx + 1}</TableCell>
                <TableCell className="font-medium text-sm py-3">{typeLabels[b.leave_type] ?? b.leave_type}</TableCell>
                <TableCell className="text-center font-semibold text-sm py-3">{total}</TableCell>
                <TableCell className="text-center font-semibold text-sm py-3 text-[hsl(var(--leave-used))]">{used}</TableCell>
                <TableCell className={`text-center font-semibold text-sm py-3 ${available < 0 ? 'text-destructive' : 'text-[hsl(var(--leave-available))]'}`}>
                  {b.leave_type === 'lop' ? (lopDays > 0 ? `-${lopDays}` : '0') : available}
                </TableCell>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
                No leave balance data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
