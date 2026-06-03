/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssetType = string;

export type AssetStatus = 'available' | 'checked-out' | 'maintenance' | 'retired';

export type DepartmentType = string;

export interface Asset {
  id: string; // unique Asset ID like "AST-2026-0001"
  type: AssetType;
  name: string;
  serialNumber: string;
  brand: string;
  model: string;
  os: string; // operating system or firmware version, e.g. "macOS Sequoia", "Windows 11 Pro", "Linux Ubuntu 22.04"
  purchaseDate: string; // YYYY-MM-DD
  purchaseCost: number;
  department: DepartmentType;
  location: string;
  status: AssetStatus;
  assignedTo: string | null; // Name of person currently holding it
  assignedEmail: string | null; // Email of person currently holding it
  assignedDate: string | null; // YYYY-MM-DD
  expectedReturnDate: string | null; // YYYY-MM-DD
  lastMaintenanceDate: string | null; // YYYY-MM-DD
  nextMaintenanceDate: string | null; // YYYY-MM-DD
  maintenanceFrequency: string; // e.g., 'monthly' | 'quarterly' | 'bi-annually' | 'annually' | 'none' or custom
  notes: string;
  company?: string; // Optional field specifying which corporate entity owns this asset
  ipAddress?: string; // e.g. "192.168.1.50"
  mailType?: 'INTERNAL' | 'EXTERNAL' | 'GROUP' | 'NIL';
  usb?: 'ALLOW' | 'BLOCK';
  emailAddress?: string;
}

export interface AssignmentLog {
  id: string;
  assetId: string;
  assetName: string;
  assetType: AssetType;
  action: 'check-out' | 'check-in';
  employeeName: string;
  employeeEmail: string;
  department: DepartmentType;
  date: string; // YYYY-MM-DD HH:MM
  notes: string;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string or human-readable
  action: string; // e.g. "Asset Created", "Check-out Logged", "Check-in Logged", "Maintenance Scheduled"
  details: string; // e.g. "Asset AST-2026-004 checked out to John Doe"
  category: 'create' | 'update' | 'check-out' | 'check-in' | 'maintenance' | 'delete';
  user: string; // person who performed the action (e.g. saravananengineerit@gmail.com)
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  assetName: string;
  date: string;
  performer: string;
  type: 'routine' | 'repair' | 'upgrade' | 'calibration';
  cost: number;
  details: string;
  outcome: 'resolved' | 'escalated' | 'retired';
}

export interface TicketComment {
  id: string;
  ticketId: string;
  author: string;
  authorEmail: string;
  timestamp: string;
  content: string; // Support simple rich markdown text
  isInternal: boolean; // support internal-only technical notes
}

export interface TicketAudit {
  id: string;
  ticketId: string;
  timestamp: string;
  actor: string;
  action: string; // e.g. "Status Changed", "Agent Assigned", "Ticket Created"
  details: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  status: 'new' | 'in-progress' | 'pending-user' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'hardware' | 'software' | 'network' | 'user-access' | 'other';
  assignedAgentId: string | null; // agent's email
  assignedAgentName: string | null;
  requesterId: string; // requester's email
  requesterName: string;
  slaBreachTime: string; // timestamp when SLA breaches
  isSlaBreached?: boolean;
}

