import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { LeaveRequestsTable } from '@/components/LeaveRequestsTable';
import { LeaveBalanceCards } from '@/components/LeaveBalanceCards';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveRequestRow } from '@/hooks/useLeaveRequests';
import { LeaveBalanceRow } from '@/hooks/useLeaveBalances';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const FacultyDetailView = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile-detail', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, department_id')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['faculty-requests', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveRequestRow[];
    },
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['faculty-balances', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;
      return data as LeaveBalanceRow[];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{profile?.full_name || 'Faculty'}</h1>
            <p className="text-muted-foreground text-sm">Individual leave history & balance</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Leave Balance</h2>
          <LeaveBalanceCards balances={balances} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Leave History</h2>
          <LeaveRequestsTable requests={requests} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FacultyDetailView;
