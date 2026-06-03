import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface TicketComment {
  id: string;
  ticketId: string;
  author: string;
  authorEmail: string;
  timestamp: string;
  content: string;
  isInternal: boolean;
}

interface TicketAudit {
  id: string;
  ticketId: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  status: 'new' | 'in-progress' | 'pending-user' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'hardware' | 'software' | 'network' | 'user-access' | 'other';
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  requesterId: string;
  requesterName: string;
  slaBreachTime: string;
  isSlaBreached?: boolean;
  resolvedDate?: string;
  assetId?: string; // Optlink to asset registry
}

// In-Memory Database Store (Seeded with realistic, actionable initial IT service tickets)
interface EmailAlert {
  id: string;
  ticketId: string;
  sender: string;
  recipients: string[];
  subject: string;
  content: string;
  timestamp: string;
  department: string;
}

let emailAlerts: EmailAlert[] = [];

const HOD_EMAILS: Record<string, string> = {
  'IT': 'it.hod@company.com',
  'ENGINEERING': 'eng.hod@company.com',
  'FINANCE': 'finance.hod@company.com',
  'HR': 'hr.hod@company.com',
  'SALES': 'sales.hod@company.com',
  'OPERATIONS': 'operations.hod@company.com'
};

let tickets: Ticket[] = [
  {
    id: 'TCK-2026-1001',
    title: 'Intermittent VLAN Routing Flap in Engineering Bay',
    description: 'The developers at Engineering are reporting periodic socket drops. Checked Cisco boundary logs, looks like a loop on switch AST-2026-1004 during STP re-calculation.',
    createdDate: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(), // 3.5 hours ago
    status: 'in-progress',
    priority: 'high',
    category: 'network',
    assignedAgentId: 'saravananengineerit@gmail.com',
    assignedAgentName: 'Saravanan (ADMIN)',
    requesterId: 'sarah.connor@cyberdyne.co',
    requesterName: 'Sarah Connor',
    slaBreachTime: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(), // Breach is in 2.5 hours
    isSlaBreached: false,
    assetId: 'AST-2026-1004'
  },
  {
    id: 'TCK-2026-1002',
    title: 'Urgent Reset of Remote VPN Credentials',
    description: 'Newly assigned remote contractor needs access token reset and Duo 2FA enrolled for Chicago cluster. Policy blocks unregistered devices.',
    createdDate: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(), // 1.2 hours ago
    status: 'new',
    priority: 'medium',
    category: 'user-access',
    assignedAgentId: null,
    assignedAgentName: null,
    requesterId: 'marcus.chen@cyberdyne.co',
    requesterName: 'Marcus Chen',
    slaBreachTime: new Date(Date.now() + 6.8 * 3600 * 1000).toISOString(),
    isSlaBreached: false
  },
  {
    id: 'TCK-2026-1003',
    title: 'Flickering display line on MacBook Pro 16"',
    description: 'Assigned laptop screen shows a pink horizontal line at 120Hz refresh rates. Requires diagnostic hardware test at Apple Genius Bar.',
    createdDate: new Date(Date.now() - 11.5 * 3600 * 1000).toISOString(), // 11.5 hours ago
    status: 'pending-user',
    priority: 'critical',
    category: 'hardware',
    assignedAgentId: 'saravananengineerit@gmail.com',
    assignedAgentName: 'Saravanan (ADMIN)',
    requesterId: 'root.admin@company.com',
    requesterName: 'Root Admin',
    slaBreachTime: new Date(Date.now() - 9.5 * 3600 * 1000).toISOString(), // BREACHED 9.5 hours ago!
    isSlaBreached: true,
    assetId: 'AST-2026-1001'
  },
  {
    id: 'TCK-2026-1004',
    title: 'Red Hat Enterprise Linux Kernel Panic on Rack Host',
    description: 'Storage server dell PowerEdge experienced panic due to faulty SW-RAID controller. Controller replaced, RAID rebuilt successfully.',
    createdDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    status: 'resolved',
    priority: 'critical',
    category: 'hardware',
    assignedAgentId: 'saravananengineerit@gmail.com',
    assignedAgentName: 'Saravanan (ADMIN)',
    requesterId: 'linus.t@kernelorg.net',
    requesterName: 'Linus Torvalds',
    slaBreachTime: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
    isSlaBreached: false,
    resolvedDate: new Date(Date.now() - 45.8 * 3600 * 1000).toISOString(), // Resolved fast prior to breach
    assetId: 'AST-2026-1003'
  }
];

