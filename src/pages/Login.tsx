import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Mail, UserCircle, Building, Calendar, Hash } from 'lucide-react';
import collegeLogo from '@/assets/college-logo.png';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Department {
  id: string;
  name: string;
}

const FALLBACK_DEPARTMENTS: Department[] = [
  { id: 'ai-ml', name: 'Artificial Intelligence & Machine Learning' },
  { id: 'ai-ds', name: 'Artificial Intelligence and Data Science' },
  { id: 'civil', name: 'Civil Engineering' },
  { id: 'cse', name: 'Computer Science and Engineering' },
  { id: 'cyber', name: 'Cyber Security' },
  { id: 'eee', name: 'Electrical and Electronics Engineering' },
  { id: 'ece', name: 'Electronics and Communication Engineering' },
  { id: 'fyed', name: 'First Year Engineering Department' },
  { id: 'it', name: 'Information Technology' },
  { id: 'mech', name: 'Mechanical Engineering' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [yearOfJoining, setYearOfJoining] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [departments, setDepartments] = useState<Department[]>(FALLBACK_DEPARTMENTS);
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, signup, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from('departments').select('id, name').order('name');
      if (data && data.length > 0) {
        setDepartments(data);
      } else if (error) {
        console.error('Failed to fetch departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const routes: Record<UserRole, string> = {
        faculty: '/faculty',
        hod: '/hod',
        junior_assistant: '/assistant',
        principal: '/principal',
      };
      navigate(routes[user.role]);
    }
  }, [isAuthenticated, user, loading, navigate]);

  const needsDepartment = role === 'faculty' || role === 'hod' || role === 'junior_assistant';

  const validateUniqueId = (id: string) => {
    const digits = (id.match(/[0-9]/g) || []).length;
    const letters = (id.match(/[a-zA-Z]/g) || []).length;
    return id.length === 16 && digits === 13 && letters === 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && !role) return;
    if (isSignUp && needsDepartment && !departmentId) {
      toast({ title: 'Please select your department', variant: 'destructive' });
      return;
    }
    if (isSignUp && !yearOfJoining) {
      toast({ title: 'Please enter your year of joining', variant: 'destructive' });
      return;
    }
    if (isSignUp && !validateUniqueId(uniqueId)) {
      toast({ title: 'Invalid Unique ID', description: 'Must be exactly 16 characters: 13 digits and 3 letters.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    if (isSignUp) {
      const { error } = await signup(email, password, fullName, role as UserRole, needsDepartment ? departmentId : undefined, yearOfJoining ? parseInt(yearOfJoining) : undefined, uniqueId);
      if (error) {
        toast({ title: 'Sign Up Failed', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Account Created', description: 'You are now logged in!' });
      }
    } else {
      const { error } = await login(email, password);
      if (error) {
        toast({ title: 'Login Failed', description: error, variant: 'destructive' });
      }
    }
    setSubmitting(false);
  };

  const roleLabels: Record<UserRole, string> = {
    faculty: 'Faculty',
    hod: 'Head of Department',
    junior_assistant: 'Junior Assistant',
    principal: 'Principal',
  };

  const currentYear = new Date().getFullYear();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="flex min-h-screen relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
      </div>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-2 border-primary-foreground" />
          <div className="absolute bottom-32 right-16 w-48 h-48 rounded-full border-2 border-primary-foreground" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full border-2 border-primary-foreground" />
        </div>
         <div className="relative z-10 text-primary-foreground text-center max-w-md">
           <div className="flex justify-center mb-8">
             <img src={collegeLogo} alt="Sir C.R. Reddy College of Engineering" className="w-32 h-32 xl:w-40 xl:h-40 rounded-2xl bg-white/90 p-2 object-contain" />
           </div>
           <h1 className="text-3xl font-bold mb-2">Sir C.R. Reddy College of Engineering</h1>
           <p className="text-primary-foreground/70 text-sm mb-1">(Autonomous)</p>
           <p className="text-primary-foreground/60 text-xs mb-4">Approved by AICTE | Affiliated to JNTUK | Accredited by NBA & NAAC (A Grade)</p>
           <p className="text-primary-foreground/80 text-lg leading-relaxed">
             Faculty Leave Management System
           </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12 bg-background">
        <Card className="w-full max-w-md border-0 shadow-xl bg-card">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 lg:hidden">
             <img src={collegeLogo} alt="College Logo" className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isSignUp ? 'Create Account' : 'Welcome to CRR'}
            </CardTitle>
            <CardDescription>
              {isSignUp ? 'Register with your official email' : 'Sign in to your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={(v) => { setRole(v as UserRole); setDepartmentId(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {needsDepartment && (
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <div className="relative">
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                          <SelectTrigger className="pl-10">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="yearOfJoining">Year of Joining as Faculty</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="yearOfJoining"
                        type="number"
                        placeholder="e.g. 2018"
                        value={yearOfJoining}
                        onChange={(e) => setYearOfJoining(e.target.value)}
                        className="pl-10"
                        min={1950}
                        max={currentYear}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uniqueId">Unique ID</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="uniqueId"
                        placeholder="e.g. ABC1234567890123"
                        value={uniqueId}
                        onChange={(e) => setUniqueId(e.target.value.toUpperCase())}
                        className="pl-10"
                        maxLength={16}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">16 characters: 13 digits and 3 letters</p>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
                {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
