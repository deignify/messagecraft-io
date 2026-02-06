import { TeamMember, TeamRole, ROLE_LABELS } from '@/lib/team-types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Shield, 
  UserMinus, 
  Crown,
  Briefcase,
  Headphones,
} from 'lucide-react';

interface TeamMemberCardProps {
  member: TeamMember;
  isOwner?: boolean;
  isWorkspaceOwnerMember?: boolean; // If this member is the workspace owner itself
  canManageTeam?: boolean; // If the current user can manage team members (is workspace owner)
  onUpdateRole: (memberId: string, role: TeamRole) => void;
  onRemove: (memberId: string) => void;
  onToggleAvailability: (memberId: string, available: boolean) => void;
}

const roleIcons: Record<TeamRole, typeof Shield> = {
  admin: Crown,
  manager: Briefcase,
  agent: Headphones,
};

const roleBadgeVariants: Record<TeamRole, string> = {
  admin: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
  manager: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
  agent: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
};

export function TeamMemberCard({ 
  member, 
  isOwner,
  isWorkspaceOwnerMember,
  canManageTeam = false,
  onUpdateRole, 
  onRemove, 
  onToggleAvailability 
}: TeamMemberCardProps) {
  const RoleIcon = roleIcons[member.role];
  const initials = member.profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || member.profile?.email?.[0]?.toUpperCase() || '?';

  // Check if this is a virtual owner entry (ID starts with 'owner-')
  const isVirtualOwner = member.id.startsWith('owner-');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.profile?.avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {member.profile?.full_name || 'Unknown'}
              </div>
              <div className="text-sm text-muted-foreground">
                {member.profile?.email}
              </div>
            </div>
          </div>
          
          {canManageTeam && !isOwner && !isVirtualOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onUpdateRole(member.id, 'admin')}
                  disabled={member.role === 'admin'}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Make Admin
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdateRole(member.id, 'manager')}
                  disabled={member.role === 'manager'}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Make Manager
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onUpdateRole(member.id, 'agent')}
                  disabled={member.role === 'agent'}
                >
                  <Headphones className="h-4 w-4 mr-2" />
                  Make Agent
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onRemove(member.id)}
                  className="text-destructive"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove from Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {isVirtualOwner && (
            <Badge variant="outline" className="text-xs">Owner</Badge>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Badge className={roleBadgeVariants[member.role]}>
            <RoleIcon className="h-3 w-3 mr-1" />
            {ROLE_LABELS[member.role]}
          </Badge>
          
          {!isVirtualOwner && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {member.is_available ? 'Available' : 'Unavailable'}
              </span>
              <Switch
                checked={member.is_available}
                onCheckedChange={(checked) => onToggleAvailability(member.id, checked)}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
