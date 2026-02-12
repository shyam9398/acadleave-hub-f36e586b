import { LeaveBalanceRow } from '@/hooks/useLeaveBalances';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const typeLabels: Record<string, string> = {
  casual: 'Casual Leave',
  earned: 'EL',
  medical: 'ML',
  od: 'On Duty',
  special: 'Special Leave',
};

const typeOrder = ['casual', 'earned', 'medical', 'special', 'od'];

export const LeaveBalanceTable = ({ balances }: { balances: LeaveBalanceRow[] }) => {
  const sorted = [...balances].sort(
    (a, b) => typeOrder.indexOf(a.leave_type) - typeOrder.indexOf(b.leave_type)
  );

  return (
    <div className="rounded-xl border border-border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead className="font-semibold text-center w-16">Sl.No</TableHead>
            <TableHead className="font-semibold">Leave Type</TableHead>
            <TableHead className="font-semibold text-center" colSpan={3}>
              Leaves History
            </TableHead>
          </TableRow>
          <TableRow className="bg-muted/30">
            <TableHead />
            <TableHead />
            <TableHead className="font-semibold text-center">Opening</TableHead>
            <TableHead className="font-semibold text-center">Used</TableHead>
            <TableHead className="font-semibold text-center">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((b, idx) => {
            const isOd = b.leave_type === 'od';
            const available = isOd ? b.used : (b.available ?? (b.opening - b.used));
            const opening = isOd ? '—' : b.opening.toFixed(2);
            const used = b.used.toFixed(2);
            const avail = isOd ? b.used.toFixed(2) : (available < 0 ? `${available.toFixed(2)} (LOP)` : available.toFixed(2));

            return (
              <TableRow key={b.id}>
                <TableCell className="text-center text-sm text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium text-sm">
                  {typeLabels[b.leave_type] || b.leave_type}
                </TableCell>
                <TableCell className="text-center font-semibold text-sm">{opening}</TableCell>
                <TableCell className="text-center font-semibold text-sm">{isOd ? used : (parseFloat(used) > 0 ? used : '.00')}</TableCell>
                <TableCell className={`text-center font-semibold text-sm ${available < 0 ? 'text-destructive' : ''}`}>
                  {avail}
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
