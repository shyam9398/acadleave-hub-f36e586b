import { LeaveBalanceRow } from '@/hooks/useLeaveBalances';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const typeLabels: Record<string, string> = {
  casual: 'Casual Leave',
  medical: 'Medical Leave',
  earned: 'Earned Leave',
  od: 'On Duty',
};

const typeOrder = ['casual', 'medical', 'earned', 'od'];

export const LeaveBalanceTable = ({ balances }: { balances: LeaveBalanceRow[] }) => {
  const filtered = balances.filter(b => typeOrder.includes(b.leave_type));
  const sorted = [...filtered].sort(
    (a, b) => typeOrder.indexOf(a.leave_type) - typeOrder.indexOf(b.leave_type)
  );

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
            <TableHead className="font-semibold text-center text-xs">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((b, idx) => {
            const isOd = b.leave_type === 'od';
            const total = b.opening;
            const used = b.used;
            const remaining = total - used;
            const available = remaining;

            return (
              <TableRow key={b.id} className="border-b border-border/50">
                <TableCell className="text-center text-xs text-muted-foreground py-3">{idx + 1}</TableCell>
                <TableCell className="font-medium text-sm py-3">{typeLabels[b.leave_type]}</TableCell>
                <TableCell className="text-center font-semibold text-sm py-3">{total}</TableCell>
                <TableCell className="text-center font-semibold text-sm py-3 text-[hsl(var(--leave-used))]">{used}</TableCell>
                <TableCell className={`text-center font-semibold text-sm py-3 ${remaining < 0 ? 'text-destructive' : 'text-[hsl(var(--leave-remaining))]'}`}>
                  {remaining < 0 && !isOd ? `${remaining} (LOP)` : remaining}
                </TableCell>
                <TableCell className={`text-center font-semibold text-sm py-3 ${available < 0 ? 'text-destructive' : 'text-[hsl(var(--leave-available))]'}`}>
                  {available}
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
