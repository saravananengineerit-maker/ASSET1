import React, { useState, useEffect, useMemo } from 'react';
import { 
  Laptop, Monitor, Server, Wrench, Clock, AlertTriangle, FileText, Download, 
  CheckCircle2, Trash2, Edit, X, Calendar, User, Tag, MapPin, 
  ArrowRight, RefreshCw, BarChart2, ShieldAlert, ChevronDown, Check,
  MessageSquare, Lock, EyeOff, Paperclip, Send, Plus, Filter, Search, AlertCircle, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Asset, Ticket, TicketComment, TicketAudit } from '../types';

interface AppUser {
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer' | 'root' | 'manager_viewer';
  company: string;
  pageMaster: boolean;
  pageEntry: boolean;
  pageReports: boolean;
  isAssetUser?: boolean;
}

interface TicketCallSystemProps {
  currentUser: AppUser;
  assets: Asset[];
}

export default function TicketCallSystem({ currentUser, assets }: TicketCallSystemProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [audits, setAudits] = useState<TicketAudit[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states for creating a new ticket
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newCategory, setNewCategory] = useState<'hardware' | 'software' | 'network' | 'user-access' | 'other'>('software');
  const [newAssetId, setNewAssetId] = useState<string>('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [commentIsInternal, setCommentIsInternal] = useState(false);
  
  // File attachments state simulator
  const [simulatedFiles, setSimulatedFiles] = useState<{name: string, size: string}[]>([]);
  const [emailAlerts, setEmailAlerts] = useState<any[]>([]);
  
  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOwnership, setFilterOwnership] = useState<'all' | 'my-tickets' | 'my-assigned'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Notification Toast Helper
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ message: msg, type });
    setTimeout(() => {
      setToast({ message: '', type: null });
    }, 4000);
  };

  // Check if active user has permission to triage / assign / change statuses
  const isAgentOrAdmin = useMemo(() => {
    return currentUser.role === 'admin' || currentUser.role === 'root' || currentUser.role === 'manager' || currentUser.role === 'manager_viewer';
  }, [currentUser]);

  // Read entire state from API endpoint with backup seed fallback in case Server is loading
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const ticketsRes = await fetch('/api/tickets');
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData);
        
        // If a ticket is currently selected, fetch its comments & audits
        if (selectedTicket) {
          const currentFresh = ticketsData.find((t: Ticket) => t.id === selectedTicket.id);
          if (currentFresh) {
            setSelectedTicket(currentFresh);
          }
        }
      }

      const commentsRes = await fetch('/api/tickets/comments');
      if (commentsRes.ok) {
        setComments(await commentsRes.json());
      }

      const auditsRes = await fetch('/api/tickets/audits');
      if (auditsRes.ok) {
        setAudits(await auditsRes.json());
      }

      // Fetch dynamic simulated SMTP emails output
      const alertsRes = await fetch('/api/tickets/email-alerts');
      if (alertsRes.ok) {
        setEmailAlerts(await alertsRes.json());
      }
    } catch (err) {
      console.warn("REST Ticketing Endpoints loaded in context simulator. Retrying offline hooks.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Run on mount and establish a 10s automatic SLA poll trigger
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000); // Poll silently every 10s
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  // Handle ticket creation workflow
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      triggerToast("Please enter a clear title and description details.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const selectedAssetObj = assets.find(a => a.id === newAssetId);
      const ticketDept = selectedAssetObj?.department || 'IT';

      const payload = {
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        category: newCategory,
        requesterId: currentUser.email,
        requesterName: currentUser.name,
        assetId: newAssetId || undefined,
        department: ticketDept
      };

      const res = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        triggerToast(`Ticket ${created.id} submitted for telemetry review successfully!`, 'success');
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewPriority('medium');
        setNewCategory('software');
        setNewAssetId('');
        fetchData();
      } else {
        const err = await res.json();
        triggerToast(`Creation failed: ${err.error || "Internal Error"}`, 'error');
      }
    } catch (err) {
      triggerToast("Failed to link with live API. Setting local ticket backup.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle assignment endpoint transition
  const handleAssignTicket = async (agentEmail: string, agentName: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch('/api/tickets/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          agentId: agentEmail || null,
          agentName: agentName || null
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        triggerToast(`Assigned responsibly to ${agentName || 'TEAM POOL'}`, 'info');
        fetchData(true);
      }
    } catch (err) {
      triggerToast("API routing error on assignment updates", "error");
    }
  };

  // Handle Status transitions through enums (New ➡️ In Progress ➡️ Pending User ➡️ Resolved)
  const handleUpdateStatus = async (nextStatus: 'new' | 'in-progress' | 'pending-user' | 'resolved') => {
    if (!selectedTicket) return;
    try {
      const res = await fetch('/api/tickets/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          status: nextStatus,
          actorName: currentUser.name
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        triggerToast(`Ticket status transitioned into ${nextStatus.toUpperCase()}`, 'success');
        fetchData(true);
      }
    } catch (err) {
      triggerToast("Error resolving network status update", "error");
    }
  };

  // Handle placing a Comment with rich formatting/attachment capabilities
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!commentText.trim() && simulatedFiles.length === 0)) return;

    let finalContent = commentText;
    if (simulatedFiles.length > 0) {
      const fileTags = simulatedFiles.map(f => `📎 [Attachment: ${f.name} (${f.size})]`).join('\n');
      finalContent = `${finalContent}\n\n${fileTags}`;
    }

    try {
      const res = await fetch('/api/tickets/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          author: currentUser.name,
          authorEmail: currentUser.email,
          content: finalContent,
          isInternal: commentIsInternal
        })
      });

      if (res.ok) {
        setCommentText('');
        setCommentIsInternal(false);
        setSimulatedFiles([]);
        triggerToast("Note recorded in ticket timeline.", "success");
        fetchData(true);
      }
    } catch (err) {
      triggerToast("Error persisting comment text", "error");
    }
  };

  // Simulate file drops
  const addSimulatedAttachment = () => {
    const list = [
      { name: 'diagnostics_dump.txt', size: '14.2 KB' },
      { name: 'screen_glitch_photo.png', size: '422 KB' },
      { name: 'vswitch_routing_table.log', size: '2.5 KB' }
    ];
    // pick random
    const item = list[Math.floor(Math.random() * list.length)];
    setSimulatedFiles(prev => [...prev, item]);
    triggerToast(`Attached simulated file: ${item.name}`, 'info');
  };

  // Filter logic
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Access controls: regular asset users or standard viewers can only view their own service call tickets
      if (currentUser && (currentUser.isAssetUser || currentUser.role === 'viewer') && !isAgentOrAdmin) {
        if (ticket.requesterId.toLowerCase() !== currentUser.email.toLowerCase()) {
          return false;
        }
      }

      // 1. Text search
      const matchesSearch = 
        ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.requesterName.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Status check
      const matchesStatus = filterStatus === 'all' ? true : ticket.status === filterStatus;

      // 3. Priority check
      const matchesPriority = filterPriority === 'all' ? true : ticket.priority === filterPriority;

      // 4. Category check
      const matchesCategory = filterCategory === 'all' ? true : ticket.category === filterCategory;

      // 5. Ownership scope check
      let matchesOwnership = true;
      if (filterOwnership === 'my-tickets') {
        matchesOwnership = ticket.requesterId === currentUser.email;
      } else if (filterOwnership === 'my-assigned') {
        matchesOwnership = ticket.assignedAgentId === currentUser.email;
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesOwnership;
    });
  }, [tickets, searchQuery, filterStatus, filterPriority, filterCategory, filterOwnership, currentUser.email, isAgentOrAdmin]);

  // Pagination slicing
  const paginatedTickets = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;

  // Filtered ticket comments in detail card
  const filteredComments = useMemo(() => {
    if (!selectedTicket) return [];
    const allC = comments.filter(c => c.ticketId === selectedTicket.id);
    // Hide internal notes from non-agents/non-IT engineers
    if (!isAgentOrAdmin) {
      return allC.filter(c => !c.isInternal);
    }
    return allC;
  }, [comments, selectedTicket, isAgentOrAdmin]);

  // Live Metrics calculations for UI Dashboard
  const metrics = useMemo(() => {
    const total = filteredTickets.length;
    const resolved = filteredTickets.filter(t => t.status === 'resolved').length;
    const active = total - resolved;
    const breached = filteredTickets.filter(t => t.isSlaBreached && t.status !== 'resolved').length;
    const breachPct = total > 0 ? Math.round((breached / total) * 100) : 0;

    const categorySplit = {
      hardware: filteredTickets.filter(t => t.category === 'hardware').length,
      software: filteredTickets.filter(t => t.category === 'software').length,
      network: filteredTickets.filter(t => t.category === 'network').length,
      'user-access': filteredTickets.filter(t => t.category === 'user-access').length,
      other: filteredTickets.filter(t => t.category === 'other').length,
    };

    const prioritySplit = {
      critical: filteredTickets.filter(t => t.priority === 'critical').length,
      high: filteredTickets.filter(t => t.priority === 'high').length,
      medium: filteredTickets.filter(t => t.priority === 'medium').length,
      low: filteredTickets.filter(t => t.priority === 'low').length,
    };

    return {
      total,
      resolved,
      active,
      breached,
      breachPct,
      categorySplit,
      prioritySplit
    };
  }, [filteredTickets]);

  const categoryChartData = useMemo(() => {
    return [
      { name: 'Hardware Issue', value: metrics.categorySplit.hardware, color: '#3B82F6' },
      { name: 'Software Glitch', value: metrics.categorySplit.software, color: '#10B981' },
      { name: 'Network Flap', value: metrics.categorySplit.network, color: '#6366F1' },
      { name: 'User Access Reset', value: metrics.categorySplit['user-access'], color: '#F59E0B' },
      { name: 'Other Support Call', value: metrics.categorySplit.other, color: '#EC4899' },
    ].filter(item => item.value > 0);
  }, [metrics]);

  const priorityChartData = useMemo(() => {
    return [
      { name: 'Critical Priority', count: metrics.prioritySplit.critical, fill: '#EF4444' },
      { name: 'High Priority', count: metrics.prioritySplit.high, fill: '#F59E0B' },
      { name: 'Medium Priority', count: metrics.prioritySplit.medium, fill: '#3B82F6' },
      { name: 'Low Priority', count: metrics.prioritySplit.low, fill: '#10B981' },
    ];
  }, [metrics]);

  // SLA time remaining generator format
  const getSlaTimeLabel = (ticket: Ticket) => {
    if (ticket.status === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
          <CheckCircle2 size={10} /> Resolved - SLA Compliant
        </span>
      );
    }

    const breachDate = new Date(ticket.slaBreachTime);
    const now = new Date();
    const diffMs = breachDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-600 border border-red-100 uppercase animate-pulse">
          <ShieldAlert size={10} /> SLA Breached!
        </span>
      );
    }

    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffMins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
        <Clock size={10} /> SLA: {diffHours}h {diffMins}m remaining
      </span>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Toast Alert Notice */}
      {toast.message && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900 border border-slate-800 text-white py-3 px-5 rounded-2xl shadow-2xl text-xs font-semibold select-none animate-slide-in">
          <span className="text-sm">
            {toast.type === 'success' ? '⚡' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <p>{toast.message}</p>
        </div>
      )}

      {/* Top Welcome Title Grid */}
      <div className="bg-slate-900 text-slate-100 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 font-bold text-[10px] uppercase tracking-wider rounded-full border border-blue-500/30">
            <Sparkles size={10} /> IT Helpdesk Portal Active
          </div>
          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight">IT Service Call Core</h2>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl leading-relaxed">
            Corporate digital service request workspace. Monitor active infrastructure trouble tickets, coordinate technician tasks, track real-time SLA thresholds, and view internal diagnostic audit lines.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 z-10">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync Tickets
          </button>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-xs font-extrabold cursor-pointer border border-blue-500 hover:scale-102 transition-all shadow-lg shadow-blue-900/40"
          >
            <Plus size={16} /> File Service Call
          </button>
        </div>

        {/* Ambient absolute background visuals */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl -z-0"></div>
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-indigo-500/10 rounded-full filter blur-2xl -z-0"></div>
      </div>

      {/* SLA & Ticketing KPIs Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Aggregate Queues</span>
          <p className="text-2xl font-black text-slate-800 mt-1">{metrics.total}</p>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-50 pt-2">
            <span>Active Tickets</span>
            <span className="font-extrabold text-blue-500">{metrics.active} remaining</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Resolved Calls</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {metrics.resolved}
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-50 pt-2">
            <span>SLA Resolution Rate</span>
            <span className="font-bold text-slate-700">
              {metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">SLA Breached Tracks</span>
          <p className={`text-2xl font-black mt-1 ${metrics.breached > 0 ? "text-red-500 animate-pulse" : "text-slate-800"}`}>
            {metrics.breached}
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-50 pt-2">
            <span>% Limit Breach</span>
            <span className={`font-bold ${metrics.breached > 0 ? "text-red-500" : "text-slate-600"}`}>
              {metrics.breachPct}%
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Portal Access Role</span>
          <p className="text-sm font-bold text-indigo-600 mt-2.5 truncate">{currentUser.name}</p>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 border-t border-slate-50 pt-2">
            <span>Privilege Rank</span>
            <span className="font-extrabold uppercase bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700 text-[8px]">
              {currentUser.role}
            </span>
          </div>
        </div>

      </div>

      {/* Main Multi-Grid Body */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Filtering controls & Ticket Queues Table (8 Columns on XL) */}
        <div className="xl:col-span-8 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
            
            {/* Header with Search and Active Filters layout */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                
                {/* Search Block */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search by Title, ID, description, or requester name..."
                    className="w-full flex items-center pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden placeholder-slate-400 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filters Row Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Status filter dropdown */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-3xs">
                    <span className="text-slate-400">Status:</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                      className="bg-transparent outline-none cursor-pointer text-slate-700 font-extrabold"
                    >
                      <option value="all">All States</option>
                      <option value="new">New Requests</option>
                      <option value="in-progress">In Progress</option>
                      <option value="pending-user">Pending User</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Priority filter dropdown */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-3xs">
                    <span className="text-slate-400">Priority:</span>
                    <select
                      value={filterPriority}
                      onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
                      className="bg-transparent outline-none cursor-pointer text-slate-700 font-extrabold"
                    >
                      <option value="all">All Levels</option>
                      <option value="critical">🚨 Critical</option>
                      <option value="high">🟠 High</option>
                      <option value="medium">🔵 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>

                  {/* Ownership filter toggle button */}
                  <div className="flex border border-slate-200 rounded-xl bg-white p-0.5 shadow-3xs overflow-hidden">
                    <button
                      onClick={() => { setFilterOwnership('all'); setCurrentPage(1); }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        filterOwnership === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => { setFilterOwnership('my-tickets'); setCurrentPage(1); }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        filterOwnership === 'my-tickets' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      My Filed
                    </button>
                    <button
                      onClick={() => { setFilterOwnership('my-assigned'); setCurrentPage(1); }}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        filterOwnership === 'my-assigned' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      My Tasks
                    </button>
                  </div>

                </div>

              </div>

              {/* Show metrics or dynamic indicators if filters applied */}
              {(filterStatus !== 'all' || filterPriority !== 'all' || searchQuery || filterOwnership !== 'all') && (
                <div className="flex justify-between items-center bg-blue-50 border border-blue-100/50 rounded-xl px-4 py-2.5 text-[11px] text-blue-700">
                  <div className="flex items-center gap-1.5">
                    <Filter size={12} />
                    <span>Filtering outputs: Found <strong>{filteredTickets.length} matching tickets</strong></span>
                  </div>
                  <button
                    onClick={() => {
                        setFilterStatus('all');
                        setFilterPriority('all');
                        setFilterCategory('all');
                        setFilterOwnership('all');
                        setSearchQuery('');
                        setCurrentPage(1);
                    }}
                    className="hover:underline font-extrabold cursor-pointer text-blue-800"
                  >
                    Clear Filter Axes
                  </button>
                </div>
              )}
            </div>

            {/* Grid Table Workspace */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100/40 text-slate-400 font-bold uppercase text-[9px] tracking-widest border-b border-slate-100">
                    <th className="py-3.5 px-5">Ticket ID</th>
                    <th className="py-3.5 px-4 w-[240px]">Service Scope & Title</th>
                    <th className="py-3.5 px-3 text-center">Priority</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4">Requester / Asset</th>
                    <th className="py-3.5 px-4">Assigned Agent</th>
                    <th className="py-3.5 px-4">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-24 text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw size={24} className="animate-spin text-indigo-500" />
                          <p className="font-semibold text-xs text-slate-500 font-sans">Connecting with full-stack IT service call APIs...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-24 text-slate-400 bg-slate-50/10">
                        <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                          <Wrench size={32} className="text-slate-300" />
                          <p className="font-bold text-slate-700 mt-2">No Service Calls Registered</p>
                          <p className="text-[11px] text-slate-450 text-center leading-normal">
                             No troubleshooting tickets match these options. Change your search criteria or register a new troubleshooting request using the button above.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map((ticket) => {
                      const idNum = ticket.id;
                      const isSelected = selectedTicket?.id === ticket.id;
                      
                      let priorityClass = '';
                      if (ticket.priority === 'critical') priorityClass = 'bg-red-100 text-red-800 border-red-200';
                      else if (ticket.priority === 'high') priorityClass = 'bg-amber-100 text-amber-800 border-amber-200';
                      else if (ticket.priority === 'medium') priorityClass = 'bg-blue-100 text-blue-800 border-blue-200';
                      else priorityClass = 'bg-slate-100 text-slate-800 border-slate-200';

                      let statusClass = '';
                      let statusText = '';
                      if (ticket.status === 'new') {
                        statusClass = 'bg-indigo-500 text-white';
                        statusText = 'NEW';
                      } else if (ticket.status === 'in-progress') {
                        statusClass = 'bg-amber-500 text-white';
                        statusText = 'TRIAGE';
                      } else if (ticket.status === 'pending-user') {
                        statusClass = 'bg-sky-500 text-white';
                        statusText = 'PENDING USER';
                      } else {
                        statusClass = 'bg-green-500 text-white';
                        statusText = 'RESOLVED';
                      }

                      return (
                        <tr
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/40 border-l-4 border-indigo-500 font-medium' : ''
                          }`}
                        >
                          {/* Ticket ID */}
                          <td className="py-4 px-5">
                            <span className="font-mono font-bold text-[10px] text-slate-400 block tracking-tight">
                              {ticket.id}
                            </span>
                            <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider px-1 bg-slate-100 rounded">
                              {ticket.category}
                            </span>
                          </td>

                          {/* Scope Title */}
                          <td className="py-4 px-4">
                            <p className="font-semibold text-slate-800 leading-snug line-clamp-1">{ticket.title}</p>
                            <p className="text-[10px] text-slate-400 font-sans line-clamp-1 mt-0.5">{ticket.description}</p>
                          </td>

                          {/* Priority Indicator */}
                          <td className="py-4 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${priorityClass}`}>
                              {ticket.priority.toUpperCase()}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${statusClass}`}>
                              {statusText}
                            </span>
                          </td>

                          {/* Requester & Asset ID Link */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="text-slate-800 block text-[11px] font-bold">{ticket.requesterName}</span>
                            {ticket.assetId ? (
                              <span className="text-[9px] font-mono text-indigo-600 block hover:underline">
                                🔌 Link: {ticket.assetId}
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 block">No hardware tagged</span>
                            )}
                          </td>

                          {/* Assigned Agent */}
                          <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                            <p className="font-semibold text-[11px] text-slate-700">
                              {ticket.assignedAgentName || (
                                <span className="text-red-500/80 font-bold bg-red-50 px-1 py-0.5 rounded text-[10px] inline-block">
                                  ⚠️ Team Queue
                                </span>
                              )}
                            </p>
                            {ticket.assignedAgentId && (
                              <span className="text-[9px] text-slate-400 block font-mono">
                                {ticket.assignedAgentId}
                              </span>
                            )}
                          </td>

                          {/* Compliance / SLA timer representation */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {getSlaTimeLabel(ticket)}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredTickets.length > 0 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
                <span className="font-medium text-slate-500">
                  Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                  <strong className="text-slate-800">
                    {Math.min(currentPage * itemsPerPage, filteredTickets.length)}
                  </strong>{" "}
                  of <strong className="text-slate-800">{filteredTickets.length}</strong> service request entries
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold disabled:opacity-40 select-none cursor-pointer"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        currentPage === i + 1 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold disabled:opacity-40 select-none cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Embedded Ticketing Recharts Visual Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            
            {/* Category Pie allocations */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Category Split of Active Service Requests
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Distribution counts by problem segment metrics.</p>

              <div className="h-[210px] w-full mt-4 flex items-center justify-center">
                {categoryChartData.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No tickets in selection to display chart</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Requests`, 'Count']} />
                      <Legend 
                        iconType="circle"
                        iconSize={8}
                        content={({ payload }) => (
                          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-slate-500 font-medium pb-2">
                            {payload?.map((entry: any, i: number) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span>{entry.value}: <strong className="text-slate-800">{categoryChartData[i]?.value}</strong></span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Priority Bar Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Trouble Severity Queue Status
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Raw counts categorized under SLA response priority.</p>

              <div className="h-[210px] w-full mt-4">
                {priorityChartData.every(d => d.count === 0) ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-400">
                     <p className="text-[11px] text-slate-400 italic">No priority metrics under active parameters</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={25}>
                        {priorityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Triage actions, Comments Thread, Attachment upload simulation & Immutable Log (4 Columns on XL) */}
        <div className="xl:col-span-4 space-y-4">
          
          {selectedTicket ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden divide-y divide-slate-100 flex flex-col">
              
              {/* Detail Header & Action Panel */}
              <div className="p-5 space-y-4 bg-slate-50/40">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-mono font-bold text-[10px] text-slate-400 uppercase tracking-wider bg-slate-100 rounded px-1.5 py-0.5">
                      {selectedTicket.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight mt-1.5">{selectedTicket.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="text-slate-600 text-xs leading-relaxed bg-white border border-slate-100 p-3.5 rounded-xl font-sans text-[11px]">
                  <p className="font-bold text-slate-850 border-b border-indigo-50/50 pb-1.5 mb-1.5 flex items-center gap-1.5">
                    📝 Detailed Description Context
                  </p>
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Ticket Metadata Blocks */}
                <div className="grid grid-cols-2 gap-2.5 text-[10px] font-sans">
                  <div className="bg-slate-100/60 p-2 rounded-lg">
                    <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[8px]">Filed By Employee</span>
                    <span className="text-slate-700 font-bold block mt-0.5 truncate">{selectedTicket.requesterName}</span>
                    <span className="text-slate-400 block font-mono mt-0.5 truncate text-[9px]">{selectedTicket.requesterId}</span>
                  </div>
                  <div className="bg-slate-100/60 p-2 rounded-lg">
                    <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[8px]">Linked Inventory Item</span>
                    {selectedTicket.assetId ? (
                      <span className="text-indigo-600 font-bold block mt-0.5 font-mono text-[9px]">
                        🔌 {selectedTicket.assetId}
                      </span>
                    ) : (
                      <span className="text-slate-500 block mt-0.5 italic">None Linked</span>
                    )}
                  </div>
                </div>

                {/* Triage Status Transitions (Visible only to authorized Admins & IT Engineers) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                    IT Engineer Control Center
                  </span>
                  
                  {isAgentOrAdmin ? (
                    <div className="space-y-3">
                      
                      {/* Ticket Ownership Assignment control */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Technician Assignment:</label>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAssignTicket(currentUser.email, currentUser.name)}
                            disabled={selectedTicket.assignedAgentId === currentUser.email}
                            className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition-colors cursor-pointer disabled:opacity-45"
                          >
                             Assign To Me
                          </button>
                          
                          {selectedTicket.assignedAgentId && (
                            <button
                              onClick={() => handleAssignTicket('', '')}
                              className="bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 text-[10px] font-bold py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                            >
                              Release
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status select switches (transitions through enums) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Status Transition Selector:</label>
                        <div className="grid grid-cols-4 gap-1 text-[9px]">
                          <button
                            onClick={() => handleUpdateStatus('new')}
                            className={`py-1.5 rounded-md font-bold transition-all border ${
                              selectedTicket.status === 'new' 
                                ? 'bg-indigo-600 text-white border-indigo-600 font-black shadow-xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            NEW
                          </button>
                          <button
                            onClick={() => handleUpdateStatus('in-progress')}
                            className={`py-1.5 rounded-md font-bold transition-all border ${
                              selectedTicket.status === 'in-progress' 
                                ? 'bg-amber-500 text-white border-amber-500 font-black shadow-xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            TRIAGE
                          </button>
                          <button
                            onClick={() => handleUpdateStatus('pending-user')}
                            className={`py-1.5 rounded-md font-bold transition-all border relative ${
                              selectedTicket.status === 'pending-user' 
                                ? 'bg-sky-500 text-white border-sky-500 font-black shadow-xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            WAITING
                          </button>
                          <button
                            onClick={() => handleUpdateStatus('resolved')}
                            className={`py-1.5 rounded-md font-bold transition-all border ${
                              selectedTicket.status === 'resolved' 
                                ? 'bg-green-500 text-white border-green-500 font-black shadow-xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            RESOLVED
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-800 leading-normal flex items-start gap-2">
                       <Lock size={12} className="shrink-0 text-amber-500 mt-0.5" />
                       <p>
                         <strong>SLA Triage Read-Only Mode</strong>: Your employee profile is not classified as an IT system technician. You can add public notes to the timeline or file new trouble requests.
                       </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Comments Thread & History Timeline Tabs */}
              <div className="p-5 space-y-4 max-h-[380px] overflow-y-auto">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                  Interactive Activity Thread ({filteredComments.length})
                </span>

                <div className="space-y-3.5">
                  {filteredComments.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                      <MessageSquare size={20} className="mx-auto text-slate-350" />
                      <p className="text-[11px] font-bold text-slate-500 mt-2">No comments logged yet.</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Submit the first message thread using the composer below.</p>
                    </div>
                  ) : (
                    filteredComments.map((comment) => (
                      <div 
                        key={comment.id} 
                        className={`p-3 rounded-xl border text-[11px] leading-relaxed transition-all ${
                          comment.isInternal 
                            ? 'bg-amber-50/60 border-amber-200/85 text-slate-700 shadow-3xs' 
                            : 'bg-slate-50 border-slate-150/70 text-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center pb-1 border-b border-slate-100/50 mb-1.5">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            {comment.author} 
                            {comment.isInternal && (
                              <span className="text-[8px] uppercase px-1 rounded bg-amber-500 text-white font-extrabold flex items-center gap-0.5">
                                <Lock size={8} /> Internal Tech Note
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-line text-slate-650">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Audit Trajectory logs */}
                <div className="pt-4 border-t border-slate-150/75 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">
                    Immutable Compliance Autits (Logs)
                  </span>

                  <div className="space-y-2.5">
                    {audits.filter(a => a.ticketId === selectedTicket.id).length === 0 ? (
                      <p className="text-[9px] text-slate-400 italic">No historical traces tracked.</p>
                    ) : (
                      audits.filter(a => a.ticketId === selectedTicket.id).map((auditLog) => (
                        <div key={auditLog.id} className="text-[10px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>🛠️ {auditLog.action}</span>
                            <span className="text-[8px] text-slate-400">{new Date(auditLog.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[9.5px] text-slate-450 mt-1 leading-normal">{auditLog.details}</p>
                          <span className="text-[8px] bg-white border border-slate-100 px-1 rounded block mt-1.5 w-max font-bold">
                            By: {auditLog.actor}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Rich note formatting input composer form */}
              <form onSubmit={handlePostComment} className="p-4 bg-slate-50/50 space-y-3">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      commentIsInternal 
                        ? "Enter internal diagnostic notes visible only to engineers..." 
                        : "Post response update or instructions to this trouble call..."
                    }
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 outline-hidden tracking-tight rounded-xl p-3 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500/80 transition-all font-sans"
                  />
                  
                  {/* File attach simulated labels */}
                  {simulatedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                      {simulatedFiles.map((file, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full py-0.5 px-2 text-[9px] font-medium font-mono">
                          <Paperclip size={8} /> {file.name}
                          <button type="button" onClick={() => setSimulatedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-indigo-400 hover:text-indigo-600 focus:outline-hidden cursor-pointer font-bold">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    
                    {/* Simulator Attachment button */}
                    <button
                      type="button"
                      onClick={addSimulatedAttachment}
                      title="Attach diagnostic file screenshot or configuration table"
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <Paperclip size={13} />
                    </button>

                    {/* Internal private tab toggle for IT Agents */}
                    {isAgentOrAdmin && (
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={commentIsInternal}
                          onChange={(e) => setCommentIsInternal(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3 w-3"
                        />
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-0.5">
                          <EyeOff size={10} className="text-amber-500 shrink-0" /> Internal Only
                        </span>
                      </label>
                    )}

                  </div>

                  <button
                    type="submit"
                    disabled={!commentText.trim() && simulatedFiles.length === 0}
                    className="flex items-center gap-1 text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer disabled:opacity-40 transition-all font-sans"
                  >
                    <Send size={11} /> Comment
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-2xl text-center text-slate-400">
              <MessageSquare size={28} className="mx-auto text-slate-300" />
              <h4 className="text-xs font-bold text-slate-700 mt-3 uppercase tracking-wider">No Ticket Inspected</h4>
              <p className="text-[11px] text-slate-455 leading-normal max-w-xs mx-auto mt-1">
                 Select any service request from the dynamic table list to coordinate Technician tasks, compose comments, or view compliance SLA countdowns.
              </p>
            </div>
          )}

          {/* DYNAMIC SMTP MAIL TRIGGER DISPATCH LIVE LOG */}
          <div id="smtp-email-alerts-logger" className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-5 space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base text-blue-650">📬</span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">SMTP Email Alerts Dispatched</h4>
                  <p className="text-[9px] text-slate-400 block tracking-tight leading-none">Automated Security Multi-recipient Broadcasts</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                LIVE RELAY
              </span>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Whenever an asset user registers a service request, the active backend automatically transmits immediate alert logs to the <strong>Admin</strong>, the <strong>Requester</strong>, and the respective department <strong>HOD</strong>.
            </p>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {emailAlerts.length === 0 ? (
                <div className="text-center py-6 text-slate-350 bg-slate-50 border border-dashed border-slate-150 rounded-xl">
                  <span className="block text-lg">📁</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider block mt-1">SMTP Queue Idle</span>
                  <span className="text-[9px] block">No trouble tickets filed this session yet.</span>
                </div>
              ) : (
                emailAlerts.slice(0, 5).map((mail: any) => (
                  <div key={mail.id} className="bg-slate-50 border border-slate-150/65 rounded-xl p-3 space-y-2 text-[10px] hover:border-blue-200 hover:bg-blue-50/10 transition-all">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-extrabold text-blue-700 uppercase bg-blue-50 border border-blue-100 rounded px-1.5 py-0.2 select-none tracking-wider text-[8px]">
                        {mail.id}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold">
                        {new Date(mail.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 block line-clamp-1">{mail.subject}</span>
                      
                      <div className="grid grid-cols-1 gap-1 text-[8.5px] border-t border-slate-100 pt-1.5 mt-1 font-mono">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold shrink-0">👑 Admin To:</span>
                          <span className="text-slate-700 truncate">{mail.recipients[0]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold shrink-0">👤 User To:</span>
                          <span className="text-slate-700 truncate">{mail.recipients[1]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold shrink-0">🔥 HOD To:</span>
                          <span className="text-slate-700 truncate font-extrabold">{mail.recipients[2]}</span>
                        </div>
                      </div>
                    </div>

                    <details className="group border-t border-slate-100 pt-1.5 mt-1">
                      <summary className="list-none flex justify-between items-center text-[9px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer select-none">
                        <span>Read Email Body Content</span>
                        <span className="text-teal-600 group-open:hidden">Show ▾</span>
                        <span className="text-teal-600 hidden group-open:inline">Hide ▴</span>
                      </summary>
                      <pre className="mt-2 text-[8px] leading-relaxed text-slate-600 bg-white border border-slate-200/60 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap font-mono">
                        {mail.content}
                      </pre>
                    </details>
                  </div>
                ))
              )}
            </div>

            {emailAlerts.length > 5 && (
              <p className="text-center text-[8.5px] font-bold text-slate-400 italic">
                + {emailAlerts.length - 5} older telemetry SMTP dispatches active.
              </p>
            )}

          </div>

        </div>

      </div>

      {/* CREATE SERVICE CALL TICKETING DIALOG MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-zoom-in">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛎️</span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">File IT Service Call</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Define your trouble ticket params to notify agents.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 text-xs font-sans text-slate-700">
              
              {/* Requester display info */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150/75 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Assumed Requester Email:</span>
                  <span className="text-slate-700 font-black font-mono block">{currentUser.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">Name:</span>
                  <span className="text-slate-800 font-black block">{currentUser.name}</span>
                </div>
              </div>

              {/* Title Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Ticket Subject / Short Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., VLAN routing failure after switch reboot or VPN lockout"
                  className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 outline-hidden tracking-tight rounded-xl p-3 placeholder-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Description Context */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Detailed Diagnostic Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Include step-by-step notes, error console logs, screen observations, or hardware serial flags."
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 outline-hidden tracking-tight rounded-xl p-3 placeholder-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    SLA Problem Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 outline-hidden rounded-xl p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="hardware">Hardware Fault</option>
                    <option value="software">Software / OS Glitch</option>
                    <option value="network">Network Routing Flap</option>
                    <option value="user-access">User Password / Access Block</option>
                    <option value="other">Other System Request</option>
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Severity Priority Level *
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 outline-hidden rounded-xl p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="low">🟢 Low (24h response SLA)</option>
                    <option value="medium">🔵 Medium (12h response SLA)</option>
                    <option value="high">🟠 High (6h response SLA)</option>
                    <option value="critical">🚨 Critical (2h override response SLA)</option>
                  </select>
                </div>

              </div>

              {/* Tag registered Asset */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between items-center">
                  <span>Tag Registered Corporate Asset (Optional)</span>
                  <span className="text-[8px] font-normal text-slate-400 lowercase">correlates incident context</span>
                </label>
                <select
                  value={newAssetId}
                  onChange={(e) => setNewAssetId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 outline-hidden rounded-xl p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- No specific item tagged --</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      🔌 [{asset.id}] {asset.name} ({asset.brand} {asset.model})
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-[11px] font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-extrabold py-2.5 rounded-xl border border-blue-500 shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Submission in Triage...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Submit Trouble Ticket
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
