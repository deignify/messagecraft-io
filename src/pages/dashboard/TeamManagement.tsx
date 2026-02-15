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
import { useTeamRole } from '@/hooks/useTeamRole';

export default function TeamManagement() {
  const { user } = useAuth();
  const { role: teamRole } = useTeamRole();
  const {
    members,
    invitations,
    receivedInvitations,
    loading,
    isWorkspaceOwner,
    refetch,
    inviteMember,
    cancelInvitation,
    acceptInvitation,
    declineInvitation,
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

  // Team admins can invite but only workspace owner can change roles/remove
  const canInvite = isWorkspaceOwner || teamRole === 'admin';
  const hasReceivedInvitations = receivedInvitations.length > 0;
  const showInvitationsTab = canInvite || hasReceivedInvitations;

  return (
    <div className="p-3 md:p-6 space-y-3 md:space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 md:h-6 md:w-6" />
            Team Management
          </h1>
          <p className="text-xs md:text-base text-muted-foreground">
            Manage your team, assign roles, and track performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm" className="h-9">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          {canInvite && (
            <Button onClick={() => setInviteDialogOpen(true)} size="sm" className="h-9">
              <UserPlus className="h-4 w-4 mr-1.5" />
              Invite
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-3 md:space-y-4">
        <TabsList className="w-full overflow-x-auto flex justify-start h-auto p-1 gap-1">
          <TabsTrigger value="members" className="gap-1.5 text-xs md:text-sm px-2.5 py-1.5 min-w-0 shrink-0">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Team </span>Members
            <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{members.length}</Badge>
          </TabsTrigger>
          {showInvitationsTab && (
            <TabsTrigger value="invitations" className="gap-1.5 text-xs md:text-sm px-2.5 py-1.5 min-w-0 shrink-0">
              <Mail className="h-3.5 w-3.5" />
              Invites
              {(invitations.length + receivedInvitations.length) > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{invitations.length + receivedInvitations.length}</Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="performance" className="gap-1.5 text-xs md:text-sm px-2.5 py-1.5 min-w-0 shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Perf</span><span className="sm:hidden">Stats</span>
          </TabsTrigger>
          {isWorkspaceOwner && (
            <TabsTrigger value="settings" className="gap-1.5 text-xs md:text-sm px-2.5 py-1.5 min-w-0 shrink-0">
              <Settings2 className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <h3 className="mt-3 text-base font-semibold">No Team Members Yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Invite your first team member to start collaborating
                </p>
                <Button onClick={() => setInviteDialogOpen(true)} className="mt-4" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          {receivedInvitations.length > 0 && (
            <Card className="mb-3">
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-base md:text-lg">Invitations For You</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  You've been invited to join a team workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="space-y-2.5">
                  {receivedInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg bg-primary/5"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <UserPlus className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm">Team Invitation</div>
                          <div className="text-xs text-muted-foreground">
                            Role: <Badge variant="outline" className="ml-1 text-[10px]">{invitation.role}</Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-8 sm:ml-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => declineInvitation(invitation.id)}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => acceptInvitation(invitation.id)}
                        >
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {canInvite && (
            <>
              {invitations.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Mail className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <h3 className="mt-3 text-base font-semibold">No Pending Invitations</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      All your team invitations have been accepted or expired
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="p-3 md:p-6">
                    <CardTitle className="text-base md:text-lg">Sent Invitations</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Invitations that haven't been accepted yet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className="space-y-2.5">
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between gap-2 p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{invitation.email}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className="text-[10px]">{invitation.role}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
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
            </>
          )}

          {!canInvite && receivedInvitations.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <Mail className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <h3 className="mt-3 text-base font-semibold">No Pending Invitations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have any pending team invitations
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Agent Performance</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Track response times, message volume, and resolution rates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              <div className="overflow-x-auto">
                <AgentPerformanceTable 
                  performance={performance} 
                  loading={performanceLoading} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Assignment Settings</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Configure how chats are assigned to your team
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-4 md:space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-assign" className="text-sm">Auto-assign new chats</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically distribute new conversations to available agents
                  </p>
                </div>
                <Switch
                  id="auto-assign"
                  checked={autoAssignEnabled}
                  onCheckedChange={setAutoAssignEnabled}
                />
              </div>
              
              <div className="border-t pt-3 md:pt-4">
                <h4 className="font-medium text-sm mb-2">Role Permissions</h4>
                <div className="grid gap-2 md:gap-3 text-xs md:text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2.5 md:p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Admin</span>
                    <span className="text-muted-foreground text-[11px] md:text-sm">
                      Full access • Invite members • Manage settings
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2.5 md:p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Manager</span>
                    <span className="text-muted-foreground text-[11px] md:text-sm">
                      Assign chats • View all chats • View metrics
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2.5 md:p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Agent</span>
                    <span className="text-muted-foreground text-[11px] md:text-sm">
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
