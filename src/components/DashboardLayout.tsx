import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Send,
  Users,
  FileText,
} from 'lucide-react';
import { NotificationPanel } from './NotificationPanel';
import { useMyNotifications } from '@/hooks/useNotifications';

interface DashboardLayoutProps {
  children: ReactNode;
}

const roleNavItems: Record<string, { label: string; icon: ReactNode; path: string }[]> = {
  faculty: [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/faculty' },
    { label: 'Apply Leave', icon: <Send className="w-5 h-5" />, path: '/faculty/apply' },
    { label: 'Leave History', icon: <CalendarDays className="w-5 h-5" />, path: '/faculty/history' },
  ],
  hod: [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/hod' },
    { label: 'Pending Requests', icon: <ClipboardList className="w-5 h-5" />, path: '/hod/requests' },
    { label: 'Apply Leave', icon: <Send className="w-5 h-5" />, path: '/hod/apply' },
  ],
  principal: [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/principal' },
    { label: 'Forwarded Requests', icon: <ClipboardList className="w-5 h-5" />, path: '/principal/requests' },
  ],
  junior_assistant: [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/assistant' },
    { label: 'Leave Records', icon: <FileText className="w-5 h-5" />, path: '/assistant/records' },
    { label: 'Apply Leave', icon: <Send className="w-5 h-5" />, path: '/assistant/apply' },
  ],
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: notifications = [] } = useMyNotifications();

  if (!user) return null;

  const navItems = roleNavItems[user.role] || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const roleTitles: Record<string, string> = {
    faculty: 'Faculty',
    hod: 'Head of Department',
    principal: 'Principal',
    junior_assistant: 'Junior Assistant',
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 shrink-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-sm truncate">Leave Management</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/70'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{roleTitles[user.role]}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{roleTitles[user.role]} Dashboard</h2>
              <p className="text-xs text-muted-foreground">{user.department}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-2 border-card">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => { await logout(); navigate('/'); }}
              className="text-muted-foreground"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>

      {/* Notifications */}
      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;
