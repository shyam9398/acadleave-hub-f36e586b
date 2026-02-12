import { LeaveBalanceRow } from '@/hooks/useLeaveBalances';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const typeLabels: Record<string, string> = {
  casual: 'Casual Leave',
  earned: 'Earned Leave',
  medical: 'Medical Leave',
  od: 'OD Leave',
  special: 'Special Leave',
};

const typeOrder = ['casual', 'earned', 'medical', 'special', 'od'];

export const LeaveBalanceTable = ({ balances }: { balances: LeaveBalanceRow[] }) => {
  const sorted = [...balances].sort(
    (a, b) => typeOrder.indexOf(a.leave_type) - typeOrder.indexOf(b.leave_type)
  );

  return (
    <div className="rounded-lg border border-border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 border-b-2 border-border">
            <TableHead className="font-semibold text-center w-12 text-xs">Sl.No</TableHead>
            <TableHead className="font-semibold text-xs">Leave Type</TableHead>
            <TableHead className="font-semibold text-center text-xs text-muted-foreground">Total</TableHead>
            <TableHead className="font-semibold text-center text-xs">Used</TableHead>
            <TableHead className="font-semibold text-center text-xs">Remaining</TableHead>
            <TableHead className="font-semibold text-center text-xs">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((b, idx) => {
            const isOd = b.leave_type === 'od';
            const remaining = isOd ? 0 : (b.opening - b.used);
            const available = isOd ? b.used : (b.available ?? remaining);
            const total = isOd ? '—' : b.opening;
            const usedVal = isOd ? `+${b.used}` : b.used;
            const remainingVal = isOd ? '—' : (remaining < 0 ? `${remaining} (LOP)` : remaining);
            const availableVal = isOd ? `+${b.used}` : (available < 0 ? 0 : available);

            return (
              <TableRow key={b.id} className="border-b border-border/50">
                <TableCell className="text-center text-xs text-muted-foreground py-3">{idx + 1}</TableCell>
                <TableCell className="font-medium text-sm py-3">{typeLabels[b.leave_type]}</TableCell>
                <TableCell className="text-center font-semibold text-sm py-3 text-muted-foreground">{total}</TableCell>
                <TableCell className="text-center font-semibold text-sm py-3 text-[hsl(var(--leave-used))]">{usedVal}</TableCell>
                <TableCell className={`text-center font-semibold text-sm py-3 ${remaining < 0 && !isOd ? 'text-[hsl(var(--leave-remaining))]' : 'text-[hsl(var(--leave-remaining))]'}`}>
                  {remainingVal}
                </TableCell>
                <TableCell className="text-center font-semibold text-sm py-3 text-[hsl(var(--leave-available))]">{availableVal}</TableCell>
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
