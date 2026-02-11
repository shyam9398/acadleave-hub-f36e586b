import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Send } from 'lucide-react';
import { useSubmitLeaveRequest } from '@/hooks/useLeaveRequests';

type LeaveType = 'casual' | 'earned' | 'medical' | 'od';

const leaveTypeOptions: { value: LeaveType; label: string }[] = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'medical', label: 'Medical Leave' },
  { value: 'od', label: 'On-Duty (OD)' },
];

export const ApplyLeaveForm = () => {
  const [leaveType, setLeaveType] = useState<LeaveType | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [assignedFaculty, setAssignedFaculty] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const submitMutation = useSubmitLeaveRequest();

  const numberOfDays = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) return 0;
    const diffTime = to.getTime() - from.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? diffDays - 0.5 : diffDays;
  }, [fromDate, toDate, isHalfDay]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveType || numberOfDays <= 0) return;
    submitMutation.mutate({
      leave_type: leaveType,
      from_date: fromDate,
      to_date: toDate,
      number_of_days: numberOfDays,
      reason,
      is_half_day: isHalfDay,
      assigned_faculty: assignedFaculty,
    }, {
      onSuccess: () => {
        setLeaveType('');
        setFromDate('');
        setToDate('');
        setReason('');
        setAssignedFaculty('');
        setIsHalfDay(false);
      },
    });
  };

  return (
    <Card className="max-w-2xl border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Apply for Leave
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedFaculty">Assigned Faculty</Label>
            <Input
              id="assignedFaculty"
              placeholder="Enter assigned faculty name"
              value={assignedFaculty}
              onChange={(e) => setAssignedFaculty(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from">From Date</Label>
              <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To Date</Label>
              <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="halfday"
                checked={isHalfDay}
                onCheckedChange={(v) => setIsHalfDay(v === true)}
              />
              <Label htmlFor="halfday" className="text-sm font-normal cursor-pointer">
                Half-day leave
              </Label>
            </div>
            {fromDate && toDate && numberOfDays > 0 && (
              <div className="text-sm font-medium text-primary">
                No. of Days: <span className="text-lg font-bold">{numberOfDays}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for your leave..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <Button type="submit" className="w-full h-11 font-semibold" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
