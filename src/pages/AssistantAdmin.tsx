import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, RefreshCw, Mail, Plus, Minus, Search, ShieldCheck, KeyRound } from 'lucide-react';

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
  lop: 'Loss of Pay (LOP)',
};

const AssistantAdmin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'verify' | 'email' | 'edit'>('verify');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeExpiry, setCodeExpiry] = useState(0);
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyUserId, setFacultyUserId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});
  const [lookupLoading, setLookupLoading] = useState(false);

  // Countdown timer for dev code
  useEffect(() => {
    if (codeExpiry <= 0 || !devCode) return;
    const timer = setInterval(() => {
      setCodeExpiry(prev => {
        if (prev <= 1) {
          setDevCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [devCode, codeExpiry]);

  const handleSendCode = useCallback(() => {
    if (!verifyEmail.trim()) return;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setDevCode(code);
    setCodeExpiry(10);
    setCodeInput('');
    toast({ title: 'Code Generated', description: 'Check the popup at the bottom of the page.' });
  }, [verifyEmail, toast]);

  const checkSameDepartment = async (targetUserId: string): Promise<boolean> => {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('department_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user!.id)
      .single();
    const { data: facultyProfile } = await supabase
      .from('profiles')
      .select('department_id')
      .eq('user_id', targetUserId)
      .single();
    if (!myProfile?.department_id || !facultyProfile?.department_id) return false;
    return myProfile.department_id === facultyProfile.department_id;
  };

  const handleVerifyCode = useCallback(async () => {
    if (codeInput === devCode) {
      setDevCode(null);
      toast({ title: 'Verified', description: 'Admin access granted. Loading faculty data...' });
      const email = verifyEmail.trim().toLowerCase();
      setFacultyEmail(email);
      setLookupLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_user_id_by_email', { _email: email });
        if (error || !data) {
          toast({ title: 'Not Found', description: 'Faculty email not found. You can search manually.', variant: 'destructive' });
          setStep('email');
        } else {
          const sameDept = await checkSameDepartment(data);
          if (!sameDept) {
            toast({ title: 'Access Denied', description: 'This faculty is not in your department.', variant: 'destructive' });
            setStep('email');
          } else {
            setFacultyUserId(data);
            setEditedValues({});
            setStep('edit');
          }
        }
      } catch {
        setStep('email');
      } finally {
        setLookupLoading(false);
      }
    } else {
      toast({ title: 'Invalid Code', description: 'The code is incorrect or expired.', variant: 'destructive' });
    }
  }, [codeInput, devCode, verifyEmail, toast]);

  const { data: balances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ['faculty-balances', facultyUserId],
    enabled: !!facultyUserId && step === 'edit',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', facultyUserId!);
      if (error) throw error;
      return (data as FacultyBalance[]).filter(b =>
        LEAVE_TYPES.includes(b.leave_type as any)
      );
    },
  });

  const handleLookup = async () => {
    if (!facultyEmail.trim()) return;
    setLookupLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_id_by_email', {
        _email: facultyEmail.trim().toLowerCase(),
      });
      if (error || !data) {
        toast({ title: 'Not Found', description: 'Faculty email not found in system.', variant: 'destructive' });
        return;
      }
      const sameDept = await checkSameDepartment(data);
      if (!sameDept) {
        toast({ title: 'Access Denied', description: 'This faculty is not in your department.', variant: 'destructive' });
        return;
      }
      setFacultyUserId(data);
      setEditedValues({});
      setStep('edit');
      toast({ title: 'Faculty Found', description: 'Leave balances loaded.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLookupLoading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editedValues);
      if (updates.length === 0) throw new Error('No changes to save.');
      for (const [balanceId, newOpening] of updates) {
        if (newOpening < 0) throw new Error('Leave values cannot be negative.');
        const balance = balances.find(b => b.id === balanceId);
        if (balance) {
          await supabase.from('leave_audit_logs').insert({
            faculty_id: facultyUserId!,
            edited_by: (await supabase.auth.getUser()).data.user!.id,
            leave_type: balance.leave_type,
            previous_value: { opening: balance.opening, used: balance.used },
            new_value: { opening: newOpening, used: balance.used },
          });
        }
        const { error } = await supabase
          .from('leave_balances')
          .update({ opening: newOpening })
          .eq('id', balanceId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Saved', description: 'Leave quotas updated successfully.' });
      setEditedValues({});
      queryClient.invalidateQueries({ queryKey: ['faculty-balances', facultyUserId] });
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
    setFacultyUserId(null);
    setEditedValues({});
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Admin - Leave Quota Management</h1>
            <p className="text-muted-foreground text-sm">Search faculty and manage leave quotas</p>
          </div>
          {step === 'edit' && (
            <Button variant="outline" size="sm" onClick={resetFlow}>
              <RefreshCw className="w-4 h-4 mr-1" /> Start Over
            </Button>
          )}
        </div>

        {/* Step 0: Admin Verification */}
        {step === 'verify' && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-4 h-4" /> Admin Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Email ID</Label>
                <Input
                  type="email"
                  placeholder="admin@college.edu"
                  value={verifyEmail}
                  onChange={(e) => setVerifyEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                />
              </div>
              <Button onClick={handleSendCode} disabled={!verifyEmail.trim()} className="w-full">
                <KeyRound className="w-4 h-4 mr-1" /> Send Verification Code
              </Button>

              {devCode && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label>Enter Verification Code</Label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                    />
                  </div>
                  <Button onClick={handleVerifyCode} disabled={codeInput.length !== 6} className="w-full">
                    Verify & Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 1: Faculty Email Lookup */}
        {step === 'email' && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-4 h-4" /> Search Faculty by Email
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
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
              </div>
              <Button
                onClick={handleLookup}
                disabled={!facultyEmail || lookupLoading}
                className="w-full"
              >
                <Search className="w-4 h-4 mr-1" />
                {lookupLoading ? 'Searching...' : 'Search Faculty'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Edit Leave Balances */}
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
                      const remaining = currentOpening - b.used;
                      const isEdited = editedValues[b.id] !== undefined;
                      return (
                        <div
                          key={b.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${isEdited ? 'border-primary bg-primary/5' : 'border-border'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{leaveTypeLabels[b.leave_type] || b.leave_type}</p>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>Used: <strong className="text-[hsl(var(--leave-used))]">{b.used}</strong></span>
                              <span className={remaining < 0 ? 'text-destructive font-semibold' : 'text-[hsl(var(--leave-available))]'}>
                                Remaining: {remaining < 0 ? `LOP (${Math.abs(remaining)})` : remaining}
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
                  </div>
                  {hasChanges && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Changes highlighted. Press SAVE to apply.
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