let comments: TicketComment[] = [
  {
    id: 'CMT-1001-1',
    ticketId: 'TCK-2026-1001',
    author: 'Saravanan (ADMIN)',
    authorEmail: 'saravananengineerit@gmail.com',
    timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    content: 'Inspected STP logs. Port Gi0/4 on physical rack has been forced to edge trunk. Monitoring packet drop rates.',
    isInternal: true
  },
  {
    id: 'CMT-1001-2',
    ticketId: 'TCK-2026-1001',
    author: 'Sarah Connor',
    authorEmail: 'sarah.connor@cyberdyne.co',
    timestamp: new Date(Date.now() - 1.8 * 3600 * 1000).toISOString(),
    content: 'Thank you! The ping drops are much less frequent now. Let us know if we can compile.',
    isInternal: false
  },
  {
    id: 'CMT-1003-1',
    ticketId: 'TCK-2026-1003',
    author: 'Saravanan (ADMIN)',
    authorEmail: 'saravananengineerit@gmail.com',
    timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    content: 'User notified to bring device to IT center for active replacement.',
    isInternal: false
  }
];

let ticketAudits: TicketAudit[] = [
  {
    id: 'AUD-1001',
    ticketId: 'TCK-2026-1001',
    timestamp: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    actor: 'Sarah Connor',
    action: 'Ticket Created',
    details: 'Ticket instantiated for Intermittent VLAN Routing Flap in Engineering'
  },
  {
    id: 'AUD-1002',
    ticketId: 'TCK-2026-1001',
    timestamp: new Date(Date.now() - 3.2 * 3600 * 1000).toISOString(),
    actor: 'Saravanan (ADMIN)',
    action: 'Ticket Assigned & Started',
    details: 'Assigned to Saravanan (ADMIN) and state changed from new to in-progress.'
  },
  {
    id: 'AUD-1003',
    ticketId: 'TCK-2026-1003',
    timestamp: new Date(Date.now() - 9.5 * 3600 * 1000).toISOString(),
    actor: 'SYSTEM SLA WATCHDOG',
    action: 'SLA Breached',
    details: 'Ticket failed to resolve within the stipulated 2-hour Critical Priority SLA. Escalation status flagged.'
  }
];

