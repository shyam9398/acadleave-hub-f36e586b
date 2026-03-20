import { LeaveBalanceRow } from '@/hooks/useLeaveBalances';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const typeLabels: Record<string, string> = {
  casual: 'Casual Leave',
  earned: 'Earned Leave',
  medical: 'Medical Leave',
  od: 'On Duty',
  lop: 'Loss of Pay',
};

const typeOrder = ['casual', 'earned', 'medical', 'od'];

export const LeaveBalanceTable = ({ balances }: { balances: LeaveBalanceRow[] }) => {
  const filtered = balances.filter(b => typeOrder.includes(b.leave_type));
  const sorted = [...filtered].sort(
    (a, b) => typeOrder.indexOf(a.leave_type) - typeOrder.indexOf(b.leave_type)
  );

  // Calculate LOP dynamically: overflow beyond opening for CL+EL+ML
  const clElMl = sorted.filter(b => ['casual', 'earned', 'medical'].includes(b.leave_type));
  const lopDays = clElMl.reduce((s, b) => s + Math.max(0, b.used - b.opening), 0);

  const allRows = [
    ...sorted,
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
            <TableHead className="font-semibold text-center text-xs">Remaining</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allRows.map((b, idx) => {
            const isOD = b.leave_type === 'od';
            const isLOP = b.leave_type === 'lop';

            let total: number, used: number, available: number, remaining: number;

            if (isOD) {
              total = 0;
              used = b.used;
              available = 0;
              remaining = 0;
            } else if (isLOP) {
              total = 0;
              used = lopDays;
              available = lopDays > 0 ? -lopDays : 0;
              remaining = lopDays > 0 ? -lopDays : 0;
            } else {
              total = b.opening;
              used = Math.min(b.used, b.opening);
              available = Math.max(total - used, 0);
              remaining = available;
            }

            return (
              <TableRow key={b.id} className="border-b border-border/50">
                <TableCell className="text-center text-xs text-muted-foreground py-3">{idx + 1}</TableCell>
                <TableCell className="font-medium text-sm py-3">{typeLabels[b.leave_type] ?? b.leave_type}</TableCell>
                <TableCell className="text-center font-semibold text-sm py-3">{total}</TableCell>
                <TableCell className="text-center font-semibold text-sm py-3 text-[hsl(var(--leave-used))]">{used}</TableCell>
                <TableCell className={`text-center font-semibold text-sm py-3 ${remaining < 0 ? 'text-destructive' : 'text-[hsl(var(--leave-available))]'}`}>
                  {remaining}
                </TableCell>
              </TableRow>
            );
          })}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                No leave balance data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
