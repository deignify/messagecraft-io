import { AgentPerformance, ROLE_LABELS } from '@/lib/team-types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface AgentPerformanceTableProps {
  performance: AgentPerformance[];
  loading: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

export function AgentPerformanceTable({ performance, loading }: AgentPerformanceTableProps) {
  const getInitials = (name?: string, email?: string) => {
    if (name && name !== 'Unknown') {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email?.[0]?.toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading performance data...
      </div>
    );
  }

  if (performance.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No Performance Data</h3>
        <p className="text-muted-foreground">
          Performance metrics will appear here once your team starts handling chats.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Messages
            </div>
          </TableHead>
          <TableHead className="text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Conversations
            </div>
          </TableHead>
          <TableHead className="text-center">Resolution Rate</TableHead>
          <TableHead className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              Avg Response
            </div>
          </TableHead>
          <TableHead className="text-center">First Response</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {performance.map((agent) => (
          <TableRow key={agent.agent_id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {getInitials(agent.agent_name, agent.agent_email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{agent.agent_name}</div>
                  <div className="text-xs text-muted-foreground">{agent.agent_email}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{ROLE_LABELS[agent.role]}</Badge>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex flex-col items-center">
                <span className="font-medium">{agent.total_messages_sent}</span>
                <span className="text-xs text-muted-foreground">sent</span>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex flex-col items-center">
                <span className="font-medium">
                  {agent.resolved_conversations}/{agent.total_conversations}
                </span>
                <span className="text-xs text-muted-foreground">resolved</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col items-center gap-1">
                <Progress 
                  value={agent.resolution_rate} 
                  className="w-20 h-2"
                />
                <span className="text-xs font-medium">
                  {agent.resolution_rate.toFixed(0)}%
                </span>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <span className="font-medium">
                {agent.avg_response_time > 0 
                  ? formatDuration(agent.avg_response_time)
                  : '-'
                }
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span className="font-medium">
                {agent.avg_first_response_time > 0 
                  ? formatDuration(agent.avg_first_response_time)
                  : '-'
                }
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
