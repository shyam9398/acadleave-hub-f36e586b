import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Settings, Search } from 'lucide-react';

interface FacultyBalance {
  id: string;
  user_id: string;
  leave_type: string;
  opening: number;
  used: number;
  available: number | null;
  academic_year: string;
}

const leaveTypeLabels: Record<string, string> = {
  casual: 'Casual Leave',
  earned: 'Earned Leave',
  medical: 'Medical Leave',
  od: 'OD Leave',
  special: 'Special Leave',
};

const AssistantAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get faculty in the same department
  const { data: facultyProfiles = [] } = useQuery({
    queryKey: ['dept-faculty-profiles', user?.departmentId],
    enabled: !!user?.departmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('department_id', user!.departmentId!);
      if (error) throw error;
      return data;
    },
  });

  // Get leave balances for selected faculty
  const { data: balances = [], refetch: refetchBalances } = useQuery({
    queryKey: ['faculty-balances', selectedFaculty],
    enabled: !!selectedFaculty,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', selectedFaculty);
      if (error) throw error;
      return data as FacultyBalance[];
    },
  });

  const filteredFaculty = facultyProfiles.filter(f =>
    f.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateBalance = async (balanceId: string, newOpening: number) => {
    // JR Assistant cannot update via RLS directly - show toast explaining
    toast({
      title: 'Contact Admin',
      description: 'Leave quota updates require administrator access. Please contact the system administrator.',
      variant: 'destructive',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Admin - Leave Quota Management</h1>
          <p className="text-muted-foreground text-sm">View and manage faculty leave quotas</p>
        </div>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="w-4 h-4" /> Select Faculty
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a faculty member" />
              </SelectTrigger>
              <SelectContent>
                {filteredFaculty.map(f => (
                  <SelectItem key={f.user_id} value={f.user_id}>{f.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedFaculty && balances.length > 0 && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-4 h-4" /> Leave Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {balances.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-sm">{leaveTypeLabels[b.leave_type] || b.leave_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Total: {b.opening} | Used: {b.used} | Available: {b.available ?? (b.opening - b.used)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Total:</Label>
                      <Input
                        type="number"
                        className="w-20 h-8 text-sm"
                        defaultValue={b.opening}
                        min={0}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val !== b.opening) handleUpdateBalance(b.id, val);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AssistantAdmin;