// SLA helper to calculate deadline based on priority
function getSlaDurationHours(priority: string): number {
  switch (priority) {
    case 'critical': return 2;
    case 'high': return 6;
    case 'medium': return 12;
    case 'low': return 24;
    default: return 8;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Background SLA Background Worker: Runs on server, checks timestamps every 15 seconds
  setInterval(() => {
    const now = new Date();
    let updated = false;
    tickets.forEach(ticket => {
      if (ticket.status !== 'resolved' && !ticket.isSlaBreached) {
        const breachTime = new Date(ticket.slaBreachTime);
        if (now > breachTime) {
          ticket.isSlaBreached = true;
          updated = true;
          // Insert target audit log
          ticketAudits.push({
            id: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
            ticketId: ticket.id,
            timestamp: now.toISOString(),
            actor: 'SYSTEM SLA WATCHDOG',
            action: 'SLA Breached',
            details: `Breached stipulated priority resolution deadline (${ticket.slaBreachTime}). Escalated automatically.`
          });
          console.log(`[SLA BREACH ALERT] Ticket ${ticket.id} (${ticket.title}) has breached its resolution SLA.`);
        }
      }
    });
  }, 15000);

  // ====================== API ENDPOINTS ======================

  // 1. GET ALL TICKETS & RELATED META
  app.get("/api/tickets", (req, res) => {
    res.json(tickets);
  });

  // 1.1 GET ALL EMAIL ALERTS TRIGGERED
  app.get("/api/tickets/email-alerts", (req, res) => {
    res.json(emailAlerts);
  });

  // 2. CREATE TICKET
  app.post("/api/tickets/create", (req, res) => {
    const { title, description, priority, category, requesterId, requesterName, assetId, department } = req.body;
    
    if (!title || !description || !priority || !category || !requesterId || !requesterName) {
      return res.status(400).json({ error: "Missing required ticketing payload fields (title, description, priority, category, requesterId, requesterName)." });
    }

    const nextIdNum = tickets.reduce((max, t) => {
      const match = t.id.match(/TCK-\d+-(\d+)/);
      if (match) {
        const val = parseInt(match[1]);
        return val > max ? val : max;
      }
      return max;
    }, 1004) + 1;

    const id = `TCK-2026-${nextIdNum}`;
    const createdDate = new Date().toISOString();
    
    const slaHours = getSlaDurationHours(priority);
    const slaBreachTime = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    const newTicket: Ticket = {
      id,
      title,
      description,
      createdDate,
      status: 'new',
      priority,
      category,
      assignedAgentId: null,
      assignedAgentName: null,
      requesterId,
      requesterName,
      slaBreachTime,
      isSlaBreached: false,
      assetId: assetId || undefined
    };

    tickets.unshift(newTicket);

    // Create Audit track record
    ticketAudits.push({
      id: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ticketId: id,
      timestamp: createdDate,
      actor: requesterName,
      action: 'Ticket Created',
      details: `New ${priority} priority ticket instantiated under category: ${category}. SLA response deadline set to ${slaBreachTime}.`
    });

    // --- TRIGGER EMAIL ALERTS Node ---
    const adminEmail = 'saravananengineerit@gmail.com';
    const userEmail = requesterId;
    const deptName = (department || 'IT').toUpperCase().trim();
    const hodEmail = HOD_EMAILS[deptName] || 'it.hod@company.com';

    const mailSubject = `[Service Call Alert] Ticket #${id} Created: "${title}"`;
    const mailContent = `Hi Team,
A new service request has been registered in the system.

=== TICKET TELEMETRY DETAILS ===
- Ticket ID: ${id}
- Subject: ${title}
- Description: ${description}
- Requester Name: ${requesterName}
- Requester Email: ${requesterId}
- Department: ${department || 'IT'}
- Priority Level: ${priority.toUpperCase()}
- Category Type: ${category.toUpperCase()}
- Asset Reference: ${assetId || 'N/A'}
- Created Timestamp: ${createdDate}
=============================

Please check the system console to claim and triage. This message is an automated IT alerts trigger.`;

    // Save alerts inside in-memory logger list
    emailAlerts.unshift({
      id: 'EML-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ticketId: id,
      sender: 'alerts-system@corporate-intranet.net',
      recipients: [adminEmail, userEmail, hodEmail],
      subject: mailSubject,
      content: mailContent,
      timestamp: createdDate,
      department: department || 'IT'
    });

    // Beautiful Print node in the terminal server stdout console
    console.log(`
========================================================================
📧 [SMTP MAIL DISPATCH ALERT] - NEW INCIDENT REGISTERED 📧
========================================================================
Message ID: EML-DISPATCH-${id}
Sender: alerts-system@corporate-intranet.net
Subject: ${mailSubject}
------------------------------------------------------------------------
Recipients:
   - 👑 Admin Email:  ${adminEmail}
   - 👤 Requester Email: ${userEmail}
   - 🏢 Respective HOD:  ${hodEmail} [Department: ${department || 'IT'}]

Content Detail body:
${mailContent}
------------------------------------------------------------------------
Dispatch Status: SUCCESS (Simulated SMTP relayed on local port 3000)
========================================================================
    `);

    res.status(201).json(newTicket);
  });

  // 3. ASSIGN TICKET (PUT /api/tickets/assign)
  app.put("/api/tickets/assign", (req, res) => {
    const { ticketId, agentId, agentName } = req.body;

    if (!ticketId) {
      return res.status(400).json({ error: "Missing ticketId for assignment parameter." });
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${ticketId} not found.` });
    }

    const oldAgent = ticket.assignedAgentName || 'Unassigned';
    ticket.assignedAgentId = agentId || null;
    ticket.assignedAgentName = agentName || null;

    if (ticket.status === 'new' && agentId) {
      ticket.status = 'in-progress';
    }

    const timestamp = new Date().toISOString();
    ticketAudits.push({
      id: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ticketId,
      timestamp,
      actor: agentName || 'System',
      action: 'Ticket Reassigned',
      details: `Responsibility reassigned from [${oldAgent}] to [${agentName || 'Unassigned'}]. Status auto-updated if required.`
    });

    res.json(ticket);
  });

  // 4. TRANSITION STATUS (PATCH /api/tickets/status)
  app.patch("/api/tickets/status", (req, res) => {
    const { ticketId, status, actorName } = req.body;

    if (!ticketId || !status) {
      return res.status(400).json({ error: "Missing parameter fields: ticketId and status required." });
    }

    const validStatuses = ['new', 'in-progress', 'pending-user', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status code. Choose from: ${validStatuses.join(', ')}` });
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${ticketId} not found.` });
    }

    const oldStatus = ticket.status;
    ticket.status = status;

    if (status === 'resolved') {
      ticket.resolvedDate = new Date().toISOString();
    } else {
      delete ticket.resolvedDate;
    }

    const timestamp = new Date().toISOString();
    ticketAudits.push({
      id: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ticketId,
      timestamp,
      actor: actorName || 'Agent Tech',
      action: 'Status Transition',
      details: `Ticket status transitioned from [${oldStatus.toUpperCase()}] ➡️ [${status.toUpperCase()}].`
    });

    res.json(ticket);
  });

  // 5. POST TICKET COMMENT
  app.post("/api/tickets/comments", (req, res) => {
    const { ticketId, author, authorEmail, content, isInternal } = req.body;

    if (!ticketId || !author || !authorEmail || !content) {
      return res.status(400).json({ error: "Missing required payload parameters for ticket comments." });
    }

    const newComment: TicketComment = {
      id: 'CMT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      ticketId,
      author,
      authorEmail,
      timestamp: new Date().toISOString(),
      content,
      isInternal: !!isInternal
    };

    comments.push(newComment);
    res.status(201).json(newComment);
  });

  // 6. GET ALL COMMENTS (Optionally filter by ticketId)
  app.get("/api/tickets/comments", (req, res) => {
    const ticketId = req.query.ticketId as string;
    if (ticketId) {
      return res.json(comments.filter(c => c.ticketId === ticketId));
    }
    res.json(comments);
  });

  // 7. GET AUDITS (Optionally filter by ticketId)
  app.get("/api/tickets/audits", (req, res) => {
    const ticketId = req.query.ticketId as string;
    if (ticketId) {
      return res.json(ticketAudits.filter(a => a.ticketId === ticketId));
    }
    res.json(ticketAudits);
  });

  // 8. TICKET PERFORMANCE METRICS & AGGREGATIONS
  app.get("/api/tickets/metrics", (req, res) => {
    const totalCount = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolved');
    const unresolved = tickets.filter(t => t.status !== 'resolved');
    const breached = tickets.filter(t => t.isSlaBreached).length;

    // Tickets resolved per agent
    const resolvedPerAgent: Record<string, number> = {};
    resolved.forEach(t => {
      const name = t.assignedAgentName || 'Unassigned / Team Pool';
      resolvedPerAgent[name] = (resolvedPerAgent[name] || 0) + 1;
    });

    // Average close time calculation (in minutes)
    let totalCloseMinutes = 0;
    resolved.forEach(t => {
      if (t.resolvedDate) {
        const delta = new Date(t.resolvedDate).getTime() - new Date(t.createdDate).getTime();
        totalCloseMinutes += Math.max(0, delta / (60 * 1000));
      }
    });
    const avgCloseMinutes = resolved.length > 0 ? Math.round(totalCloseMinutes / resolved.length) : 0;

    // Status distributions
    const statusPie = {
      'new': tickets.filter(t => t.status === 'new').length,
      'in-progress': tickets.filter(t => t.status === 'in-progress').length,
      'pending-user': tickets.filter(t => t.status === 'pending-user').length,
      'resolved': resolved.length,
    };

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    tickets.forEach(t => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });

    res.json({
      totalCount,
      resolvedCount: resolved.length,
      unresolvedCount: unresolved.length,
      breachedCount: breached,
      avgCloseTimeMinutes: avgCloseMinutes,
      resolvedPerAgent,
      statusDistribution: statusPie,
      categoryDistribution: categoryCounts
    });
  });

  // ==================== VITE & STATIC HANDLING ====================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK TICKET CORE] Running on http://localhost:${PORT}`);
  });
}

startServer();
