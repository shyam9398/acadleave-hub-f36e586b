import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, RefreshCw, ShieldCheck, Mail } from 'lucide-react';

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
  lop: 'LOP Leave',
};

type Step = 'email' | 'verify' | 'edit';

const AssistantAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('email');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedFacultyId, setVerifiedFacultyId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});

  const { data: balances = [], refetch: refetchBalances } = useQuery({
    queryKey: ['faculty-balances', verifiedFacultyId],
    enabled: !!verifiedFacultyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', verifiedFacultyId!);
      if (error) throw error;
      return data as FacultyBalance[];
    },
  });

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-verify', {
        body: { action: 'send_code', faculty_email: facultyEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Code Sent', description: `Verification code sent to ${facultyEmail}. Check console for dev code.` });
      // In dev mode, show code
      if (data?._dev_code) {
        toast({ title: 'Dev Code', description: `Code: ${data._dev_code}`, variant: 'default' });
      }
      setStep('verify');
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-verify', {
        body: { action: 'verify_code', faculty_email: facultyEmail, code: verificationCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setVerifiedFacultyId(data.faculty_user_id);
      setStep('edit');
      toast({ title: 'Verified', description: 'Faculty verified successfully.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editedValues);
      for (const [balanceId, newOpening] of updates) {
        const { error } = await supabase
          .from('leave_balances')
          .update({ opening: newOpening })
          .eq('id', balanceId);
        if (error) throw error;
      }
      // Send confirmation email
      await supabase.functions.invoke('admin-verify', {
        body: { action: 'send_confirmation', faculty_email: facultyEmail, updated_values: editedValues },
      });
    },
    onSuccess: () => {
      toast({ title: 'Saved', description: 'Leave quotas updated. Confirmation sent to faculty.' });
      setEditedValues({});
      queryClient.invalidateQueries({ queryKey: ['faculty-balances', verifiedFacultyId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleValueChange = (balanceId: string, value: number) => {
    setEditedValues(prev => ({ ...prev, [balanceId]: value }));
  };

  const hasChanges = Object.keys(editedValues).length > 0;

  const resetFlow = () => {
    setStep('email');
    setFacultyEmail('');
    setVerificationCode('');
    setVerifiedFacultyId(null);
    setEditedValues({});
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Admin - Leave Quota Management</h1>
            <p className="text-muted-foreground text-sm">Verify faculty and manage leave quotas</p>
          </div>
          {step !== 'email' && (
            <Button variant="outline" size="sm" onClick={resetFlow}>
              <RefreshCw className="w-4 h-4 mr-1" /> Start Over
            </Button>
          )}
        </div>

        {/* Step 1: Faculty Email */}
        {step === 'email' && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-4 h-4" /> Step 1: Enter Faculty Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Faculty Email ID</Label>
                <Input
                  type="email"
                  placeholder="faculty@college.edu"
                  value={facultyEmail}
                  onChange={(e) => setFacultyEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={() => sendCodeMutation.mutate()}
                disabled={!facultyEmail || sendCodeMutation.isPending}
                className="w-full"
              >
                {sendCodeMutation.isPending ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Verify Code */}
        {step === 'verify' && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-4 h-4" /> Step 2: Enter Verification Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A verification code has been sent to <strong>{facultyEmail}</strong>
              </p>
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
              </div>
              <Button
                onClick={() => verifyCodeMutation.mutate()}
                disabled={verificationCode.length !== 6 || verifyCodeMutation.isPending}
                className="w-full"
              >
                {verifyCodeMutation.isPending ? 'Verifying...' : 'Verify Code'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Edit Leave Balances */}
        {step === 'edit' && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Leave Balances — {facultyEmail}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balances.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave balances found for this faculty.</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {balances.map(b => {
                      const currentOpening = editedValues[b.id] ?? b.opening;
                      const available = currentOpening - b.used;
                      return (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{leaveTypeLabels[b.leave_type] || b.leave_type}</p>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>Total: <strong className="text-foreground">{currentOpening}</strong></span>
                              <span className="text-orange-600">Used: {b.used}</span>
                              <span className={available < 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                Available: {available < 0 ? `LOP (${available})` : available}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Total:</Label>
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm"
                              value={currentOpening}
                              min={0}
                              onChange={(e) => handleValueChange(b.id, Number(e.target.value))}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button 
                      onClick={() => saveMutation.mutate()} 
                      disabled={!hasChanges || saveMutation.isPending} 
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => { refetchBalances(); setEditedValues({}); }} 
                      disabled={saveMutation.isPending} 
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AssistantAdmin;
