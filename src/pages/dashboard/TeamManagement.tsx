import { useState } from 'react';
import { useTeam, useAgentPerformance } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InviteMemberDialog } from '@/components/team/InviteMemberDialog';
import { TeamMemberCard } from '@/components/team/TeamMemberCard';
import { AgentPerformanceTable } from '@/components/team/AgentPerformanceTable';
import { 
  Users, 
  UserPlus, 
  Mail, 
  XCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  Settings2,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamManagement() {
  const { user } = useAuth();
  const {
    members,
    invitations,
    loading,
    isWorkspaceOwner,
    refetch,
    inviteMember,
    cancelInvitation,
    updateMemberRole,
    removeMember,
    toggleAvailability,
  } = useTeam();

  const {
    performance,
    loading: performanceLoading,
  } = useAgentPerformance();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Management
          </h1>
          <p className="text-muted-foreground">
            Manage your team, assign roles, and track performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {isWorkspaceOwner && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Team Members
            <Badge variant="secondary">{members.length}</Badge>
          </TabsTrigger>
          {isWorkspaceOwner && (
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              Invitations
              {invitations.length > 0 && (
                <Badge variant="secondary">{invitations.length}</Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          {isWorkspaceOwner && (
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No Team Members Yet</h3>
                <p className="text-muted-foreground mt-1">
                  Invite your first team member to start collaborating
                </p>
                <Button onClick={() => setInviteDialogOpen(true)} className="mt-4">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  isOwner={member.user_id === user?.id && !member.id.startsWith('owner-')}
                  isWorkspaceOwnerMember={member.id.startsWith('owner-')}
                  canManageTeam={isWorkspaceOwner}
                  onUpdateRole={updateMemberRole}
                  onRemove={removeMember}
                  onToggleAvailability={toggleAvailability}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No Pending Invitations</h3>
                <p className="text-muted-foreground mt-1">
                  All your team invitations have been accepted or expired
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>
                  Invitations that haven't been accepted yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{invitation.email}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{invitation.role}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInvitation(invitation.id)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>
                Track response times, message volume, and resolution rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentPerformanceTable 
                performance={performance} 
                loading={performanceLoading} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Settings</CardTitle>
              <CardDescription>
                Configure how chats are assigned to your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-assign">Auto-assign new chats</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically distribute new conversations to available agents using round-robin
                  </p>
                </div>
                <Switch
                  id="auto-assign"
                  checked={autoAssignEnabled}
                  onCheckedChange={setAutoAssignEnabled}
                />
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Role Permissions</h4>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Admin</span>
                    <span className="text-muted-foreground">
                      Full access • Invite members • Manage settings
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Manager</span>
                    <span className="text-muted-foreground">
                      Assign chats • View all chats • View metrics
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Agent</span>
                    <span className="text-muted-foreground">
                      Handle assigned chats • Add internal notes
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={inviteMember}
      />
    </div>
  );
}
