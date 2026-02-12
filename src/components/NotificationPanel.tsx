import { useMyNotifications, useMarkNotificationsRead } from '@/hooks/useNotifications';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactNode, useEffect, useRef } from 'react';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const typeIcons: Record<string, ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-status-approved" />,
  warning: <AlertTriangle className="w-4 h-4 text-status-pending" />,
  info: <Info className="w-4 h-4 text-status-forwarded" />,
  error: <XCircle className="w-4 h-4 text-status-rejected" />,
};

export const NotificationPanel = ({ open, onClose }: NotificationPanelProps) => {
  const { data: notifications = [] } = useMyNotifications();
  const { mutate: markRead } = useMarkNotificationsRead();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open && notifications.length > 0) {
      // Auto-remove notifications after 5 minutes of viewing
      timerRef.current = setTimeout(() => {
        markRead();
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, notifications.length, markRead]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-16 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Notifications</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border last:border-0 ${!n.read ? 'bg-accent/50' : ''}`}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">{typeIcons[n.type] || typeIcons.info}</div>
                  <div>
                    <p className="text-sm leading-snug">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
