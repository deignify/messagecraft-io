import { useState } from 'react';
import { TeamMember, ROLE_LABELS } from '@/lib/team-types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, UserMinus, ChevronDown, Loader2 } from 'lucide-react';

interface ChatAssignmentDropdownProps {
  currentAssignment?: {
    assigned_to: string;
    assigned_agent?: {
      email: string;
      full_name: string | null;
    };
  } | null;
  availableAgents: TeamMember[];
  onAssign: (agentUserId: string) => Promise<void>;
  onUnassign: () => Promise<void>;
  disabled?: boolean;
}

export function ChatAssignmentDropdown({
  currentAssignment,
  availableAgents,
  onAssign,
  onUnassign,
  disabled,
}: ChatAssignmentDropdownProps) {
  const [loading, setLoading] = useState(false);

  const handleAssign = async (agentUserId: string) => {
    setLoading(true);
    try {
      await onAssign(agentUserId);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    setLoading(true);
    try {
      await onUnassign();
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.[0]?.toUpperCase() || '?';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : currentAssignment ? (
            <>
              <Avatar className="h-5 w-5 mr-2">
                <AvatarFallback className="text-xs">
                  {getInitials(
                    currentAssignment.assigned_agent?.full_name,
                    currentAssignment.assigned_agent?.email
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-24 truncate">
                {currentAssignment.assigned_agent?.full_name || 'Assigned'}
              </span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </>
          )}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Assign Chat To</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableAgents.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No available agents
          </div>
        ) : (
          availableAgents.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => handleAssign(agent.user_id)}
              disabled={currentAssignment?.assigned_to === agent.user_id}
            >
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={agent.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(agent.profile?.full_name, agent.profile?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm">
                  {agent.profile?.full_name || agent.profile?.email}
                </div>
              </div>
              <Badge variant="outline" className="ml-2 text-xs">
                {ROLE_LABELS[agent.role]}
              </Badge>
            </DropdownMenuItem>
          ))
        )}

        {currentAssignment && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleUnassign}
              className="text-destructive"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Unassign
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
