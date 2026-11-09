/**
 * Shapes returned by the API. The backend answers every request with
 * `{ success, data, message? }`; list endpoints may add extras such as
 * `unreadCount` (see `EnvelopeWith`). Fields the UI does not read are
 * intentionally left out.
 */
export interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}
export type EnvelopeWith<T, Extra> = Envelope<T> & Extra;

/** Request body for create/update calls. */
export type Payload = Record<string, unknown>;

export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAssignee {
  id: number;
  name: string;
  avatar: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigned_by: number;
  venture_id: number;
  due_date: string;
  created_at: string;
  assignees: TaskAssignee[];
  assigned_by_name: string;
  assigned_by_avatar: string;
  venture_name: string;
  primary_color: string;
  project_id?: number;
  project_name?: string;
  parent_task_id?: number;
  parent_task_title?: string;
}

export interface TeamMember {
  id: number;
  full_name: string;
  email: string;
  access_level: number;
  level_name?: string;
  venture_id: number | null;
  venture_name?: string;
  primary_color?: string;
  department?: string;
  designation?: string;
  employee_id?: string;
  is_active: number | boolean;
  personal_email?: string;
  phone?: string;
  emergency_contact?: string;
  avatar_url?: string;
  last_login?: string | null;
  pending_approval?: boolean;
  created_at?: string;
  roles?: { id: number; role_name: string }[];
}

export interface ProjectMember {
  user_id: number;
  full_name?: string;
  avatar_url?: string;
  role?: string;
}

export interface Milestone {
  title: string;
  description: string;
  due_date: string;
  status: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  category?: string;
  budget?: number | string | null;
  venture_id?: number;
  venture_name?: string;
  venture_color?: string | null;
  task_count?: number;
  completed_task_count?: number;
  start_date?: string | null;
  end_date?: string | null;
  client_name?: string;
  client_email?: string;
  progress?: number;
  members?: ProjectMember[];
  tags?: string | string[];
  milestones?: Milestone[];
}

export interface AppNotification {
  id: number;
  type: 'task_assigned' | 'task_updated' | 'project_update' | 'mention' | 'deadline' | 'system';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name?: string | null;
  user_email?: string | null;
  action_type: string;
  entity_type: string;
  entity_id: number;
  details?: unknown;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content?: string;
  body?: string;
  author_name?: string;
  created_at: string;
}

export interface VelocityPoint {
  name: string;
  completed: number;
}

export interface Analytics {
  budgetDistribution: { venture: string; color: string; total_budget: number }[];
  monthlyPerformance?: { name: string; tasks: number; projects: number }[];
  taskVelocity: VelocityPoint[];
  userDistribution: { name: string; value: number; color: string }[];
  recentActivity?: { id?: number; action: string; created_at: string }[];
  announcements?: Announcement[];
}

export interface Venture {
  id: number;
  name: string;
  slug: string;
  primary_color?: string | null;
}

/** A task as shown in a person's activity list (`GET /team-members/:id`). */
export interface UserTaskActivity {
  id: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  updated_at: string;
}

/** A chat message, as returned by the API and broadcast over the socket. */
export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string;
  receiver_id?: number | null;
  venture_id?: number | null;
  /** Socket payloads carry the room as `ventureId` (a venture id or 'global'). */
  ventureId?: number | 'global' | null;
  venture_name?: string | null;
}
