import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, RefreshCw, ShieldCheck, Mail, Plus, Minus } from 'lucide-react';

interface FacultyBalance {
  id: string;
  user_id: string;
  leave_type: string;
  opening: number;
  used: number;
  available: number | null;
  academic_year: string;
}

const LEAVE_TYPES = ['casual', 'earned', 'medical', 'od', 'lop'] as const;

const leaveTypeLabels: Record<string, string> = {
  casual: 'Casual Leave (CL)',
  earned: 'Earned Leave (EL)',
  medical: 'Medical Leave (ML)',
  od: 'OD Leave',
  lop: 'LOP Leave',
};

type Step = 'email' | 'verify' | 'edit';

const AssistantAdmin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('email');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedFacultyId, setVerifiedFacultyId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});

  const { data: balances = [], isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
    queryKey: ['faculty-balances', verifiedFacultyId],
    enabled: !!verifiedFacultyId && step === 'edit',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', verifiedFacultyId!);
      if (error) throw error;
      return (data as FacultyBalance[]).filter(b => LEAVE_TYPES.includes(b.leave_type as any));
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
      toast({ title: 'Code Sent', description: `Verification code sent to ${facultyEmail}.` });
      if (data?._dev_code) {
        toast({ title: 'Dev Code', description: `Code: ${data._dev_code}` });
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
      setEditedValues({});
      setStep('edit');
      toast({ title: 'Verified', description: 'Faculty verified. Leave balances loaded.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editedValues);
      if (updates.length === 0) throw new Error('No changes to save.');
      for (const [balanceId, newOpening] of updates) {
        if (newOpening < 0) throw new Error('Leave values cannot be negative.');
        const { error } = await supabase
          .from('leave_balances')
          .update({ opening: newOpening })
          .eq('id', balanceId);
        if (error) throw error;
      }
      // Send confirmation
      await supabase.functions.invoke('admin-verify', {
        body: { action: 'send_confirmation', faculty_email: facultyEmail, updated_values: editedValues },
      });
    },
    onSuccess: () => {
      toast({ title: 'Saved', description: 'Leave quotas updated successfully.' });
      setEditedValues({});
      queryClient.invalidateQueries({ queryKey: ['faculty-balances', verifiedFacultyId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleIncrement = (balanceId: string, current: number) => {
    setEditedValues(prev => ({ ...prev, [balanceId]: current + 1 }));
  };

  const handleDecrement = (balanceId: string, current: number) => {
    if (current > 0) {
      setEditedValues(prev => ({ ...prev, [balanceId]: current - 1 }));
    }
  };

  const handleDirectInput = (balanceId: string, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setEditedValues(prev => ({ ...prev, [balanceId]: num }));
    }
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
              <CardTitle className="text-base">
                Leave Balances — {facultyEmail}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <p className="text-sm text-muted-foreground">Loading leave balances...</p>
              ) : balances.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave balances found for this faculty.</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {balances.map(b => {
                      const currentOpening = editedValues[b.id] ?? b.opening;
                      const available = currentOpening - b.used;
                      const isEdited = editedValues[b.id] !== undefined;
                      return (
                        <div
                          key={b.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${isEdited ? 'border-primary bg-primary/5' : 'border-border'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{leaveTypeLabels[b.leave_type] || b.leave_type}</p>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>Used: <strong className="text-orange-600">{b.used}</strong></span>
                              <span className={available < 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                Avail: {available < 0 ? `LOP (${Math.abs(available)})` : available}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDecrement(b.id, currentOpening)}
                              disabled={currentOpening <= 0}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              className="w-16 h-8 text-center text-sm"
                              value={currentOpening}
                              min={0}
                              onChange={(e) => handleDirectInput(b.id, e.target.value)}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleIncrement(b.id, currentOpening)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={!hasChanges || saveMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-1" /> SAVE
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => saveMutation.mutate()}
                      disabled={!hasChanges || saveMutation.isPending}
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> UPDATE
                    </Button>
                  </div>
                  {hasChanges && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Changes highlighted. Press SAVE or UPDATE to apply.
                    </p>
                  )}
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
