import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyApplyLeave from "./pages/FacultyApplyLeave";
import FacultyHistory from "./pages/FacultyHistory";
import HODDashboard from "./pages/HODDashboard";
import HODApplyLeave from "./pages/HODApplyLeave";
import HODRequests from "./pages/HODRequests";
import HODLeaveStatus from "./pages/HODLeaveStatus";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import PrincipalRequests from "./pages/PrincipalRequests";
import AssistantDashboard from "./pages/AssistantDashboard";
import AssistantApplyLeave from "./pages/AssistantApplyLeave";
import AssistantRecords from "./pages/AssistantRecords";
import AssistantLeaveStatus from "./pages/AssistantLeaveStatus";
import AssistantAdmin from "./pages/AssistantAdmin";
import FacultyDetailView from "./pages/FacultyDetailView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<FacultyDashboard />} />
            <Route path="/login" element={<Login />} />
            {/* Faculty Routes */}
            <Route path="/faculty" element={<FacultyDashboard />} />
            <Route path="/faculty/apply" element={<FacultyApplyLeave />} />
            <Route path="/faculty/history" element={<FacultyHistory />} />
            {/* HOD Routes */}
            <Route path="/hod" element={<HODDashboard />} />
            <Route path="/hod/apply" element={<HODApplyLeave />} />
            <Route path="/hod/requests" element={<HODRequests />} />
            <Route path="/hod/status" element={<HODLeaveStatus />} />
            <Route path="/hod/faculty/:userId" element={<FacultyDetailView />} />
            {/* Principal Routes */}
            <Route path="/principal" element={<PrincipalDashboard />} />
            <Route path="/principal/requests" element={<PrincipalRequests />} />
            {/* Junior Assistant Routes */}
            <Route path="/assistant" element={<AssistantDashboard />} />
            <Route path="/assistant/apply" element={<AssistantApplyLeave />} />
            <Route path="/assistant/records" element={<AssistantRecords />} />
            <Route path="/assistant/status" element={<AssistantLeaveStatus />} />
            <Route path="/assistant/admin" element={<AssistantAdmin />} />
            <Route path="/assistant/faculty/:userId" element={<FacultyDetailView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
