/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Laptop, Monitor, Server, Network, Printer, Cpu, Layers,
  Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, Wrench, 
  Clock, AlertTriangle, FileText, Download, CheckCircle2, 
  Trash2, Edit, X, Calendar, User, Tag, MapPin, DollarSign, Menu,
  AlertCircle, ArrowRight, RefreshCw, BarChart2, ShieldAlert, IndianRupee,
  Building2, ChevronDown, ArrowLeftRight, Lock, Unlock
} from 'lucide-react';

import { Asset, AssetType, AssetStatus, DepartmentType, AssignmentLog, AuditLog, MaintenanceRecord } from './types';
import { INITIAL_ASSETS, INITIAL_ASSIGNMENT_LOGS, INITIAL_AUDIT_LOGS, INITIAL_MAINTENANCE_RECORDS } from './initialData';

// Recharts components for beautiful visual analytics
import { 
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// Modular component imports
import AssetFormModal from './components/AssetFormModal';
import CheckInOutModal from './components/CheckInOutModal';
import MaintenanceModal from './components/MaintenanceModal';
import ExportSection from './components/ExportSection';
import AssetTransferModal from './components/AssetTransferModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import TicketCallSystem from './components/TicketCallSystem';

const BASELINE_DATE = '2026-05-31';

interface AppUser {
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer' | 'root' | 'manager_viewer';
  company: string;
  pageMaster: boolean;
  pageEntry: boolean;
  pageReports: boolean;
  pageScan: boolean;
  pageConversion: boolean;
  pagePassword: boolean;
  unitAstraTec: boolean;
  unitPel: boolean;

  // Granular Security & Lockout Parameters (Added to fulfill new Security Matrix Guidelines)
  password?: string;
  failedAttempts?: number;
  isLocked?: boolean;
  canModifyAssets?: boolean;
  canExportReports?: boolean;
  isRootAdmin?: boolean;
  isAssetUser?: boolean;
}

const TEMPLATE_USERS: AppUser[] = [
  {
    name: 'Root Admin',
    email: 'root.admin@company.com',
    role: 'root',
    company: 'ASTRA TEC',
    pageMaster: true,
    pageEntry: true,
    pageReports: true,
    pageScan: true,
    pageConversion: true,
    pagePassword: true,
    unitAstraTec: true,
    unitPel: true,
    password: 'admin',
    failedAttempts: 0,
    isLocked: false,
    canModifyAssets: true,
    canExportReports: true,
    isRootAdmin: true
  },
  { 
    name: 'Saravanan (ADMIN)', 
    email: 'saravananengineerit@gmail.com', 
    role: 'admin', 
    company: 'ASTRA TEC',
    pageMaster: true,
    pageEntry: true,
    pageReports: true,
    pageScan: true,
    pageConversion: true,
    pagePassword: true,
    unitAstraTec: true,
    unitPel: true,
    password: 'admin',
    failedAttempts: 0,
    isLocked: false,
    canModifyAssets: true,
    canExportReports: true,
    isRootAdmin: true
  },
  { 
    name: 'Marcus Chen', 
    email: 'marcus.chen@cyberdyne.co', 
    role: 'manager', 
    company: 'PEL',
    pageMaster: true,
    pageEntry: true,
    pageReports: false,
    pageScan: true,
    pageConversion: false,
    pagePassword: false,
    unitAstraTec: true,
    unitPel: true,
    password: '123',
    failedAttempts: 0,
    isLocked: false,
    canModifyAssets: true,
    canExportReports: true,
    isRootAdmin: false
  },
  { 
    name: 'Sarah Jenkins', 
    email: 'sarah.jenkins@compliance.io', 
    role: 'viewer', 
    company: 'PEL',
    pageMaster: true,
    pageEntry: false,
    pageReports: true,
    pageScan: false,
    pageConversion: true,
    pagePassword: false,
    unitAstraTec: false,
    unitPel: true,
    password: '123',
    failedAttempts: 0,
    isLocked: false,
    canModifyAssets: false,
    canExportReports: false,
    isRootAdmin: false
  }
];

// Recharts Custom Styled Tooltip matching theme defaults
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl border border-slate-800 text-[11px] font-medium leading-relaxed font-sans z-50">
        <p className="font-bold border-b border-slate-800 pb-1 mb-1">{payload[0].name}</p>
        <p className="text-indigo-300">
          Units: <span className="font-mono text-white font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function App() {
  // --- Persistent States ---
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('company_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [assignmentLogs, setAssignmentLogs] = useState<AssignmentLog[]>(() => {
    const saved = localStorage.getItem('company_assignment_logs');
    return saved ? JSON.parse(saved) : INITIAL_ASSIGNMENT_LOGS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('company_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(() => {
    const saved = localStorage.getItem('company_maintenance_records');
    return saved ? JSON.parse(saved) : INITIAL_MAINTENANCE_RECORDS;
  });

  // --- Dynamic Dropdown Option Lists States ---
  const [dropdownCompanies, setDropdownCompanies] = useState<string[]>(() => {
    const saved = localStorage.getItem('company_list');
    const defaultList = ['ASTRA TEC', 'PEL', 'Cyberdyne Systems', 'Weyland-Yutani Corp', 'Tyrell Corp', 'Umbrella Corporation'];
    const loaded = saved ? JSON.parse(saved) as string[] : defaultList;
    return loaded.filter(c => c !== 'PRIMERO' && c !== 'RICCO' && c !== 'SPT');
  });

  const [dropdownCategories, setDropdownCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('category_list');
    return saved ? JSON.parse(saved) : ['laptop', 'desktop', 'server', 'switch', 'printer', 'peripheral', 'router', 'firewall', 'scanner'];
  });

  const [dropdownDepartments, setDropdownDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem('department_list');
    return saved ? JSON.parse(saved) : ['IT', 'Engineering', 'Finance', 'HR', 'Sales', 'Operations'];
  });

  const [dropdownCadences, setDropdownCadences] = useState<string[]>(() => {
    const saved = localStorage.getItem('cadence_list');
    return saved ? JSON.parse(saved) : ['none', 'monthly', 'quarterly', 'bi-annually', 'annually'];
  });

  // --- Auth / User Management State ---
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('company_users_list');
    let loaded: AppUser[] = saved ? JSON.parse(saved) : TEMPLATE_USERS;
    
    // Ensure there is always a Root Admin in the loaded list
    if (!loaded.some(u => u.isRootAdmin || u.email === 'root.admin@company.com')) {
      loaded = [TEMPLATE_USERS[0], ...loaded];
    }
    
    // Auto-fill defaults for any user missing passwords, lockouts, modify specs or export flags
    return loaded.map(u => ({
      ...u,
      password: u.password !== undefined ? u.password : '123456',
      failedAttempts: u.failedAttempts !== undefined ? u.failedAttempts : 0,
      isLocked: u.isLocked !== undefined ? u.isLocked : false,
      canModifyAssets: u.canModifyAssets !== undefined ? u.canModifyAssets : true,
      canExportReports: u.canExportReports !== undefined ? u.canExportReports : true,
      isRootAdmin: u.isRootAdmin !== undefined ? u.isRootAdmin : (u.email === 'root.admin@company.com' || u.email === 'saravananengineerit@gmail.com')
    }));
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem('logged_in_user');
    const dynamicUsers = localStorage.getItem('company_users_list');
    const sourceUsers = dynamicUsers ? JSON.parse(dynamicUsers) : TEMPLATE_USERS;
    
    let user = saved ? JSON.parse(saved) : sourceUsers[0];
    if (!user) user = sourceUsers[0] || TEMPLATE_USERS[0];
    
    return {
      ...user,
      password: user.password !== undefined ? user.password : '123456',
      failedAttempts: user.failedAttempts !== undefined ? user.failedAttempts : 0,
      isLocked: user.isLocked !== undefined ? user.isLocked : false,
      canModifyAssets: user.canModifyAssets !== undefined ? user.canModifyAssets : true,
      canExportReports: user.canExportReports !== undefined ? user.canExportReports : true,
      isRootAdmin: user.isRootAdmin !== undefined ? user.isRootAdmin : (user.email === 'root.admin@company.com' || user.email === 'saravananengineerit@gmail.com')
    };
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('is_logged_in');
    if (saved === null) {
      localStorage.setItem('is_logged_in', 'true');
      return true;
    }
    return saved === 'true';
  });

  // --- Mobile Sidebar Responsive State ---
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // --- Login Form Inputs States ---
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- Dynamic New Operator Registration Form States ---
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerRole, setRegisterRole] = useState<'admin' | 'manager' | 'viewer' | 'root' | 'manager_viewer'>('viewer');
  const [registerCompanies, setRegisterCompanies] = useState<string[]>(['ASTRA TEC']);

  // --- Multi-Company Core Tenancy State ---
  const [activeCompanyFilter, setActiveCompanyFilter] = useState<string>(() => {
    const saved = localStorage.getItem('active_company_filter');
    return saved || 'all';
  });

  // --- Synchronization to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('company_users_list', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('is_logged_in', isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);
  useEffect(() => {
    localStorage.setItem('company_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('company_assignment_logs', JSON.stringify(assignmentLogs));
  }, [assignmentLogs]);

  useEffect(() => {
    localStorage.setItem('company_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('company_maintenance_records', JSON.stringify(maintenanceRecords));
  }, [maintenanceRecords]);

  useEffect(() => {
    localStorage.setItem('company_list', JSON.stringify(dropdownCompanies));
  }, [dropdownCompanies]);

  useEffect(() => {
    localStorage.setItem('category_list', JSON.stringify(dropdownCategories));
  }, [dropdownCategories]);

  useEffect(() => {
    localStorage.setItem('department_list', JSON.stringify(dropdownDepartments));
  }, [dropdownDepartments]);

  useEffect(() => {
    localStorage.setItem('cadence_list', JSON.stringify(dropdownCadences));
  }, [dropdownCadences]);

  useEffect(() => {
    localStorage.setItem('logged_in_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('active_company_filter', activeCompanyFilter);
  }, [activeCompanyFilter]);

  // --- UI Control States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'directory' | 'tracking' | 'maintenance' | 'audit' | 'settings' | 'it-service-calls'>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'access' | 'email'>('general');

  // local form fields inside setting categories
  const [settingsNewCompany, setSettingsNewCompany] = useState('');
  const [settingsNewCategory, setSettingsNewCategory] = useState('');
  const [settingsNewDept, setSettingsNewDept] = useState('');
  const [settingsNewCadence, setSettingsNewCadence] = useState('');

  // --- Email Alerts / Notification States ---
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('email_alerts_enabled');
    return saved ? saved === 'true' : true;
  });
  const [alertRecipients, setAlertRecipients] = useState<string>(() => {
    const saved = localStorage.getItem('alert_recipients');
    return saved || 'saravananengineerit@gmail.com, admin@astra-tec.com';
  });
  const [alertOnTransfer, setAlertOnTransfer] = useState<boolean>(() => {
    const saved = localStorage.getItem('alert_on_transfer');
    return saved ? saved === 'true' : true;
  });
  const [alertOnMaintenance, setAlertOnMaintenance] = useState<boolean>(() => {
    const saved = localStorage.getItem('alert_on_maintenance');
    return saved ? saved === 'true' : true;
  });
  const [alertOnCheckInOut, setAlertOnCheckInOut] = useState<boolean>(() => {
    const saved = localStorage.getItem('alert_on_check_in_out');
    return saved ? saved === 'true' : true;
  });
  const [alertOnDelete, setAlertOnDelete] = useState<boolean>(() => {
    const saved = localStorage.getItem('alert_on_delete');
    return saved ? saved === 'true' : true;
  });
  const [emailSmtpServer, setEmailSmtpServer] = useState<string>(() => {
    const saved = localStorage.getItem('email_smtp_server');
    return saved || 'smtp.pel-group.lan:587';
  });
  const [emailSenderAddress, setEmailSenderAddress] = useState<string>(() => {
    const saved = localStorage.getItem('email_sender_address');
    return saved || 'alerts-asset@astra-tec.com';
  });

  useEffect(() => {
    localStorage.setItem('email_alerts_enabled', emailAlertsEnabled ? 'true' : 'false');
    localStorage.setItem('alert_recipients', alertRecipients);
    localStorage.setItem('alert_on_transfer', alertOnTransfer ? 'true' : 'false');
    localStorage.setItem('alert_on_maintenance', alertOnMaintenance ? 'true' : 'false');
    localStorage.setItem('alert_on_check_in_out', alertOnCheckInOut ? 'true' : 'false');
    localStorage.setItem('alert_on_delete', alertOnDelete ? 'true' : 'false');
    localStorage.setItem('email_smtp_server', emailSmtpServer);
    localStorage.setItem('email_sender_address', emailSenderAddress);
  }, [
    emailAlertsEnabled, alertRecipients, alertOnTransfer,
    alertOnMaintenance, alertOnCheckInOut, alertOnDelete,
    emailSmtpServer, emailSenderAddress
  ]);

  // --- Access Control Form Selected User and Checkboxes States ---
  const [accessSelectedEmail, setAccessSelectedEmail] = useState<string>('saravananengineerit@gmail.com');

  // Checkboxes states for Page Access
  const [chkMaster, setChkMaster] = useState(true);
  const [chkEntry, setChkEntry] = useState(true);
  const [chkReports, setChkReports] = useState(true);
  const [chkScan, setChkScan] = useState(true);
  const [chkConversion, setChkConversion] = useState(true);
  const [chkPassword, setChkPassword] = useState(true);

  // Checkboxes states for Unit/Company Access
  const [chkUnitAstra, setChkUnitAstra] = useState(true);
  const [chkUnitPel, setChkUnitPel] = useState(true);

  // Custom added permission states
  const [chkCanModifyAssets, setChkCanModifyAssets] = useState(true);
  const [chkCanExportReports, setChkCanExportReports] = useState(true);
  const [chkIsLocked, setChkIsLocked] = useState(false);
  const [accessUserPassword, setAccessUserPassword] = useState('admin');
  const [accessUserRole, setAccessUserRole] = useState<'admin' | 'manager' | 'viewer'>('viewer');
  const [accessUserCompany, setAccessUserCompany] = useState('ASTRA TEC');
  const [accessUserName, setAccessUserName] = useState('');

  // To differentiate between editing and adding new user
  const [isAccessCreateMode, setIsAccessCreateMode] = useState(false);

  // Self-service password reset form toggler
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');

  // Sync checkboxes to selected user
  useEffect(() => {
    const targetUser = users.find(u => u.email === accessSelectedEmail);
    if (targetUser) {
      setChkMaster(targetUser.pageMaster);
      setChkEntry(targetUser.pageEntry);
      setChkReports(targetUser.pageReports);
      setChkScan(targetUser.pageScan);
      setChkConversion(targetUser.pageConversion);
      setChkPassword(targetUser.pagePassword);

      setChkUnitAstra(targetUser.unitAstraTec);
      setChkUnitPel(targetUser.unitPel);

      setChkCanModifyAssets(targetUser.canModifyAssets !== false);
      setChkCanExportReports(targetUser.canExportReports !== false);
      setChkIsLocked(targetUser.isLocked || false);
      setAccessUserPassword(targetUser.password || '123456');
      setAccessUserRole(targetUser.role || 'viewer');
      setAccessUserCompany(targetUser.company || 'ASTRA TEC');
      setAccessUserName(targetUser.name || '');
    }
  }, [accessSelectedEmail, users]);
  
  // Filtering & Searching States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');

  // Modal Control States
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);

  const [isCheckInOutOpen, setIsCheckInOutOpen] = useState(false);
  const [checkInOutAsset, setCheckInOutAsset] = useState<Asset | null>(null);
  const [checkInOutMode, setCheckInOutMode] = useState<'check-out' | 'check-in'>('check-out');

  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [maintenanceAsset, setMaintenanceAsset] = useState<Asset | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAsset, setTransferAsset] = useState<Asset | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);

  // Quick User Switcher modal visibility
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Login & Session Handlers ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim()) {
      setLoginError('USER NAME is required.');
      return;
    }

    const matchedUser = users.find(
      u => u.name.toLowerCase() === loginUsername.trim().toLowerCase() || 
           u.email.toLowerCase() === loginUsername.trim().toLowerCase()
    );

    if (!matchedUser) {
      setLoginError('Invalid USER NAME credential. Please review the testing accounts listed below.');
      return;
    }

    // CHECK LOCKED STATE
    if (matchedUser.isLocked) {
      setLoginError('❌ This account has been automatically locked due to 5 consecutive failed password attempts. Access can only be enabled/unlocked by an Admin.');
      return;
    }

    const correctPassword = matchedUser.password || '123456';
    if (loginPassword === correctPassword) {
      // SUCCESSFUL LOGIN
      const updatedUser = {
        ...matchedUser,
        failedAttempts: 0
      };

      setUsers(prev => prev.map(u => u.email === matchedUser.email ? updatedUser : u));
      setCurrentUser(updatedUser);
      setIsLoggedIn(true);
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
      
      // Log event inside chronological audit
      const logMsg = `User "${matchedUser.name}" successfully logged in with role [${matchedUser.role.toUpperCase()}]`;
      setTimeout(() => {
        logAuditEvent('Operator Authenticated', logMsg, 'update');
      }, 100);

      triggerToast(`Welcome back, ${matchedUser.name}!`, 'success');
    } else {
      // INCORRECT PASSWORD - LOCKOUT SECURITY POLICY
      if (matchedUser.isRootAdmin) {
        setLoginError('❌ Incorrect password for Root Admin. For security, Root Administrator accounts are bypass-protected, but password must match.');
        return;
      }

      const newFailedAttempts = (matchedUser.failedAttempts || 0) + 1;
      const autoLocked = newFailedAttempts >= 5;

      const updatedUser = {
        ...matchedUser,
        failedAttempts: newFailedAttempts,
        isLocked: autoLocked ? true : matchedUser.isLocked
      };

      // Persist fail counts & locks
      setUsers(prev => prev.map(u => u.email === matchedUser.email ? updatedUser : u));

      if (autoLocked) {
        setLoginError('❌ SECURITY POLICIES: 5 wrong attempts count exceeded! This account is now AUTOMATICALLY LOCKED. Contact an Administrative operator to enable this profile.');
        logAuditEvent('Security Lockout', `Operator "${matchedUser.name}" account [${matchedUser.email}] automatically locked after 5 failed password attempts.`, 'update');
        triggerToast('Security Lockout Activated', 'error');
      } else {
        setLoginError(`❌ Incorrect password! Attempt ${newFailedAttempts} of 5. After 5 entries, account will be automatically locked.`);
      }
    }
  };

  const handleLoginCancel = () => {
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    triggerToast('Login inputs cleared.', 'info');
  };

  const handleLogout = () => {
    logAuditEvent('Operator Logged Out', `Operator "${currentUser.name}" signed out of the workspace container safely.`, 'update');
    setIsLoggedIn(false);
    triggerToast('Successfully signed out of workspace.', 'info');
  };

  // --- Dynamic user registry management ---
  const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim() || !registerEmail.trim()) {
      triggerToast('All fields are required to register an operator.', 'error');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === registerEmail.trim().toLowerCase())) {
      triggerToast('An operator with this email is already registered.', 'error');
      return;
    }

    if (registerCompanies.length === 0) {
      triggerToast('Please select at least one Tenant Entity.', 'error');
      return;
    }

    const isRoot = registerRole === 'root';
    const isAdmin = registerRole === 'admin' || isRoot;
    const isManager = registerRole === 'manager' || registerRole === 'manager_viewer';
    const isManagerViewer = registerRole === 'manager_viewer';

    const newUser: AppUser = {
      name: registerName.trim(),
      email: registerEmail.trim(),
      role: registerRole,
      company: registerCompanies.join(', '),
      pageMaster: true,
      pageEntry: isAdmin || isManager,
      pageReports: registerRole !== 'manager',
      pageScan: registerRole !== 'viewer',
      pageConversion: isAdmin,
      pagePassword: isAdmin,
      unitAstraTec: registerCompanies.includes('ASTRA TEC') || registerCompanies.includes('ASTRA_TEC'),
      unitPel: registerCompanies.includes('PEL'),
      password: '123',
      failedAttempts: 0,
      isLocked: false,
      canModifyAssets: isAdmin || isManager,
      canExportReports: isAdmin || isManager || isManagerViewer,
      isRootAdmin: isRoot
    };

    setUsers(prev => [...prev, newUser]);
    
    logAuditEvent('Operator Created', `Registered new operator "${newUser.name}" as ${newUser.role.toUpperCase()} (Scope: ${newUser.company})`, 'create');
    
    // Reset inputs
    setRegisterName('');
    setRegisterEmail('');
    setRegisterRole('viewer');
    setRegisterCompanies(['ASTRA TEC']);

    triggerToast(`Operator account "${newUser.name}" configured!`);
  };

  const handleRemoveUser = (emailToDelete: string) => {
    if (emailToDelete === 'saravananengineerit@gmail.com' || emailToDelete === 'root.admin@company.com') {
      triggerToast('Cannot delete protected master or root administrator accounts.', 'error');
      return;
    }
    
    if (currentUser.email === emailToDelete) {
      triggerToast('Cannot delete yourself while logged in.', 'error');
      return;
    }

    const target = users.find(u => u.email === emailToDelete);
    if (!target) return;

    setUsers(prev => prev.filter(u => u.email !== emailToDelete));
    logAuditEvent('Operator Deleted', `Removed operator login access for "${target.name}".`, 'update');
    
    if (accessSelectedEmail === emailToDelete) {
      setAccessSelectedEmail('saravananengineerit@gmail.com');
    }
    
    triggerToast(`Operator account removed.`);
  };

  const handleUnlockUser = (email: string) => {
    setUsers(prev => prev.map(u => u.email === email ? { ...u, isLocked: false, failedAttempts: 0 } : u));
    if (accessSelectedEmail === email) {
      setChkIsLocked(false);
    }
    if (currentUser.email === email) {
      setCurrentUser(prev => ({ ...prev, isLocked: false, failedAttempts: 0 }));
    }
    const target = users.find(u => u.email === email);
    const name = target ? target.name : 'Operator';
    triggerToast(`Operator account "${name}" unlocked successfully!`, 'success');
    logAuditEvent('Operator Unlocked', `Admin user unlocked access credentials for ${name} [${email}].`, 'update');
  };

  const handleLockUser = (email: string) => {
    if (email === 'saravananengineerit@gmail.com' || email === 'root.admin@company.com') {
      triggerToast('Cannot lock root administrator or master admin accounts.', 'error');
      return;
    }
    if (currentUser.email === email) {
      triggerToast('Cannot lock your own active session.', 'error');
      return;
    }
    setUsers(prev => prev.map(u => u.email === email ? { ...u, isLocked: true } : u));
    if (accessSelectedEmail === email) {
      setChkIsLocked(true);
    }
    const target = users.find(u => u.email === email);
    const name = target ? target.name : 'Operator';
    triggerToast(`Operator account "${name}" locked manually.`, 'info');
    logAuditEvent('Operator Locked Manually', `Admin operator manually locked credentials for ${name} [${email}].`, 'update');
  };

  const handleEditUser = (email: string) => {
    setAccessSelectedEmail(email);
    const element = document.getElementById('access-control-pane-top');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
    triggerToast(`Loaded credentials profile for ${users.find(u => u.email === email)?.name || 'operator'} in customization form.`);
  };

  // --- Access Control Form Actions (Handles BOTH Editing Existing and Creating New Operator) ---
  const handleAccessControlSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isAccessCreateMode) {
      // CREATION PATH
      if (!accessUserName.trim()) {
        triggerToast('Operator name is required.', 'error');
        return;
      }
      if (!accessSelectedEmail.trim() || !accessSelectedEmail.includes('@')) {
        triggerToast('A valid unique email identifier is required.', 'error');
        return;
      }

      if (users.some(u => u.email.toLowerCase() === accessSelectedEmail.trim().toLowerCase())) {
        triggerToast('Error: This operator email is already registered.', 'error');
        return;
      }

      const newOp: AppUser = {
        name: accessUserName.trim(),
        email: accessSelectedEmail.trim(),
        role: accessUserRole,
        company: accessUserCompany,
        pageMaster: chkMaster,
        pageEntry: true, // Always allow access under-the-hood to avoid locks
        pageReports: true, // Always allow access under-the-hood to avoid locks
        pageScan: chkScan,
        pageConversion: chkConversion,
        pagePassword: true, // Always allow access under-the-hood to avoid locks
        unitAstraTec: chkUnitAstra,
        unitPel: chkUnitPel,
        password: accessUserPassword || '123456',
        failedAttempts: 0,
        isLocked: chkIsLocked,
        canModifyAssets: chkCanModifyAssets,
        canExportReports: chkCanExportReports,
        isRootAdmin: false
      };

      setUsers(prevUsers => [...prevUsers, newOp]);
      logAuditEvent('Operator Created', `Registered new operator "${newOp.name}" with role [${newOp.role.toUpperCase()}] under company [${newOp.company}]`, 'create');
      triggerToast(`Operator account "${newOp.name}" created successfully!`, 'success');
      
      // Auto-select newly created user and return editing mode
      setAccessSelectedEmail(newOp.email);
      setIsAccessCreateMode(false);
    } else {
      // MODIFICATION / EDIT PATH
      setUsers(prevUsers => {
        return prevUsers.map(u => {
          if (u.email === accessSelectedEmail) {
            const updated = {
              ...u,
              name: accessUserName.trim() || u.name,
              role: accessUserRole,
              company: accessUserCompany,
              pageMaster: chkMaster,
              pageEntry: true,
              pageReports: true,
              pageScan: chkScan,
              pageConversion: chkConversion,
              pagePassword: true,
              unitAstraTec: chkUnitAstra,
              unitPel: chkUnitPel,
              password: accessUserPassword || u.password,
              isLocked: chkIsLocked,
              failedAttempts: chkIsLocked ? u.failedAttempts : 0, // Reset failures if unlocked
              canModifyAssets: chkCanModifyAssets,
              canExportReports: chkCanExportReports
            };
            // Sync current session if editing themselves
            if (currentUser && u.email === currentUser.email) {
              setTimeout(() => {
                setCurrentUser(updated);
              }, 10);
            }
            return updated;
          }
          return u;
        });
      });

      const targetUser = users.find(u => u.email === accessSelectedEmail);
      const uName = targetUser ? targetUser.name : 'Operator';
      triggerToast(`Security policy saved successfully for ${uName}!`, 'success');
      logAuditEvent('Access Policy Saved', `Adjusted permissions for "${uName}". Pages: [M:${chkMaster?'Y':'N'}, E:${chkEntry?'Y':'N'}, R:${chkReports?'Y':'N'}]. Asset modifications: ${chkCanModifyAssets ? 'ALLOWED' : 'BLOCKED'}. Export Reports: ${chkCanExportReports ? 'ALLOWED' : 'BLOCKED'}. Locked: ${chkIsLocked ? 'Locked' : 'Unlocked'}.`, 'update');
    }
  };

  const handleAccessControlCancel = () => {
    if (isAccessCreateMode) {
      setIsAccessCreateMode(false);
      if (users.length > 0) {
        setAccessSelectedEmail(users[0].email);
      }
      triggerToast('Operator creation cancelled.', 'info');
    } else {
      const targetUser = users.find(u => u.email === accessSelectedEmail);
      if (targetUser) {
        setAccessUserName(targetUser.name || '');
        setChkMaster(targetUser.pageMaster);
        setChkEntry(targetUser.pageEntry);
        setChkReports(targetUser.pageReports);
        setChkScan(targetUser.pageScan);
        setChkConversion(targetUser.pageConversion);
        setChkPassword(targetUser.pagePassword);

        setChkUnitAstra(targetUser.unitAstraTec);
        setChkUnitPel(targetUser.unitPel);

        setChkCanModifyAssets(targetUser.canModifyAssets !== false);
        setChkCanExportReports(targetUser.canExportReports !== false);
        setChkIsLocked(targetUser.isLocked || false);
        setAccessUserPassword(targetUser.password || '123456');
        setAccessUserRole(targetUser.role || 'viewer');
        setAccessUserCompany(targetUser.company || 'ASTRA TEC');
        triggerToast('Restored access parameters to saved profile state.', 'info');
      }
    }
  };

  const handleSendTestEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAlertsEnabled) {
      triggerToast('Mail Server Diagnostics: Notification alerts are currently disabled globally.', 'error');
      return;
    }
    if (!alertRecipients.trim()) {
      triggerToast('Please provide at least one valid recipient address.', 'error');
      return;
    }
    
    triggerToast('Initiating secure peer-to-peer SMTP socket connection...', 'info');
    setTimeout(() => {
      triggerToast(`Routing diagnostic test email via ${emailSmtpServer} in TLS secured envelope...`, 'info');
    }, 1000);
    setTimeout(() => {
      triggerToast(`Success: Mail relay test message dispatched safely to ${alertRecipients}!`, 'success');
      logAuditEvent(
        'Diagnostic SMTP Dispatch',
        `Dispatched SMTP loopback check from "${emailSenderAddress}" via "${emailSmtpServer}" to [${alertRecipients}]. Service state green.`,
        'update'
      );
    }, 2000);
  };

  const renderAccessDenied = (privilegeLabel: string) => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center font-sans bg-white border border-slate-200/60 rounded-2xl shadow-xs">
      <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-[#FF9900] flex items-center justify-center mb-4">
        <ShieldAlert size={28} className="animate-pulse" />
      </div>
      <h2 className="text-base font-bold text-[#1E293B] uppercase tracking-widest mb-1.5">🔒 Access Right Restricted</h2>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
        Your logged in operator profile <strong>{currentUser.name}</strong> does not possess the <span className="font-extrabold text-slate-700">"{privilegeLabel.toUpperCase()}"</span> page access right configured inside active credentials directory.
      </p>
      {currentUser.role === 'admin' ? (
        <button
          onClick={() => setActiveTab('settings')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          Manage Permissions Under System Settings
        </button>
      ) : (
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Please contact Saravanan (Admin Operator) to modify your profile access.</p>
      )}
    </div>
  );

  // Option configuration lists handlers
  const handleAddOption = (type: 'company' | 'category' | 'department' | 'cadence', value: string) => {
    if (type === 'company') {
      if (!dropdownCompanies.some(v => v.toLowerCase() === value.toLowerCase())) {
        setDropdownCompanies(prev => [...prev, value]);
        logAuditEvent('Dropdown Option Added', `Added company "${value}" to multi-tenant dropdown database.`, 'update');
        triggerToast(`Multi-company "${value}" registered successfully.`);
      } else {
        triggerToast(`Company "${value}" already exists.`, 'error');
      }
    } else if (type === 'category') {
      if (!dropdownCategories.some(v => v.toLowerCase() === value.toLowerCase())) {
        setDropdownCategories(prev => [...prev, value]);
        logAuditEvent('Dropdown Option Added', `Added asset category "${value}" to master choices list.`, 'update');
        triggerToast(`Dynamic Category "${value}" saved.`);
      } else {
        triggerToast(`Category "${value}" already exists.`, 'error');
      }
    } else if (type === 'department') {
      if (!dropdownDepartments.some(v => v.toLowerCase() === value.toLowerCase())) {
        setDropdownDepartments(prev => [...prev, value]);
        logAuditEvent('Dropdown Option Added', `Added corporate department "${value}" dynamically.`, 'update');
        triggerToast(`Department "${value}" saved.`);
      } else {
        triggerToast(`Department "${value}" already exists.`, 'error');
      }
    } else if (type === 'cadence') {
      if (!dropdownCadences.some(v => v.toLowerCase() === value.toLowerCase())) {
        setDropdownCadences(prev => [...prev, value]);
        logAuditEvent('Dropdown Option Added', `Added maintenance cadence option "${value}".`, 'update');
        triggerToast(`Maintenance cadence "${value}" saved.`);
      } else {
        triggerToast(`Cadence "${value}" already exists.`, 'error');
      }
    }
  };

  const handleRemoveOption = (type: 'company' | 'category' | 'department' | 'cadence', value: string) => {
    if (type === 'company') {
      setDropdownCompanies(prev => prev.filter(v => v !== value));
      logAuditEvent('Dropdown Option Removed', `Removed company "${value}" from drop-down choices.`, 'update');
      triggerToast(`Company "${value}" removed.`);
    } else if (type === 'category') {
      setDropdownCategories(prev => prev.filter(v => v !== value));
      logAuditEvent('Dropdown Option Removed', `Removed category "${value}" from dropdown choices.`, 'update');
      triggerToast(`Category "${value}" removed.`);
    } else if (type === 'department') {
      setDropdownDepartments(prev => prev.filter(v => v !== value));
      logAuditEvent('Dropdown Option Removed', `Removed department "${value}" from selections.`, 'update');
      triggerToast(`Department "${value}" removed.`);
    } else if (type === 'cadence') {
      setDropdownCadences(prev => prev.filter(v => v !== value));
      logAuditEvent('Dropdown Option Removed', `Removed cadence "${value}".`, 'update');
      triggerToast(`Cadence "${value}" removed.`);
    }
  };

  // Helper logger for simple operator audits
  const logAuditEvent = (
    action: string, 
    details: string, 
    category: AuditLog['category']
  ) => {
    const newLog: AuditLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      category,
      user: currentUser.email // Powered by active simulated login!
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Automatically register asset user login and set default password to "welcome"
  const syncAssetUserLogin = (asset: Asset) => {
    const emailToUse = (asset.emailAddress || asset.assignedEmail || '').trim().toLowerCase();
    if (!emailToUse) return;

    // Check if user already exists
    const exists = users.some(u => u.email.toLowerCase() === emailToUse);
    if (!exists) {
      const displayName = asset.assignedTo || asset.name || emailToUse.split('@')[0];
      const newUser: AppUser = {
        name: displayName,
        email: emailToUse,
        role: 'viewer', // default view-only login rights
        company: asset.company || 'ASTRA TEC',
        pageMaster: true,
        pageEntry: false,
        pageReports: false,
        pageScan: false,
        pageConversion: false,
        pagePassword: false,
        unitAstraTec: true,
        unitPel: true,
        password: 'welcome', // set default password as "welcome"
        failedAttempts: 0,
        isLocked: false,
        canModifyAssets: false, // view only rights
        canExportReports: false,
        isRootAdmin: false,
        isAssetUser: true // mark as asset user
      };
      
      setUsers(prev => {
        const updated = [...prev, newUser];
        localStorage.setItem('company_users_list', JSON.stringify(updated));
        return updated;
      });
      
      logAuditEvent(
        'User Login Auto-Created',
        `Automatically registered asset custodian login for ${emailToUse} [Password: "welcome"]`,
        'create'
      );
      
      triggerToast(`Custody login configured for ${emailToUse} (Password: welcome).`);
    } else {
      // Mark as asset user to apply security visual policies
      setUsers(prev => {
        const updated = prev.map(u => {
          if (u.email.toLowerCase() === emailToUse && !u.isAssetUser) {
            return { ...u, isAssetUser: true };
          }
          return u;
        });
        localStorage.setItem('company_users_list', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // --- Business Logic CRUD & Handlers ---

  // Reset demo data helper
  const handleResetDemoData = () => {
    if (window.confirm('Are you sure you want to restore the default assets demo data? This clears your offline edits.')) {
      setAssets(INITIAL_ASSETS);
      setAssignmentLogs(INITIAL_ASSIGNMENT_LOGS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setMaintenanceRecords(INITIAL_MAINTENANCE_RECORDS);
      setSelectedAsset(null);
      triggerToast('Hardware database restored to demo baseline layout.', 'info');
      logAuditEvent('Database Restored', 'Reverted client memory storage to clean default demo assets.', 'update');
    }
  };

  // Insert or Update Asset
  const handleSaveAsset = (savedAsset: Asset) => {
    // ENFORCE ASSET MODIFY ACCESS POLICY
    if (currentUser.canModifyAssets === false && !currentUser.isRootAdmin) {
      triggerToast('Permission Denied: Your operator profile restricts modifying company asset records.', 'error');
      return;
    }

    const editMode = assets.some(a => a.id === savedAsset.id);

    if (editMode) {
      setAssets(prev => prev.map(a => a.id === savedAsset.id ? savedAsset : a));
      // If selected asset is being edited, update detail pane as well
      if (selectedAsset?.id === savedAsset.id) {
        setSelectedAsset(savedAsset);
      }
      triggerToast(`Asset ${savedAsset.id} specs details updated successfully.`);
      logAuditEvent(
        'Asset Specs Updated',
        `Asset ${savedAsset.id} (${savedAsset.brand} ${savedAsset.name}) specifications amended.`,
        'update'
      );
    } else {
      setAssets(prev => [savedAsset, ...prev]);
      triggerToast(`New hardware ${savedAsset.id} registered into systems.`);
      logAuditEvent(
        'Asset Created',
        `New record ${savedAsset.id} (${savedAsset.brand} ${savedAsset.name}) deployed under ${savedAsset.department}.`,
        'create'
      );
    }
    syncAssetUserLogin(savedAsset);
    setIsAssetModalOpen(false);
    setAssetToEdit(null);
  };

  // Delete Asset
  const handleDeleteAsset = (assetId: string) => {
    if (currentUser.role === 'viewer') {
      triggerToast('Unauthorized: Viewer credentials cannot delete asset registry records.', 'error');
      return;
    }

    // ENFORCE ASSET MODIFY ACCESS POLICY
    if (currentUser.canModifyAssets === false && !currentUser.isRootAdmin) {
      triggerToast('Permission Denied: Your operator profile restricts deleting or modifying company asset records.', 'error');
      return;
    }

    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    if (target.status === 'checked-out') {
      triggerToast('Cannot delete an active asset that is checked-out. Perform Check-In receipt first.', 'error');
      return;
    }

    setDeleteAsset(target);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (assetId: string) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    setAssets(prev => prev.filter(a => a.id !== assetId));
    if (selectedAsset?.id === assetId) {
      setSelectedAsset(null);
    }
    triggerToast(`Asset record ${assetId} deleted.`, 'info');
    logAuditEvent(
      'Asset Deleted',
      `Asset record for ${assetId} (${target.brand} ${target.name}) permanently purged from registry.`,
      'delete'
    );
    setIsDeleteModalOpen(false);
    setDeleteAsset(null);
  };

  // Transfer Assignment (Check-Out / Check-In)
  const handleCheckInOutSubmit = (
    assetId: string,
    action: 'check-out' | 'check-in',
    formData: {
      employeeName: string;
      employeeEmail: string;
      department: DepartmentType;
      expectedReturnDate?: string;
      notes: string;
      transitionToMaintenance?: boolean;
    }
  ) => {
    const currentTimestampString = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let updatedAssetObj: Asset | undefined;

    setAssets(prev => prev.map(asset => {
      if (asset.id === assetId) {
        if (action === 'check-out') {
          const updated: Asset = {
            ...asset,
            status: 'checked-out',
            assignedTo: formData.employeeName,
            assignedEmail: formData.employeeEmail,
            assignedDate: new Date().toISOString().split('T')[0],
            expectedReturnDate: formData.expectedReturnDate || null,
            department: formData.department,
            notes: formData.notes
          };
          updatedAssetObj = updated;
          // Update selected view if applicable
          if (selectedAsset?.id === assetId) setSelectedAsset(updated);
          return updated;
        } else {
          // Check-in
          const updated: Asset = {
            ...asset,
            status: formData.transitionToMaintenance ? 'maintenance' : 'available',
            assignedTo: null,
            assignedEmail: null,
            assignedDate: null,
            expectedReturnDate: null,
            notes: formData.notes,
            lastMaintenanceDate: formData.transitionToMaintenance ? asset.lastMaintenanceDate : asset.lastMaintenanceDate
          };
          if (selectedAsset?.id === assetId) setSelectedAsset(updated);
          return updated;
        }
      }
      return asset;
    }));

    // Append Assignment Log
    const targetAsset = assets.find(a => a.id === assetId)!;
    const newAssignmentLog: AssignmentLog = {
      id: `AL-${Date.now().toString().slice(-4)}`,
      assetId,
      assetName: targetAsset.name,
      assetType: targetAsset.type,
      action,
      employeeName: formData.employeeName,
      employeeEmail: formData.employeeEmail,
      department: formData.department,
      date: currentTimestampString,
      notes: formData.notes
    };
    setAssignmentLogs(prev => [newAssignmentLog, ...prev]);

    // Add Audit ledger entry
    const auditDetail = action === 'check-out'
      ? `${formData.employeeName} (${formData.department}) acquired custody of ${targetAsset.id}. Return target is ${formData.expectedReturnDate}.`
      : `Handover custody terminated for ${targetAsset.id}. Condition remark: ${formData.notes}. ${formData.transitionToMaintenance ? 'Sent immediately to active maintenance.' : 'Marked available in stock.'}`;

    logAuditEvent(
      action === 'check-out' ? 'Asset Checked Out' : 'Asset Checked In',
      auditDetail,
      action === 'check-out' ? 'check-out' : 'check-in'
    );

    triggerToast(`Equipment ${assetId} assignment state modified successfully.`);
    if (action === 'check-out' && updatedAssetObj) {
      setTimeout(() => syncAssetUserLogin(updatedAssetObj!), 50);
    }
    setIsCheckInOutOpen(false);
    setCheckInOutAsset(null);
  };

  // Submit Completed Maintenance
  const handleMaintenanceSubmit = (
    assetId: string,
    record: Omit<MaintenanceRecord, 'id' | 'assetId' | 'assetName'>,
    nextMDate: string | null
  ) => {
    const targetAsset = assets.find(a => a.id === assetId)!;

    // determine operating status based on maintenance outcome choice
    let nextStatus: AssetStatus = 'available';
    if (record.outcome === 'escalated') nextStatus = 'maintenance';
    else if (record.outcome === 'retired') nextStatus = 'retired';

    setAssets(prev => prev.map(asset => {
      if (asset.id === assetId) {
        const updated: Asset = {
          ...asset,
          status: nextStatus,
          lastMaintenanceDate: record.date,
          nextMaintenanceDate: nextMDate,
          notes: `Inspected: ${record.details}.`
        };
        if (selectedAsset?.id === assetId) setSelectedAsset(updated);
        return updated;
      }
      return asset;
    }));

    // Create Maintenance Ledger Record
    const newRecord: MaintenanceRecord = {
      id: `MR-${Date.now().toString().slice(-4)}`,
      assetId,
      assetName: targetAsset.name,
      ...record
    };
    setMaintenanceRecords(prev => [newRecord, ...prev]);

    // Log Audit activity
    logAuditEvent(
      'Maintenance Logged',
      `Diagnosed ${targetAsset.id} (${targetAsset.name}) using [${record.type}] protocol. Cost incurred: ₹${record.cost}. Outcome state: ${record.outcome}.`,
      'maintenance'
    );

    triggerToast(`Service diagnostics logged for ${assetId}. Status updated to [${nextStatus}].`);
    setIsMaintenanceOpen(false);
    setMaintenanceAsset(null);
  };

  // Submit Asset Transfer (Company, Department, Location, Custody)
  const handleTransferSubmit = (
    assetId: string,
    transferData: {
      toCompany: string;
      toDepartment: string;
      toLocation: string;
      updateCustodian: boolean;
      toCustodianName: string | null;
      toCustodianEmail: string | null;
      notes: string;
    }
  ) => {
    const targetAsset = assets.find(a => a.id === assetId)!;
    const oldCompany = targetAsset.company || 'ASTRA TEC';
    const oldDepartment = targetAsset.department;
    const oldLocation = targetAsset.location || 'Central Stockpile';
    const oldCustodian = targetAsset.assignedTo || 'Unassigned';

    let updatedAssetObj: Asset | undefined;

    // Update asset
    setAssets(prev => prev.map(asset => {
      if (asset.id === assetId) {
        let isNowAssignedStatus = asset.status;
        let assignedDateVal = asset.assignedDate;
        let expectedReturnDateVal = asset.expectedReturnDate;

        if (transferData.updateCustodian) {
          if (transferData.toCustodianName) {
            isNowAssignedStatus = 'checked-out';
            assignedDateVal = new Date().toISOString().split('T')[0];
            expectedReturnDateVal = asset.expectedReturnDate || '2026-12-31';
          } else {
            isNowAssignedStatus = 'available';
            assignedDateVal = null;
            expectedReturnDateVal = null;
          }
        }

        const updated: Asset = {
          ...asset,
          company: transferData.toCompany,
          department: transferData.toDepartment,
          location: transferData.toLocation,
          status: isNowAssignedStatus as AssetStatus,
          assignedTo: transferData.toCustodianName,
          assignedEmail: transferData.toCustodianEmail,
          assignedDate: assignedDateVal,
          expectedReturnDate: expectedReturnDateVal,
          notes: `${asset.notes ? asset.notes + ' | ' : ''}Transferred: ${transferData.notes}`
        };
        updatedAssetObj = updated;

        if (selectedAsset?.id === assetId) setSelectedAsset(updated);
        return updated;
      }
      return asset;
    }));

    // Log this transaction inside assignment history if custodian changed
    if (transferData.updateCustodian && (oldCustodian !== (transferData.toCustodianName || 'Unassigned'))) {
      const currentTimestampString = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const actionType = transferData.toCustodianName ? 'check-out' : 'check-in';
      const newAssignmentLog: AssignmentLog = {
        id: `AL-${Date.now().toString().slice(-4)}`,
        assetId,
        assetName: targetAsset.name,
        assetType: targetAsset.type,
        action: actionType as any,
        employeeName: transferData.toCustodianName || oldCustodian,
        employeeEmail: transferData.toCustodianEmail || targetAsset.assignedEmail || '',
        department: transferData.toDepartment,
        date: currentTimestampString,
        notes: `Transfer Custody Action - ${transferData.notes}`
      };
      setAssignmentLogs(prev => [newAssignmentLog, ...prev]);
    }

    // Build rich, custom chronological audit event details
    let transferLogDetails = `Asset ${assetId} (${targetAsset.brand} ${targetAsset.name}) re-routed: `;
    const parts: string[] = [];
    if (oldCompany !== transferData.toCompany) {
      parts.push(`Ownership transferred from group [${oldCompany}] to [${transferData.toCompany}]`);
    }
    if (oldDepartment !== transferData.toDepartment) {
      parts.push(`Department re-allocated from [${oldDepartment}] to [${transferData.toDepartment}]`);
    }
    if (oldLocation !== transferData.toLocation) {
      parts.push(`Physical home shift from [${oldLocation}] to [${transferData.toLocation}]`);
    }
    if (transferData.updateCustodian && (oldCustodian !== (transferData.toCustodianName || 'Unassigned'))) {
      parts.push(`Custody re-assigned from [${oldCustodian}] to [${transferData.toCustodianName || 'Unassigned'}]`);
    }
    
    if (parts.length === 0) {
      parts.push(`Transferred node specifications updated. Reason: "${transferData.notes}"`);
    } else {
      transferLogDetails += parts.join('; ') + `. Commentary: "${transferData.notes}".`;
    }

    logAuditEvent(
      'Asset Transferred',
      transferLogDetails,
      'update'
    );

    triggerToast(`Equipment ${assetId} transferred and logs registered.`, 'success');
    if (transferData.updateCustodian && updatedAssetObj) {
      setTimeout(() => syncAssetUserLogin(updatedAssetObj!), 50);
    }
    setIsTransferModalOpen(false);
    setTransferAsset(null);
  };

  // Quick helper to categorize assets for filter selectors
  const getAssetTypeIcon = (type: AssetType, size = 16) => {
    switch (type) {
      case 'laptop': return <Laptop size={size} />;
      case 'desktop': return <Monitor size={size} />;
      case 'server': return <Server size={size} />;
      case 'switch': return <Network size={size} />;
      case 'printer': return <Printer size={size} />;
      default: return <Cpu size={size} />;
    }
  };

  // --- Dynamic Dashboard & Metric Calculations ---
  // Create Multi-Tenant Scoped Assets List
  const scopedAssets = assets.filter(a => {
    // If the logged in user is an asset user or viewer, they can ONLY view their assigned asset specs view-only
    if (currentUser && (currentUser.isAssetUser || currentUser.role === 'viewer') && !currentUser.isRootAdmin && currentUser.email !== 'root.admin@company.com' && currentUser.email !== 'saravananengineerit@gmail.com') {
      const assignedEmailVal = (a.assignedEmail || '').toLowerCase().trim();
      const emailAddressVal = (a.emailAddress || '').toLowerCase().trim();
      const currentUserEmailVal = currentUser.email.toLowerCase().trim();
      if (assignedEmailVal !== currentUserEmailVal && emailAddressVal !== currentUserEmailVal) {
        return false;
      }
    }

    const assetComp = a.company || 'ASTRA TEC';
    
    // Check if the current logged-in user is authorized for this entity unit
    if (currentUser) {
      const compUpper = assetComp.toUpperCase().trim();
      if (compUpper === 'ASTRA TEC' && !currentUser.unitAstraTec) return false;
      if (compUpper === 'PEL' && !currentUser.unitPel) return false;
    }

    return activeCompanyFilter === 'all' || assetComp.toLowerCase() === activeCompanyFilter.toLowerCase();
  });

  const totalAssetsCount = scopedAssets.length;
  const checkedOutCount = scopedAssets.filter(a => a.status === 'checked-out').length;
  const inMaintenanceCount = scopedAssets.filter(a => a.status === 'maintenance').length;
  const availableCount = scopedAssets.filter(a => a.status === 'available').length;

  // Specific asset type counts
  const totalDesktopsCount = scopedAssets.filter(a => a.type.toLowerCase() === 'desktop').length;
  const totalLaptopsCount = scopedAssets.filter(a => a.type.toLowerCase() === 'laptop').length;
  const totalPrintersCount = scopedAssets.filter(a => a.type.toLowerCase() === 'printer').length;

  // Total investment worth
  const totalValueSum = scopedAssets.reduce((sum, item) => sum + item.purchaseCost, 0);

  // Maintenance alarm checks (Next maintenance scheduled in the past, or currently marked list status 'maintenance')
  const maintenanceOverdueAlerts = scopedAssets.filter(a => 
    a.status !== 'retired' && (
      a.status === 'maintenance' || 
      (a.nextMaintenanceDate && a.nextMaintenanceDate < BASELINE_DATE)
    )
  );

  // Return overdue checks (custodian holding it past target return schedule)
  const returnOverdueAlerts = scopedAssets.filter(a => 
    a.status === 'checked-out' && 
    a.expectedReturnDate && 
    a.expectedReturnDate < BASELINE_DATE
  );

  // Filtering inventory lists
  const filteredAssets = scopedAssets.filter(a => {
    const normalizedSearch = searchQuery.toLowerCase().trim();
    if (normalizedSearch) {
      // Dynamic search across all fields of all assets (searching all letters)
      return (
        a.id.toLowerCase().includes(normalizedSearch) ||
        a.name.toLowerCase().includes(normalizedSearch) ||
        a.brand.toLowerCase().includes(normalizedSearch) ||
        a.model.toLowerCase().includes(normalizedSearch) ||
        a.serialNumber.toLowerCase().includes(normalizedSearch) ||
        a.type.toLowerCase().includes(normalizedSearch) ||
        a.os.toLowerCase().includes(normalizedSearch) ||
        a.department.toLowerCase().includes(normalizedSearch) ||
        a.location.toLowerCase().includes(normalizedSearch) ||
        a.status.toLowerCase().includes(normalizedSearch) ||
        a.notes.toLowerCase().includes(normalizedSearch) ||
        a.maintenanceFrequency.toLowerCase().includes(normalizedSearch) ||
        (a.company && a.company.toLowerCase().includes(normalizedSearch)) ||
        (a.assignedTo && a.assignedTo.toLowerCase().includes(normalizedSearch)) ||
        (a.assignedEmail && a.assignedEmail.toLowerCase().includes(normalizedSearch)) ||
        (a.emailAddress && a.emailAddress.toLowerCase().includes(normalizedSearch)) ||
        (a.ipAddress && a.ipAddress.toLowerCase().includes(normalizedSearch)) ||
        (a.mailType && a.mailType.toLowerCase().includes(normalizedSearch)) ||
        (a.usb && a.usb.toLowerCase().includes(normalizedSearch))
      );
    }

    const matchesType = filterType === 'all' || a.type === filterType;
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchesDept = filterDept === 'all' || a.department === filterDept;

    return matchesType && matchesStatus && matchesDept;
  });

  // Calculate Allocation percentages for Visual bars
  const deptCounts = scopedAssets.reduce((acc, a) => {
    acc[a.department] = (acc[a.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeCounts = scopedAssets.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute total desktops, laptops, printers, switches, routers, firewalls, in department wise
  const departmentHardwareSummary = useMemo(() => {
    // Collect all departments dynamically from dropdownDepartments
    const allDepts = dropdownDepartments.length > 0 ? dropdownDepartments : ['IT', 'Engineering', 'Finance', 'HR', 'Sales', 'Operations'];
    
    return allDepts.map(dept => {
      const deptAssets = scopedAssets.filter(a => (a.department || '').toLowerCase() === dept.toLowerCase());
      
      const desktops = deptAssets.filter(a => (a.type || '').toLowerCase() === 'desktop').length;
      const laptops = deptAssets.filter(a => (a.type || '').toLowerCase() === 'laptop').length;
      const printers = deptAssets.filter(a => (a.type || '').toLowerCase() === 'printer').length;
      const switches = deptAssets.filter(a => (a.type || '').toLowerCase() === 'switch').length;
      const routers = deptAssets.filter(a => (a.type || '').toLowerCase() === 'router' || (a.type || '').toLowerCase() === 'routers').length;
      const firewalls = deptAssets.filter(a => (a.type || '').toLowerCase() === 'firewall' || (a.type || '').toLowerCase() === 'firewalls').length;
      const total = desktops + laptops + printers + switches + routers + firewalls;

      return {
        department: dept,
        desktops,
        laptops,
        printers,
        switches,
        routers,
        firewalls,
        total
      };
    });
  }, [scopedAssets, dropdownDepartments]);

  // Dynamic Status Distribution computed for Recharts Pie Chart
  const statusCounts = useMemo(() => {
    const counts = {
      'available': 0,
      'checked-out': 0,
      'maintenance': 0,
      'retired': 0,
    };
    scopedAssets.forEach(a => {
      const s = a.status;
      if (counts[s] !== undefined) {
        counts[s] = counts[s] + 1;
      }
    });

    const statusLabels: Record<string, string> = {
      'available': 'Available Stock',
      'checked-out': 'Checked Out',
      'maintenance': 'In Maintenance',
      'retired': 'Retired / Defunct'
    };

    const statusColors: Record<string, string> = {
      'available': '#10B981',     // Emerald 500
      'checked-out': '#3B82F6',   // Blue 500
      'maintenance': '#F59E0B',   // Amber 500
      'retired': '#EF4444'        // Red 500
    };

    return Object.entries(counts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      color: statusColors[status] || '#64748B',
    })).filter(item => item.value > 0);
  }, [scopedAssets]);

  // Dynamic Departmental Allocation computed for Recharts Bar Chart
  const deptChartData = useMemo(() => {
    const list = dropdownDepartments.length > 0 ? dropdownDepartments : ['IT', 'Engineering', 'Finance', 'HR', 'Sales', 'Operations'];
    return list.map(dept => ({
      name: dept,
      count: deptCounts[dept] || 0
    }));
  }, [dropdownDepartments, deptCounts]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans select-none overflow-y-auto w-full">
        {/* Toast Notifier */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-lg z-50 flex items-center gap-3 border text-xs font-semibold ${
                toast.type === 'success' ? 'bg-blue-600 border-blue-700 text-white' :
                toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-8 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-4 shrink-0 justify-between select-none shadow-xs">
          {/* Left Logo: modern blue/indigo block */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 px-3 py-1 text-white font-extrabold tracking-wider font-mono italic text-xs rounded-lg shadow-sm">
              PREMIER
            </div>
            <span className="font-bold tracking-tight text-slate-800 text-sm font-sans">Evolvics</span>
          </div>
          {/* Center Title */}
          <div className="flex-1 text-center sm:pr-24 w-full">
            <h1 className="text-sm sm:text-base md:text-lg font-sans text-slate-900 font-bold tracking-tight relative inline-block uppercase">
              Asset Management System
              <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-blue-600" />
            </h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F8FAFC]">
          <div className="w-full max-w-[620px] bg-white border border-slate-200/95 rounded-2xl p-6 sm:p-10 shadow-md">
            <div className="text-center mb-8">
              <h2 className="font-black text-slate-900 text-lg tracking-tight font-sans uppercase">
                System Operator Login
              </h2>
              <p className="text-slate-500 text-[11px] mt-1">Authenticate credentials to access internal asset registries</p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Avatar area on the left */}
              <div className="flex-shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-24 h-24 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-xs select-none">
                    {/* Background circular highlight */}
                    <circle cx="50" cy="50" r="48" fill="#FFFFFF" className="stroke-slate-150 stroke-1" />
                    
                    {/* Suit shoulders */}
                    <path d="M15,90 Q50,60 85,90 Z" fill="#3B82F6" />
                    
                    {/* White collar of the shirt */}
                    <polygon points="40,68 50,78 60,68 50,65" fill="#FFFFFF" />
                    
                    {/* Neck Tie */}
                    <polygon points="48,70 52,70 54,92 50,96 46,92" fill="#1E293B" />
                    
                    {/* Neck */}
                    <rect x="44" y="55" width="12" height="15" fill="#EFA983" />
                    
                    {/* Ears */}
                    <circle cx="36" cy="45" r="4" fill="#EFA983" />
                    <circle cx="64" cy="45" r="4" fill="#EFA983" />
                    
                    {/* Face */}
                    <path d="M38,32 Q50,22 62,32 Q65,48 50,56 Q35,48 38,32 Z" fill="#F4BA9B" />
                    
                    {/* Hair */}
                    <path d="M36,32 Q50,16 64,32 Q62,24 52,24 Q42,24 36,32 Z" fill="#22252A" />
                    <path d="M36,32 Q35,28 39,24 Q44,22 49,24" fill="#22252A" stroke="#22252A" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* Input area on the right */}
              {isForgotPasswordOpen ? (
                /* PASSWORD RESET OPTION GIVEN TO USER LOGIN */
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!forgotEmail.trim() || !forgotNewPassword.trim()) {
                      triggerToast('Please fill all password reset inputs.', 'error');
                      return;
                    }
                    const matchedUser = users.find(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase());
                    if (!matchedUser) {
                      triggerToast('No operator found with that secure email identifier.', 'error');
                      return;
                    }
                    const updatedUser = {
                      ...matchedUser,
                      password: forgotNewPassword.trim(),
                      failedAttempts: 0
                    };
                    setUsers(prev => prev.map(u => u.email === matchedUser.email ? updatedUser : u));
                    logAuditEvent('Password Self Reset', `Operator "${matchedUser.name}" updated credentials via self-service Reset option.`, 'update');
                    
                    if (matchedUser.isLocked) {
                      triggerToast('Credential updated! Note: Your account remains locked. Request an Admin to enable.', 'info');
                    } else {
                      triggerToast('Success: Your login passcode has been updated! Please log in.', 'success');
                    }
                    setIsForgotPasswordOpen(false);
                    setForgotEmail('');
                    setForgotNewPassword('');
                  }} 
                  className="flex-1 w-full space-y-3.5 font-sans text-xs text-left"
                >
                  <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] leading-relaxed font-bold rounded-lg uppercase tracking-wider">
                    🔑 Self-Service Password Reset
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      REGISTERED EMAIL
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. saravananengineerit@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      NEW SECURE PASSWORD
                    </label>
                    <input
                      type="password"
                      placeholder="At least 3 characters"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="pt-1.5 flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold cursor-pointer transition-all rounded-lg shadow-sm"
                    >
                      Reset Now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordOpen(false);
                        setForgotEmail('');
                        setForgotNewPassword('');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-extrabold cursor-pointer transition-all rounded-lg"
                    >
                      Back
                    </button>
                  </div>
                </form>
              ) : (
                /* Standard Login Form */
                <form onSubmit={handleLoginSubmit} className="flex-1 w-full space-y-4 font-sans text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block text-left">
                      USER NAME
                    </label>
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      placeholder="e.g. Saravanan"
                      value={loginUsername}
                      onChange={(e) => {
                        setLoginUsername(e.target.value);
                        setLoginError('');
                      }}
                      className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-slate-200 text-slate-800 font-semibold rounded-xl outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block text-left">
                      PASS WORD
                    </label>
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginError('');
                      }}
                      className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                      required
                    />
                  </div>

                  {loginError && (
                    <div className="p-2.5 bg-red-50 border border-red-150 text-red-700 text-[10px] font-bold rounded-lg text-left leading-normal">
                      ⚠️ {loginError}
                    </div>
                  )}

                  {/* RESET PASS LINK AND ACTIONS */}
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-1 gap-2">
                    <div className="flex justify-start gap-2 w-full sm:w-auto">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold cursor-pointer transition-all rounded-lg shadow-sm active:scale-[0.98]"
                      >
                        Submit
                      </button>
                      <button
                        type="button"
                        onClick={handleLoginCancel}
                        className="px-5 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold cursor-pointer transition-all rounded-lg active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordOpen(true);
                        setForgotEmail(loginUsername.includes('@') ? loginUsername : '');
                        setForgotNewPassword('');
                        setLoginError('');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-bold text-[10px] uppercase hover:underline tracking-wider cursor-pointer w-full sm:w-auto text-left sm:text-right"
                    >
                      Forgot/Reset Password?
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Elegant Informational Demo Helpers Below Card */}
          <div className="mt-8 max-w-[620px] w-full bg-white border border-slate-200/80 rounded-2xl p-5 text-xs shadow-xs space-y-3">
            <div className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              🛡️ Dynamic Authorization Operators
            </div>
            <p className="text-slate-500 text-[11px] leading-normal font-sans">
              This corporate asset environment supports complete role-based segregation. You can instantly select any of the authorization profiles below (password is configured in system state):
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 font-sans">
              {users.map(u => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => {
                    setLoginUsername(u.name);
                    setLoginPassword(u.password || '123456');
                    setLoginError('');
                    triggerToast(`Loaded credentials for: ${u.name}`);
                  }}
                  className={`p-3 bg-white hover:bg-blue-50/40 border rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer ${
                    u.isLocked ? 'border-red-200 bg-red-50/20 hover:bg-red-50/40 text-red-950' : 'border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="font-bold group-hover:text-blue-600 flex items-center justify-between gap-1">
                    <span className="truncate">{u.isRootAdmin ? '👑 ' : '👤 '}{u.name}</span>
                    {u.isLocked && <span className="text-[8px] bg-red-50 text-red-700 border border-red-100 px-1 py-0.2 rounded font-mono font-black uppercase tracking-wider animate-pulse">🔒 LOCKED</span>}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">{u.email}</div>
                  <div className="mt-1 text-[9px] font-mono text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded inline-block">
                    Pass: <span className="font-bold">{u.password || '123456'}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[8px] font-extrabold uppercase tracking-widest border-t border-slate-100/50 pt-2">
                    <span className={`${
                      u.role === 'admin' ? 'text-emerald-700' :
                      u.role === 'manager' ? 'text-amber-700' :
                      'text-indigo-700'
                    }`}>
                      {u.role === 'manager_viewer' ? 'Manager Viewer' : u.role}
                    </span>
                    <span className="text-slate-400 group-hover:text-blue-600 tracking-normal text-[8px] uppercase">Select Option</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div id="main-app" className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased overflow-hidden no-print">
      
      {/* Toast Notifier */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            id="toast-notification"
            className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-lg z-50 flex items-center gap-3 border text-xs font-semibold ${
              toast.type === 'success' ? 'bg-blue-600 border-blue-700 text-white' :
              toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
              'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Back Drop overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0F172A] text-white flex flex-col shrink-0 h-full z-45 transform transition-transform duration-350 lg:translate-x-0 lg:static lg:z-auto ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white shrink-0 shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            </div>
            <span className="font-bold tracking-tight text-lg">Premier Evolvics</span>
          </div>
          
          {/* Close button for mobile sidebar */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-1">
          <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Inventory & Operations</div>
          
          {/* Dashboard */}
          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedAsset(null); setIsMobileSidebarOpen(false); }}
            id="tab-dashboard"
            className={`w-full flex items-center px-6 py-3 text-left font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 opacity-80">📊</span> Dashboard
          </button>
          
          {/* Add Asset */}
          <button
            onClick={() => { 
              setActiveTab('directory'); 
              setAssetToEdit(null);
              setIsAssetModalOpen(true);
              setIsMobileSidebarOpen(false);
              triggerToast('Opened asset registry form. Add your new hardware details below!', 'info');
            }}
            id="tab-directory"
            className={`w-full flex items-center px-6 py-3 text-left font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'directory' && isAssetModalOpen
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 opacity-80">➕</span> Add Asset
          </button>

          {/* Modify Asset */}
          <button
            onClick={() => { 
              setActiveTab('directory'); 
              setIsMobileSidebarOpen(false);
              triggerToast("Select any asset in the list below and click 'Edit' to modify its technical data.", 'info');
            }}
            id="tab-modify"
            className={`w-full flex items-center px-6 py-3 text-left font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'directory' && !isAssetModalOpen
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 opacity-80">✏️</span> Modify Asset
          </button>

          {/* Asset Transfer */}
          <button
            onClick={() => { setActiveTab('tracking'); setIsMobileSidebarOpen(false); }}
            id="tab-tracking"
            className={`w-full flex items-center px-6 py-3 text-left font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'tracking'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 opacity-80">🔄</span> Asset Transfer
          </button>

          {/* Reports */}
          <button
            onClick={() => { setActiveTab('audit'); setIsMobileSidebarOpen(false); }}
            id="tab-reports"
            className={`w-full flex items-center px-6 py-3 text-left font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 opacity-80">📋</span> Reports
          </button>

          {/* Maintenance Centre */}
          <button
            onClick={() => { setActiveTab('maintenance'); setIsMobileSidebarOpen(false); }}
            id="tab-maintenance"
            className={`w-full flex items-center px-6 py-3 text-left font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'maintenance'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 opacity-80">🔧</span> Maintenance Centre
          </button>

          {/* IT Tickets & Service Call System */}
          <button
            onClick={() => { setActiveTab('it-service-calls'); setIsMobileSidebarOpen(false); }}
            id="tab-it-service-calls"
            className={`w-full flex items-center px-6 py-3 text-left font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'it-service-calls'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 opacity-80">🛎️</span> IT Service Call
          </button>

          <div className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">System Settings</div>

          {/* Settings */}
          <button
            onClick={() => { setActiveTab('settings'); setIsMobileSidebarOpen(false); }}
            id="tab-settings"
            className={`w-full flex items-center px-6 py-3 text-left font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3 opacity-80">⚙️</span> Settings & Access
          </button>
        </nav>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Header Bar */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 lg:py-0 lg:h-16 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shrink-0 font-sans z-30">
          {/* Top Control Block: Hamburger, Mobile Brand & Profile Widget */}
          <div className="flex items-center justify-between lg:hidden shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Menu size={18} />
              </button>
              
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-sm text-slate-900">Premier Evolvics</span>
              </div>
            </div>

            {/* Profile Widget for Mobile */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetDemoData}
                title="Reset client database layout to default values"
                className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-slate-50 cursor-pointer"
              >
                <RefreshCw size={12} />
              </button>
              
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-[9px] shadow-2xs">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              
              <button
                type="button"
                onClick={handleLogout}
                className="px-1.5 py-1 bg-red-50 hover:bg-red-100 text-red-650 rounded text-[9px] font-bold tracking-wide uppercase transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Filters / Scopes Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
            {/* Search Box */}
            <div className="relative flex-1 max-w-full sm:max-w-72">
              <input 
                type="text" 
                placeholder="Search description, S/N, owner..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 text-slate-800"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Scope / Multi-Company Filter Switcher */}
            <div className="relative w-full sm:w-56">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Building2 size={13} />
              </div>
              <select
                value={activeCompanyFilter}
                onChange={(e) => {
                  setActiveCompanyFilter(e.target.value);
                  triggerToast(`Company active view scoped: ${e.target.value === 'all' ? 'All Groups' : e.target.value}`);
                }}
                className="w-full pl-8.5 pr-8 py-2 bg-slate-100 hover:bg-slate-200/50 border border-slate-200/40 text-slate-700 text-xs font-semibold rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer transition-all"
              >
                <option value="all">🏢 All Company Groups (All)</option>
                {dropdownCompanies.map(c => (
                  <option key={c} value={c}>🏢 {c}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown size={11} />
              </div>
            </div>
          </div>

          {/* Right Side Info, Buttons & Desktop Profile Widget */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {/* Desktop Only Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={handleResetDemoData}
                title="Reset client database layout to default values"
                className="p-2 text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 bg-slate-50 cursor-pointer"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {currentUser.role === 'viewer' ? (
              <div 
                title="View-only access locked. Change your Switcher Operator status to edit assets."
                className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed select-none w-full sm:w-auto"
              >
                <span>Add Locked</span>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setAssetToEdit(null);
                  setIsAssetModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
              >
                <Plus size={14} />
                <span>Add New Asset</span>
              </button>
            )}

            {/* Laptop/Desktop Profile Selector */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shadow-3xs select-none">
              <div className="text-left">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block leading-none">USER NAME</span>
                <span className="text-xs font-black text-slate-800 tracking-tight block mt-0.5" title={currentUser.name}>
                  {currentUser.name}
                </span>
              </div>
              <div className="w-6.5 h-6.5 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs ml-0.5">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="h-4 w-px bg-slate-200 mx-1.5"></div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-700 border border-red-200 hover:border-red-300 rounded text-[10px] font-extrabold tracking-wide uppercase transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable content body */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col gap-6 bg-[#F8FAFC]">
          
          {/* Top Stats Row */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
            <button
              id="stat-card-master-fleet"
              onClick={() => {
                setActiveTab('directory');
                setFilterStatus('all');
                setFilterType('all');
                setFilterDept('all');
                setSearchQuery('');
                triggerToast('Navigated to Directory: Showing all registered hardware assets', 'success');
              }}
              className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 active:scale-[0.98] cursor-pointer"
            >
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Layers size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">TOTAL ASSET</span>
                <span className="text-xl font-bold mt-0.5 text-slate-900 block">{totalAssetsCount}</span>
                <div className="text-[9px] text-indigo-700 bg-indigo-50/75 border border-indigo-100/60 rounded px-1.5 py-1 mt-1.5 font-mono space-y-0.5 font-extrabold leading-tight">
                  <div>TOTAL DESKTOP = {totalDesktopsCount}</div>
                  <div>LAPTOP = {totalLaptopsCount}</div>
                  <div>PRINTER = {totalPrintersCount}</div>
                </div>
              </div>
            </button>

            <button
              id="stat-card-checked-out"
              onClick={() => {
                setActiveTab('directory');
                setFilterStatus('checked-out');
                setFilterType('all');
                setFilterDept('all');
                setSearchQuery('');
                triggerToast('Navigated to Directory: Scoped strictly to Checked Out systems', 'success');
              }}
              className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300 active:scale-[0.98] cursor-pointer"
            >
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">Checked Out</span>
                <span className="text-xl font-bold mt-1 text-slate-900 block">{checkedOutCount}</span>
                <span className="text-[9px] text-emerald-600 block font-medium">Custody ({Math.round((checkedOutCount/totalAssetsCount)*100 || 0)}%)</span>
              </div>
            </button>

            <button
              id="stat-card-available"
              onClick={() => {
                setActiveTab('directory');
                setFilterStatus('available');
                setFilterType('all');
                setFilterDept('all');
                setSearchQuery('');
                triggerToast('Navigated to Directory: Showing Available Stock ready for deployment', 'success');
              }}
              className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-slate-350 active:scale-[0.98] cursor-pointer"
            >
              <div className="h-10 w-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">Available Stock</span>
                <span className="text-xl font-bold mt-1 text-slate-900 block">{availableCount}</span>
                <span className="text-[9px] text-slate-400 block font-light">Deploy ready</span>
              </div>
            </button>

            <button
              id="stat-card-maintenance"
              onClick={() => {
                setActiveTab('directory');
                setFilterStatus('maintenance');
                setFilterType('all');
                setFilterDept('all');
                setSearchQuery('');
                triggerToast('Navigated to Directory: Scoped strictly to systems currently In Maintenance', 'success');
              }}
              className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-amber-300 active:scale-[0.98] cursor-pointer"
            >
              <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <Wrench size={18} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">In Maintenance</span>
                <span className="text-xl font-bold mt-1 text-amber-600 block">{inMaintenanceCount}</span>
                <span className="text-[9px] text-amber-600 block font-light font-sans">Inactive logs</span>
              </div>
            </button>

            <button
              id="stat-card-inspection-alarms"
              onClick={() => {
                setActiveTab('maintenance');
                triggerToast('Navigated to Maintenance Centre: Showing active Scheduled Inspection Alarms', 'success');
              }}
              className={`text-left p-4 rounded-xl border shadow-xs flex items-center gap-3.5 col-span-2 lg:col-span-1 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer ${
                maintenanceOverdueAlerts.length > 0 || returnOverdueAlerts.length > 0
                  ? 'bg-red-50/50 border-red-200 text-red-900 hover:bg-red-50 hover:border-red-300'
                  : 'bg-white border-slate-200 hover:border-slate-350'
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                maintenanceOverdueAlerts.length > 0 || returnOverdueAlerts.length > 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                <ShieldAlert size={18} strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block tracking-wider">Inspection Alarms</span>
                <span className="text-xl font-bold mt-1 text-slate-950 block">{maintenanceOverdueAlerts.length + returnOverdueAlerts.length} Units</span>
                <span className="text-[9px] text-red-600 font-semibold block uppercase font-sans">Overdue</span>
              </div>
            </button>
          </div>
          )}

          {/* Active Tab rendering framework */}
          <div id="tab-viewport" className="flex-1 min-h-0">

            {/* Standard Page Privilege Guards */}
            {((activeTab === 'dashboard' || activeTab === 'directory') && !currentUser.pageMaster) && renderAccessDenied('Master')}
            {((activeTab === 'tracking' || activeTab === 'maintenance') && !currentUser.pageEntry) && renderAccessDenied('Entry')}
            {(activeTab === 'audit' && !currentUser.pageReports) && renderAccessDenied('Reports')}
          
          {/* TAB 1: DASHBOARD ANALYTICS OVERVIEW */}
          {activeTab === 'dashboard' && currentUser.pageMaster && (
            <div className="space-y-6">
              
              {/* Overdue/Urgent Alerts Banner */}
              {(maintenanceOverdueAlerts.length > 0 || returnOverdueAlerts.length > 0) && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0 mt-0.5">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-red-950">Immediate Fleet Inspections Prescribed</h3>
                      <p className="text-[11px] text-red-700/80 mt-0.5">
                        Detecting {maintenanceOverdueAlerts.length} critical systems with overdue maintenance scheduled, and {returnOverdueAlerts.length} devices past expected custodian checkout terms.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Inspect Alarms</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {/* Grid with visual charts & summaries */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Form Factor Allocations Tracker */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Inventory Distribution Type</h3>
                    <Layers size={14} className="text-slate-450" />
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {(['laptop', 'desktop', 'server', 'switch', 'printer', 'peripheral'] as AssetType[]).map(type => {
                      const count = typeCounts[type] || 0;
                      const pct = Math.round((count / totalAssetsCount) * 100 || 0);
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium capitalize text-slate-600">
                            <span className="flex items-center gap-1.5">
                              {getAssetTypeIcon(type, 13)}
                              {type}s
                            </span>
                            <span className="font-bold text-slate-800">{count} units</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-slate-700 rounded-full"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Shortcuts & Maintenance Highlights */}
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Shortcuts</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => {
                          setAssetToEdit(null);
                          setIsAssetModalOpen(true);
                        }}
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left text-xs font-semibold text-slate-800 transition-colors border border-slate-200/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Plus size={14} className="text-blue-600" />
                          Register Custom Hardware Unit
                        </span>
                        <ArrowRight size={12} className="text-slate-400" />
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('tracking');
                        }}
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left text-xs font-semibold text-slate-800 transition-colors border border-slate-200/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <ArrowUpRight size={14} className="text-blue-600" />
                          Issue check-out Custody
                        </span>
                        <ArrowRight size={12} className="text-slate-400" />
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('audit');
                        }}
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-left text-xs font-semibold text-slate-800 transition-colors border border-slate-200/40 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileText size={14} className="text-blue-600" />
                          Pull CSV / XLS Spreadsheets
                        </span>
                        <ArrowRight size={12} className="text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
                    <div className="relative z-10 space-y-2">
                      <span className="text-[9px] bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase">Fleet Valuation</span>
                      <h4 className="text-xl font-bold tracking-tight">
                        ₹{totalValueSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h4>
                      <p className="text-[10px] text-slate-300 leading-relaxed">
                        Total hardware capital locked. Active insurance coverage audits recommend quarterly physical checks on servers and high-value switches.
                      </p>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                      <Cpu size={120} />
                    </div>
                  </div>
                </div>

              </div>

              {/* Dynamic Recharts Performance & Status Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Asset Status Distribution Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      📊 Asset Status Lifecycle Distribution
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      Percentage and numeric allocation of active corporate devices across internal inventory lifecycles.
                    </p>
                  </div>
                  
                  <div className="h-[280px] w-full mt-4 flex items-center justify-center">
                    {statusCounts.length === 0 ? (
                      <div className="text-center text-slate-400 py-8">
                        <p className="text-xs font-semibold">No status logs recorded</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusCounts}
                            cx="50%"
                            cy="45%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusCounts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            iconType="circle"
                            iconSize={8}
                            content={({ payload }) => (
                              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500">
                                {payload?.map((entry: any, i: number) => {
                                  const original = statusCounts[i];
                                  if (!original) return null;
                                  return (
                                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg py-1 px-2.5">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-slate-500">{entry.value}: <span className="font-extrabold text-slate-800">{original.value}</span></span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Hardware Allocations per Corporate Department Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      📈 Department-wise Allocation Statistics
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      Aggregate numbers of registered enterprise machines allocated per corporate segment.
                    </p>
                  </div>

                  <div className="h-[280px] w-full mt-4">
                    {deptChartData.every(d => d.count === 0) ? (
                      <div className="h-full flex items-center justify-center text-center text-slate-400 py-8">
                        <p className="text-xs font-semibold font-sans">No corporate devices currently registered</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={deptChartData}
                          margin={{ top: 15, right: 10, left: -22, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }} 
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC', radius: 8 }} />
                          <Bar 
                            dataKey="count" 
                            name="Allocated Items" 
                            fill="#6366F1" 
                            radius={[6, 6, 0, 0]} 
                            maxBarSize={30}
                          >
                            {deptChartData.map((entry, index) => {
                              const colors = ['#6366F1', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#14B8A6'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

              {/* Department-wise Hardware Demographics Report */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      📋 Department-wise Hardware Demographic Statistics
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Aggregated counts of total Desktops, Laptops, Printers, Switches, Routers, and Firewalls active per corporate department.
                    </p>
                  </div>
                  <Layers size={16} className="text-indigo-600 animate-pulse" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/85 text-slate-500 border-b border-slate-100 text-[10px] uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold text-slate-850">Department</th>
                        <th className="py-3.5 px-3 text-center font-bold">Laptops 💻</th>
                        <th className="py-3.5 px-3 text-center font-bold">Desktops 🖥️</th>
                        <th className="py-3.5 px-3 text-center font-bold">Printers 🖨️</th>
                        <th className="py-3.5 px-3 text-center font-bold">Switches 🔌</th>
                        <th className="py-3.5 px-3 text-center font-bold">Routers 🌐</th>
                        <th className="py-3.5 px-3 text-center font-bold">Firewalls 🛡️</th>
                        <th className="py-3.5 px-4 text-right font-bold">Total Hardware</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {departmentHardwareSummary.map((row) => (
                        <tr key={row.department} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-extrabold text-slate-700 uppercase tracking-wide">
                            {row.department} Division
                          </td>
                          <td className={`py-3.5 px-3 text-center font-semibold ${row.laptops > 0 ? 'text-slate-800 font-bold' : 'text-slate-350'}`}>
                            {row.laptops}
                          </td>
                          <td className={`py-3.5 px-3 text-center font-semibold ${row.desktops > 0 ? 'text-slate-800 font-bold' : 'text-slate-350'}`}>
                            {row.desktops}
                          </td>
                          <td className={`py-3.5 px-3 text-center font-semibold ${row.printers > 0 ? 'text-slate-800 font-bold' : 'text-slate-350'}`}>
                            {row.printers}
                          </td>
                          <td className={`py-3.5 px-3 text-center font-semibold ${row.switches > 0 ? 'text-slate-800 font-bold' : 'text-slate-350'}`}>
                            {row.switches}
                          </td>
                          <td className={`py-3.5 px-3 text-center font-semibold ${row.routers > 0 ? 'text-slate-800 font-bold' : 'text-slate-350'}`}>
                            {row.routers}
                          </td>
                          <td className={`py-3.5 px-3 text-center font-semibold ${row.firewalls > 0 ? 'text-slate-800 font-bold' : 'text-slate-350'}`}>
                            {row.firewalls}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-extrabold rounded-full ${row.total > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-450'}`}>
                              {row.total} units
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Master Audit logs shortcut feed */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Registry Activity Log</h3>
                  <button onClick={() => setActiveTab('audit')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 cursor-pointer">
                    View Complete Audit Trail <ArrowRight size={12} />
                  </button>
                </div>
 
                <div className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 4).map(log => (
                    <div key={log.id} className="py-2.5 flex items-start justify-between text-xs gap-4">
                      <div className="flex gap-2.5 items-start">
                        <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                          log.category === 'create' ? 'bg-green-500' :
                          log.category === 'delete' ? 'bg-red-500' :
                          log.category === 'check-out' ? 'bg-blue-600' :
                          log.category === 'check-in' ? 'bg-teal-500' : 'bg-amber-500'
                        }`}></span>
                        <div>
                          <span className="font-bold text-slate-800 block">{log.action}</span>
                          <p className="text-slate-500 mt-0.5 text-[11px]">{log.details}</p>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: HARDWARE DIRECTORY */}
          {activeTab === 'directory' && currentUser.pageMaster && (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden space-y-4 p-5">
              
              {/* Filtering Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                
                {/* Search query input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by ID, name, S/N, employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {/* Filter Selector: Category */}
                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">📁 All Form Factors</option>
                    <option value="laptop">💻 Laptops</option>
                    <option value="desktop">🖥️ Desktops</option>
                    <option value="server">🎛️ Servers</option>
                    <option value="switch">🔌 Switches</option>
                    <option value="printer">🖨️ Printers</option>
                    <option value="peripheral">🖱️ Peripherals</option>
                  </select>
                </div>

                {/* Filter Selector: Status */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/55 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">🟢 All Statuses</option>
                    <option value="available">Available in Stock</option>
                    <option value="checked-out">Checked Out</option>
                    <option value="maintenance">In Maintenance</option>
                    <option value="retired">Retired / Defunct</option>
                  </select>
                </div>

                {/* Filter Selector: Department */}
                <div>
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/55 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">🏢 All Departments</option>
                    <option value="IT">IT Administration</option>
                    <option value="Engineering">Engineering</option>
                    <option value="HR">Human Resources</option>
                    <option value="Finance">Finance</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

              </div>

              {/* Central Catalog Table list */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table id="tbl-hardware-inventory" className="min-w-full divide-y divide-slate-200/80 text-left text-xs">
                  <thead className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Asset ID</th>
                      <th className="px-4 py-3">Class & Specs</th>
                      <th className="px-4 py-3">Serial, OS & NetSec</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Custodian</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3 text-right">Acquisition</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                          <Cpu size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="font-semibold">No assets found matching the chosen search query or filters.</p>
                          <span className="text-[10px]">Try adjusting your controls.</span>
                        </td>
                      </tr>
                    ) : (
                      filteredAssets.map(item => {
                        const isOverdue = item.status === 'checked-out' && item.expectedReturnDate && item.expectedReturnDate < BASELINE_DATE;
                        return (
                          <tr 
                            key={item.id} 
                            onClick={() => setSelectedAsset(item)}
                            className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedAsset?.id === item.id ? 'bg-blue-50/40 hover:bg-blue-100/30' : ''}`}
                          >
                            {/* ID */}
                            <td className="px-4 py-3.5 font-mono font-bold text-blue-600 whitespace-nowrap">
                              {item.id}
                            </td>
                            {/* Specs */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 shrink-0">{getAssetTypeIcon(item.type)}</span>
                                <div>
                                  <span className="font-semibold text-slate-800">{item.brand} {item.name}</span>
                                  <span className="text-[10px] text-slate-400 block font-light">{item.model}</span>
                                </div>
                              </div>
                            </td>
                            {/* Serial / OS & Joined Network Security */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="space-y-1">
                                <div>
                                  <span className="font-mono text-slate-600 block text-[11px] font-semibold">{item.serialNumber}</span>
                                  <span className="text-[10px] text-slate-400 font-mono italic">{item.os}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                                  {item.ipAddress && item.ipAddress !== '—' && item.ipAddress !== 'N/A' && (
                                    <span className="font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100/80" title="IP Address">
                                      📶 {item.ipAddress}
                                    </span>
                                  )}
                                  {item.mailType && item.mailType !== 'NIL' && (
                                    <span className={`px-1.5 py-0.5 rounded border ${
                                      item.mailType === 'INTERNAL' ? 'bg-blue-50/50 text-blue-600 border-blue-100' :
                                      item.mailType === 'EXTERNAL' ? 'bg-amber-50/50 text-amber-600 border-amber-105' :
                                      'bg-purple-50/55 text-purple-600 border-purple-100'
                                    }`} title="Mail Type Access">
                                      ✉️ {item.mailType}
                                    </span>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded border ${
                                    item.usb === 'BLOCK' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  }`} title="USB policy">
                                    🔌 USB: {item.usb || 'ALLOW'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            {/* Dept */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-slate-705 font-medium">
                              {item.department}
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.status === 'available' ? 'bg-green-50 text-green-700 border border-green-100' :
                                item.status === 'checked-out' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                item.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  item.status === 'available' ? 'bg-green-500' :
                                  item.status === 'checked-out' ? 'bg-blue-500' :
                                  item.status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-400'
                                }`}></span>
                                {item.status}
                              </span>
                            </td>
                            {/* Custodian */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {item.status === 'checked-out' ? (
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                                    <User size={11} className="text-slate-400" />
                                    {item.assignedTo}
                                  </span>
                                  <span className={`text-[9px] block font-mono ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-450 text-slate-400'}`}>
                                    {isOverdue ? '⚠️ Return Overdue' : `Due: ${item.expectedReturnDate}`}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300 italic">Inventory depot</span>
                              )}
                            </td>
                            {/* Email Address */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {item.emailAddress ? (
                                <div className="space-y-0.5">
                                  <span className="font-mono text-slate-700 block text-[11px] font-semibold">{item.emailAddress}</span>
                                  {item.status === 'checked-out' && item.assignedEmail && item.assignedEmail !== item.emailAddress && (
                                    <span className="font-mono text-[10px] text-slate-400 block font-light">👤 Custodian: {item.assignedEmail}</span>
                                  )}
                                </div>
                              ) : item.status === 'checked-out' && item.assignedEmail ? (
                                <span className="font-mono text-slate-700">{item.assignedEmail}</span>
                              ) : (
                                <span className="text-slate-300 italic">—</span>
                              )}
                            </td>
                            {/* Cost */}
                            <td className="px-4 py-3.5 text-right font-mono text-slate-800 font-semibold whitespace-nowrap">
                              ₹{item.purchaseCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {/* Action Buttons */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setAssetToEdit(item);
                                    setIsAssetModalOpen(true);
                                  }}
                                  id={`btn-edit-${item.id}`}
                                  className="p-1 px-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Edit Specifications"
                                >
                                  <Edit size={13} />
                                </button>
                                {currentUser.role !== 'viewer' && (
                                  <button
                                    onClick={() => {
                                      setTransferAsset(item);
                                      setIsTransferModalOpen(true);
                                    }}
                                    id={`btn-transfer-${item.id}`}
                                    className="p-1 px-1.5 hover:bg-indigo-50 rounded text-indigo-500 hover:text-indigo-700 transition-colors cursor-pointer"
                                    title="Transfer Asset Group / Dept"
                                  >
                                    <ArrowLeftRight size={13} />
                                  </button>
                                )}
                                {currentUser.role !== 'viewer' && (
                                  <button
                                    onClick={() => handleDeleteAsset(item.id)}
                                    id={`btn-delete-${item.id}`}
                                    className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                    title="Retire Asset Permanently"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Asset Detail Side Drawer if selected */}
              <AnimatePresence>
                {selectedAsset && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex justify-between items-start pb-2 border-b border-gray-200">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Detailed Asset Overview Card</span>
                        <h3 className="text-sm font-bold text-slate-900">{selectedAsset.brand} {selectedAsset.name}</h3>
                      </div>
                      <button onClick={() => setSelectedAsset(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                        <X size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Tag size={13} />
                          <span className="text-[9px] font-bold uppercase tracking-wide">ID & References</span>
                        </div>
                        <span className="font-mono text-slate-800 font-bold block">{selectedAsset.id}</span>
                        <span className="font-mono text-[10px] text-slate-500 block">S/N: {selectedAsset.serialNumber}</span>
                        <span className="text-[10px] italic text-slate-400 block mt-1">{selectedAsset.os}</span>
                        {selectedAsset.emailAddress && (
                          <span className="font-mono text-[10px] text-indigo-600 block mt-1 select-all" title="Registered Email Address">
                            ✉️ {selectedAsset.emailAddress}
                          </span>
                        )}
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <MapPin size={13} />
                          <span className="text-[9px] font-bold uppercase tracking-wide">Location & Division</span>
                        </div>
                        <span className="font-bold text-slate-700 block">{selectedAsset.department}</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">{selectedAsset.location}</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <IndianRupee size={13} />
                          <span className="text-[9px] font-bold uppercase tracking-wide">Acquisition metrics</span>
                        </div>
                        <span className="font-bold font-mono text-slate-800 block">₹{selectedAsset.purchaseCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-slate-400 block">{selectedAsset.purchaseDate} acquisition</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Wrench size={13} />
                          <span className="text-[9px] font-bold uppercase tracking-wide">Support Schedule</span>
                        </div>
                        <span className="text-[11px] text-slate-705 text-slate-800 block capitalize font-medium">Last: {selectedAsset.lastMaintenanceDate || 'None logged'}</span>
                        <span className="text-[10px] text-slate-400 block">Next: {selectedAsset.nextMaintenanceDate || 'Indefinite check'}</span>
                        <span className="text-[10px] text-amber-600 block capitalize font-medium">{selectedAsset.maintenanceFrequency} routine</span>
                      </div>
                    </div>

                    {/* Networking & Endpoint Security block in selected asset view */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 text-xs">
                      <span className="font-bold text-slate-800 block text-[10px] uppercase mb-1.5 tracking-wider">📶 Hardware Security & Network Config</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium text-slate-705">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50 flex items-center justify-between">
                          <span className="text-slate-400">IP Address:</span>
                          <span className="font-mono font-bold text-slate-800">{selectedAsset.ipAddress || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50 flex items-center justify-between">
                          <span className="text-slate-400">Mail Type:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            selectedAsset.mailType === 'INTERNAL' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            selectedAsset.mailType === 'EXTERNAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            selectedAsset.mailType === 'GROUP' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {selectedAsset.mailType || 'NIL'}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50 flex items-center justify-between">
                          <span className="text-slate-400">USB Access:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            selectedAsset.usb === 'BLOCK' ? 'bg-red-50 text-red-650 border-red-250' : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                          }`}>
                            {selectedAsset.usb === 'BLOCK' ? 'BLOCK' : 'ALLOW'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedAsset.notes && (
                      <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600">
                        <span className="font-bold text-slate-750 block text-[10px] uppercase mb-1">Log Commentary</span>
                        <p className="italic font-light">"{selectedAsset.notes}"</p>
                      </div>
                    )}

                    {/* Integrated action shortcuts inside detail view */}
                    <div className="flex items-center gap-3 pt-2">
                      {selectedAsset.status === 'available' ? (
                        <button
                          onClick={() => {
                            setCheckInOutAsset(selectedAsset);
                            setCheckInOutMode('check-out');
                            setIsCheckInOutOpen(true);
                          }}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-750 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
                        >
                          <ArrowUpRight size={13} />
                          Handover Assignment
                        </button>
                      ) : selectedAsset.status === 'checked-out' ? (
                        <button
                          onClick={() => {
                            setCheckInOutAsset(selectedAsset);
                            setCheckInOutMode('check-in');
                            setIsCheckInOutOpen(true);
                          }}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                        >
                          <ArrowDownLeft size={13} />
                          Acquire Check-In Receipt
                        </button>
                      ) : null}

                      {selectedAsset.status !== 'retired' && (
                        <button
                          onClick={() => {
                            setMaintenanceAsset(selectedAsset);
                            setIsMaintenanceOpen(true);
                          }}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-250 border-slate-200"
                        >
                          <Wrench size={13} />
                          Log Technical Service
                        </button>
                      )}

                      {selectedAsset.status !== 'retired' && currentUser.role !== 'viewer' && (
                        <button
                          onClick={() => {
                            setTransferAsset(selectedAsset);
                            setIsTransferModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200"
                        >
                          <ArrowLeftRight size={13} />
                          Transfer Station
                        </button>
                      )}

                      {selectedAsset.status !== 'retired' && currentUser.role !== 'viewer' && (
                        <button
                          onClick={() => handleDeleteAsset(selectedAsset.id)}
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-red-55 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors border border-red-200 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          Purge Asset
                        </button>
                      )}
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}

          {/* TAB 3: CHECK-IN & CHECK-OUT LOGISTICS WORKFLOW */}
          {activeTab === 'tracking' && currentUser.pageEntry && (
            <div className="space-y-6">
              
              {/* CORPORATE INTER-ENTITY & DEPARTMENTAL TRANSFER ACCESS NODE PANEL */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded font-semibold text-[10px] uppercase tracking-wider font-mono">ASSET TRANSFER</span>
                      <span className="text-slate-400 font-mono text-xs">Internal / External Nodes</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setTransferAsset(null);
                      setIsTransferModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <ArrowLeftRight size={14} />
                    Initiate Transfer
                  </button>
                </div>

                {/* Live history log of transferred items */}
                {auditLogs.filter(l => l.action === 'Asset Transferred').length > 0 && (
                  <div className="bg-slate-950/75 rounded-xl p-4 border border-slate-850/60 font-sans mt-3 space-y-2">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Transfer Ledger Receipts</div>
                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                      {auditLogs.filter(l => l.action === 'Asset Transferred').map(log => (
                        <div key={log.id} className="text-[11px] bg-slate-900/50 border border-slate-800/50 p-2.5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                            <p className="text-slate-300 truncate font-medium"><strong className="text-blue-400 font-mono">{log.id}</strong> · {log.details}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-500 font-mono">
                            <span>Operator: {log.user}</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* AVAILABLE DEVICES HANDOVER CENTER */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Assign Hardware Custody</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Issue custody transitions to employees containing custom conditions.</p>
                    </div>
                    <span className="p-1 px-2.5 bg-green-50 border border-green-100 text-green-700 rounded-full font-bold text-[10px]">
                      {availableCount} Available Options
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {assets.filter(a => a.status === 'available').length === 0 ? (
                      <div className="p-10 text-center text-slate-400 text-xs">
                        <CheckCircle2 size={24} className="mx-auto opacity-50 mb-1" />
                        <span className="font-semibold block text-slate-600">All Registered fleet under active assignment.</span>
                        <p className="text-[10px]">No units currently sitting on storage shelves.</p>
                      </div>
                    ) : (
                      assets.filter(a => a.status === 'available').map(item => (
                        <div key={item.id} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl hover:border-blue-400 transition-colors flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">{item.id}</span>
                            <span className="font-bold text-slate-800 block mt-1.5">{item.brand} {item.name}</span>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.department} Stock · {item.location}</p>
                          </div>
                          <button
                            onClick={() => {
                              setCheckInOutAsset(item);
                              setCheckInOutMode('check-out');
                              setIsCheckInOutOpen(true);
                            }}
                            id={`btn-deploy-shortcut-${item.id}`}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-slate-900 border text-white hover:border-slate-800 font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
                          >
                            <span>Issue Out</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CURRENT ACTIVE ASSIGNMENTS RECIEVER */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">In-Service Custody Registry</h3>
                      <p className="text-[10px] text-slate-450 mt-0.5">Retrieve assets back into stockpile and log handback diagnostics.</p>
                    </div>
                    <span className="p-1 px-2.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full font-bold text-[10px]">
                      {checkedOutCount} Active Checkouts
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {assets.filter(a => a.status === 'checked-out').length === 0 ? (
                      <div className="p-10 text-center text-slate-400 text-xs">
                        <ArrowDownLeft size={24} className="mx-auto opacity-50 mb-1 text-slate-350" />
                        <span className="font-semibold block text-slate-650">No active checked-out assets logged.</span>
                        <p className="text-[10px]">Entire corporate inventory is secure in local storage depots.</p>
                      </div>
                    ) : (
                      assets.filter(a => a.status === 'checked-out').map(item => {
                        const isOverdue = item.expectedReturnDate && item.expectedReturnDate < BASELINE_DATE;
                        return (
                          <div key={item.id} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl hover:border-teal-450 hover:border-teal-400 transition-colors flex items-center justify-between text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">{item.id}</span>
                                {isOverdue && (
                                  <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 font-bold uppercase rounded flex items-center gap-1">
                                    <AlertCircle size={10} /> Overdue
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-slate-800 block mt-1.5">{item.brand} {item.name}</span>
                              <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                <p className="font-medium text-slate-700">Holder: {item.assignedTo} ({item.department})</p>
                                <p className="text-slate-400">Assigned: {item.assignedDate} · Expected: {item.expectedReturnDate}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setCheckInOutAsset(item);
                                setCheckInOutMode('check-in');
                                setIsCheckInOutOpen(true);
                              }}
                              id={`btn-receive-shortcut-${item.id}`}
                              className="flex items-center gap-1.5 py-1.5 px-3 bg-teal-600 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors shadow-sm"
                            >
                              <span>Receive Stock</span>
                              <ArrowDownLeft size={13} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Assignment Logs Timeline view */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">Historical Handover Activity</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-150 text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-4 py-2">Action Timestamp</th>
                        <th className="px-4 py-2">Transaction</th>
                        <th className="px-4 py-2">Hardware Target</th>
                        <th className="px-4 py-2">Custodian Recipient</th>
                        <th className="px-4 py-2">Division</th>
                        <th className="px-4 py-2">Condition Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {assignmentLogs.map(log => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.date}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.action === 'check-out' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'
                            }`}>
                              {log.action === 'check-out' ? 'checked-out' : 'checked-in'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                            {log.assetId} · {log.assetName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{log.employeeName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">{log.department}</td>
                          <td className="px-4 py-3 text-slate-500 italic">"{log.notes}"</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: MAINTENANCE OVERVIEW CENTRE */}
          {activeTab === 'maintenance' && currentUser.pageEntry && (
            <div className="space-y-6">
              
              {/* Alert Header Cards on Maintenance warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Maintenance items currently logged offline */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <div className="pb-2 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-850">Currently Offline (Maintenance State)</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Devices flagged with active errors receiving diagnostic repairs.</p>
                    </div>
                    <span className="p-1 px-2 text-amber-700 bg-amber-50 rounded-full font-bold text-[10px]">
                      {inMaintenanceCount} Systems
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {assets.filter(a => a.status === 'maintenance').length === 0 ? (
                      <div className="p-10 text-center text-slate-400 text-xs">
                        <CheckCircle2 size={24} className="mx-auto text-green-500 opacity-60 mb-1" />
                        <span className="font-bold text-slate-800 block">All systems operating cleanly.</span>
                        <p className="text-[10px] text-slate-400">Zero active service/fault tickets are pending logged.</p>
                      </div>
                    ) : (
                      assets.filter(a => a.status === 'maintenance').map(item => (
                        <div key={item.id} className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl relative flex justify-between items-center text-xs">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100/50 px-2 py-0.5 rounded inline-block">{item.id}</span>
                            <span className="font-bold text-slate-800 block mt-1.5">{item.brand} {item.name}</span>
                            <p className="text-[10px] text-slate-500 mt-0.5 block">{item.location} · Spec: {item.model}</p>
                            <p className="text-[10px] text-amber-700 italic mt-1 font-light leading-snug">🔧 "{item.notes}"</p>
                          </div>
                          <button
                            onClick={() => {
                              setMaintenanceAsset(item);
                              setIsMaintenanceOpen(true);
                            }}
                            id={`btn-maintenance-resolved-${item.id}`}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-600 hover:bg-slate-900 border text-white font-semibold rounded-lg transition-colors shadow-sm hover:border-slate-850 cursor-pointer text-xs"
                          >
                            <span>Resolve Action</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Overdue Next Maintenance Dates Schedule warnings */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <div className="pb-2 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-850">Scheduled Inspection Alarms</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">In-service hardware exceeding routine diagnostic targets.</p>
                    </div>
                    <span className="p-1 px-2 text-red-700 bg-red-50 rounded-full font-bold text-[10px]">
                      {assets.filter(a => a.status !== 'retired' && a.nextMaintenanceDate && a.nextMaintenanceDate < BASELINE_DATE).length} Alarms
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {assets.filter(a => a.status !== 'retired' && a.nextMaintenanceDate && a.nextMaintenanceDate < BASELINE_DATE).length === 0 ? (
                      <div className="p-10 text-center text-slate-400 text-xs">
                        <CheckCircle2 size={24} className="mx-auto text-blue-500 opacity-60 mb-1" />
                        <span className="font-bold text-slate-800 block">Support inspection cadences secured.</span>
                        <p className="text-[10px] text-slate-400">Next scheduled maintenance dates lie in valid futures.</p>
                      </div>
                    ) : (
                      assets.filter(a => a.status !== 'retired' && a.nextMaintenanceDate && a.nextMaintenanceDate < BASELINE_DATE).map(item => (
                        <div key={item.id} className="p-3 bg-red-50/50 border border-red-200/60 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-red-800 bg-red-100/50 px-2 py-0.5 rounded inline-block">{item.id}</span>
                              <span className="text-[9px] text-red-700 font-bold uppercase block">Inspection Overdue</span>
                            </div>
                            <span className="font-bold text-slate-800 block mt-1.5">{item.brand} {item.name}</span>
                            <div className="text-[10px] text-slate-500 mt-1">
                              <p className="text-slate-400">Current status: <span className="font-bold uppercase text-slate-700">{item.status}</span></p>
                              <p className="text-slate-400">Overdue From: <span className="font-mono font-bold text-red-600">{item.nextMaintenanceDate}</span></p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setMaintenanceAsset(item);
                              setIsMaintenanceOpen(true);
                            }}
                            id={`btn-maintenance-log-${item.id}`}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-900 text-white font-semibold rounded-lg transition-colors shadow-sm hover:bg-blue-600 text-xs cursor-pointer"
                          >
                            <span>Inspect Now</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Maintenance records ledger */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">Physical Service Diagnostic Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200/80 text-left text-xs">
                    <thead>
                      <tr className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-4 py-2">Service Date</th>
                        <th className="px-4 py-2">Asset target</th>
                        <th className="px-4 py-2">Service scope</th>
                        <th className="px-4 py-2">Performer Contact / Vendor</th>
                        <th className="px-4 py-2">Diagnostics notes</th>
                        <th className="px-4 py-2 text-right">Expense Cost</th>
                        <th className="px-4 py-2 text-center">Post-Service State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {maintenanceRecords.map(rec => (
                        <tr key={rec.id}>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">{rec.date}</td>
                          <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{rec.assetId} · {rec.assetName}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="py-0.5 px-2 bg-slate-100 text-slate-700 rounded-full font-semibold capitalize text-[10px]">
                              {rec.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{rec.performer}</td>
                          <td className="px-4 py-3 text-slate-500 italic max-w-xs overflow-hidden text-ellipsis">"{rec.details}"</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">₹{rec.cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`inline-block py-0.5 px-2 rounded-full font-bold text-[10px] uppercase ${
                              rec.outcome === 'resolved' ? 'bg-green-50 text-green-700' :
                              rec.outcome === 'escalated' ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {rec.outcome}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: AUDIT, COMPLIANCE & MULTIPLE EXPORT FORMATS */}
          {activeTab === 'audit' && currentUser.pageReports && (
            <div className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Inventory Auditing & Spreadsheet Generation Export Suite</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Acquire physical inventory archives formatted strictly for streamlined compliance auditing. Reports feature dynamic valuation models, asset check-out history, and complete serial/OS parameters.
                  </p>
                </div>

                {/* Sub-Card Component Injection */}
                {currentUser.canExportReports !== false || currentUser.isRootAdmin ? (
                  <ExportSection 
                    assets={assets} 
                    assignmentLogs={assignmentLogs} 
                    auditLogs={auditLogs} 
                  />
                ) : (
                  <div className="p-6 bg-red-50/50 border border-dashed border-red-200 rounded-xl text-center space-y-2">
                    <ShieldAlert className="mx-auto text-red-500 h-8 w-8 animate-pulse" />
                    <h4 className="text-xs font-bold text-red-950 uppercase tracking-widest">Reports Export Restrictions Active</h4>
                    <p className="text-[11px] text-red-700 max-w-lg mx-auto leading-relaxed">
                      Your current operator account security criteria restricts the exporting or generation of database spreadsheets. Please request an Administrative policy update to authorize xlsx/csv exports.
                    </p>
                  </div>
                )}
              </div>


              {/* Secure audit ledger logs */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">System Operator Secure Events Ledger</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Chronological activities feed mapped under compliance protocols.</p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded font-bold uppercase">
                    Operator: {currentUser.email}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-150 text-left text-xs">
                    <thead>
                      <tr className="text-slate-405 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-4 py-2">UTC Timestamp</th>
                        <th className="px-4 py-2">Event Reference</th>
                        <th className="px-4 py-2">Action logs details</th>
                        <th className="px-4 py-2">Operator Authority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650 text-slate-600">
                      {auditLogs.map(log => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toISOString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800 uppercase block">{log.action}</span>
                            <span className="font-mono text-[9px] text-slate-400 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">{log.id}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-550">{log.details}</td>
                          <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{log.user}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-6xl mx-auto px-4 py-6 font-sans">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    ⚙️ Corporate Settings & Governance Console
                  </h1>
                  <p className="text-xs text-slate-500 font-sans mt-1">Configure global dropdown categories, operator permission directories, and email SMTP notification parameters</p>
                </div>
                
                {/* Horizontal Navigation within Settings */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0 select-none">
                  <button
                    onClick={() => setSettingsSubTab('general')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      settingsSubTab === 'general'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-100 dark:hover:text-slate-800 hover:text-slate-800'
                    }`}
                  >
                    📂 Dynamic Registry Rules
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('access')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      settingsSubTab === 'access'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    🔒 Access Control
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('email')}
                    className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      settingsSubTab === 'email'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    📬 Email Alert Rules
                  </button>
                </div>
              </div>

              {/* Sub-tab 1: Registry Custom Options */}
              {settingsSubTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Category Management */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">🏷️ Device Classifications</h3>
                      <span className="font-mono text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-black">
                        {dropdownCategories.length} Options
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                      Modify registered physical hardware classifications. Dynamic rules automatically allocate custom identification prefixes (e.g., Laptop gets <strong>L-</strong>, Firewalls get <strong>F-</strong>, Scanners get <strong>SC-</strong>).
                    </p>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (settingsNewCategory.trim()) {
                        handleAddOption('category', settingsNewCategory.trim());
                        setSettingsNewCategory('');
                      }
                    }} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Switch, Firewall, Scanner, Router..."
                        value={settingsNewCategory}
                        onChange={(e) => setSettingsNewCategory(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                      />
                      <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
                        Add Type
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {dropdownCategories.map(cat => (
                        <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium">
                          <span className="capitalize">{cat}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption('category', cat)}
                            className="text-slate-400 hover:text-red-500 transition-colors text-[10px] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Unit details Management */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">🏢 Unit details</h3>
                      <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black">
                        {dropdownCompanies.length} Units
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                      Manage registered corporate labels and subsidiaries. These partition inventory views inside the central asset control matrix.
                    </p>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (settingsNewCompany.trim()) {
                        handleAddOption('company', settingsNewCompany.trim());
                        setSettingsNewCompany('');
                      }
                    }} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Weyland Corp, Primero Inc..."
                        value={settingsNewCompany}
                        onChange={(e) => setSettingsNewCompany(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                      />
                      <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
                        Add Company
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {dropdownCompanies.map(comp => (
                        <span key={comp} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium font-sans">
                          <span>{comp}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption('company', comp)}
                            className="text-slate-400 hover:text-red-650 hover:text-red-600 transition-colors text-[10px] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Departments Customization */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">🏢 Registered Departments</h3>
                      <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black">
                        {dropdownDepartments.length} Nodes
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                      Custom department structures assigned as technical owners during hardware tracking check-outs and transfers.
                    </p>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (settingsNewDept.trim()) {
                        handleAddOption('department', settingsNewDept.trim());
                        setSettingsNewDept('');
                      }
                    }} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Logistics, Cyber-Defense, R&D..."
                        value={settingsNewDept}
                        onChange={(e) => setSettingsNewDept(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                      />
                      <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
                        Add Dept
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {dropdownDepartments.map(dep => (
                        <span key={dep} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium">
                          <span>{dep}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption('department', dep)}
                            className="text-slate-400 hover:text-red-650 hover:text-red-600 transition-colors text-[10px] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Maintenance Cadences */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">📅 Maintenance Intervals</h3>
                      <span className="font-mono text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-black">
                        {dropdownCadences.length} Cycles
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                      Time intervals representing preventative technical reviews. Critical devices alert audit controllers when deadlines fail validation.
                    </p>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (settingsNewCadence.trim()) {
                        handleAddOption('cadence', settingsNewCadence.trim());
                        setSettingsNewCadence('');
                      }
                    }} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Weekly, Semi-Annually..."
                        value={settingsNewCadence}
                        onChange={(e) => setSettingsNewCadence(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                      />
                      <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
                        Add Cycle
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {dropdownCadences.map(cad => (
                        <span key={cad} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium">
                          <span>{cad}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption('cadence', cad)}
                            className="text-slate-400 hover:text-red-650 hover:text-red-600 transition-colors text-[10px] font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Sub-tab 2: Access Control Form */}
              {settingsSubTab === 'access' && (
                <div id="access-control-pane-top" className="space-y-6">
                  {/* Select Operator Header Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-855 text-slate-800 flex items-center gap-2">
                        <span>👤</span> Select Operator Profile
                      </h3>
                      <p className="text-[11px] text-slate-500 font-sans">Choose which registered team member profile to modify security clearance flags for.</p>
                    </div>
                    <div className="relative min-w-[240px]">
                      <select
                        value={accessSelectedEmail}
                        onChange={(e) => setAccessSelectedEmail(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl shadow-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-colors cursor-pointer"
                      >
                        {users.map(u => (
                          <option key={u.email} value={u.email}>
                            {u.name} ({u.role.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <form onSubmit={handleAccessControlSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* PAGE ACCESS card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">🔑 Application View Rights</h4>
                            <p className="text-[10px] text-slate-405 text-slate-505 text-slate-500 font-sans">Enable or disable active view routes and tabs for this operator profile.</p>
                          </div>
                          <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-mono font-black">
                            PAGE LEVEL
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          
                          {/* MASTER */}
                          <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all select-none ${
                            chkMaster
                              ? 'bg-blue-50/40 border-blue-200 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={chkMaster}
                              onChange={(e) => setChkMaster(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-extrabold block text-slate-800">MASTER</span>
                              <span className="text-[10px] text-slate-500 block leading-normal font-sans pt-0.5">System dashboard and master digital inventory access.</span>
                            </div>
                          </label>

                          {/* SCAN */}
                          <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all select-none ${
                            chkScan
                              ? 'bg-blue-50/40 border-blue-200 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={chkScan}
                              onChange={(e) => setChkScan(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-extrabold block text-slate-800">SCAN</span>
                              <span className="text-[10px] text-slate-500 block leading-normal font-sans pt-0.5">Barcode/camera scanner capture and automatic inputs.</span>
                            </div>
                          </label>

                          {/* CONVERSION */}
                          <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all select-none ${
                            chkConversion
                              ? 'bg-blue-50/40 border-blue-200 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={chkConversion}
                              onChange={(e) => setChkConversion(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-extrabold block text-slate-800">CONVERSION</span>
                              <span className="text-[10px] text-slate-500 block leading-normal font-sans pt-0.5">Permits data schema exports and code conversions.</span>
                            </div>
                          </label>

                        </div>
                      </div>

                      {/* UNIT ACCESS card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">🏢 Unit details</h4>
                            <p className="text-[10px] text-slate-500 font-sans">Restrict hardware access to authorized organizational unit details.</p>
                          </div>
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-mono font-black">
                            DATA SCOPING
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          
                          {/* ASTRA TEC */}
                          <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all select-none ${
                            chkUnitAstra
                              ? 'bg-emerald-50/30 border-emerald-300 text-emerald-950 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={chkUnitAstra}
                              onChange={(e) => setChkUnitAstra(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-extrabold block text-slate-850">ASTRA TEC</span>
                              <span className="text-[10px] text-slate-500 block leading-normal font-sans pt-0.5">Astra Technology system hardware and databases.</span>
                            </div>
                          </label>

                          {/* PEL */}
                          <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all select-none ${
                            chkUnitPel
                              ? 'bg-emerald-50/30 border-emerald-300 text-emerald-950 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={chkUnitPel}
                              onChange={(e) => setChkUnitPel(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-extrabold block text-slate-850">PEL</span>
                              <span className="text-[10px] text-slate-500 block leading-normal font-sans pt-0.5">PEL (Patel Engineering Limited) resources.</span>
                            </div>
                          </label>

                        </div>
                      </div>

                      {/* OPERATOR STATUS & SAFETY POLICIES card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 lg:col-span-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">🛡️ Account Status & Safety Guidelines</h4>
                            <p className="text-[10px] text-slate-500 font-sans">Enforce profile lockouts, asset modification policies, and dynamic visual export permissions.</p>
                          </div>
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-mono font-black border border-amber-250">
                            SAFETY POLICIES
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          
                          {/* CURRENT ACCOUNT LOCK STATUS */}
                          <label className={`flex items-start gap-4 p-3 border rounded-xl cursor-pointer transition-all select-none ${
                            chkIsLocked
                              ? 'bg-rose-50/40 border-rose-200 text-rose-950 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={chkIsLocked}
                              onChange={(e) => setChkIsLocked(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-extrabold block text-slate-800 flex items-center gap-1">
                                🔒 Account Locked
                              </span>
                              <span className="text-[10px] text-slate-500 block leading-normal font-sans pt-0.5">
                                Block logins for this profile. Reset checkbox/uncheck to unlock operator profile and clear consecutive failure count.
                              </span>
                            </div>
                          </label>

                          {/* CAN MODIFY ASSETS */}
                          <label className={`flex items-start gap-4 p-3 border rounded-xl cursor-pointer transition-all select-none ${
                            chkCanModifyAssets
                              ? 'bg-blue-50/30 border-blue-200 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={chkCanModifyAssets}
                              onChange={(e) => setChkCanModifyAssets(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-extrabold block text-slate-800">✍️ Modify Records</span>
                              <span className="text-[10px] text-slate-500 block leading-normal font-sans pt-0.5">
                                Allows deploying, modifying specs, and deleting system assets. Restrictions enforce read-only checkouts.
                              </span>
                            </div>
                          </label>

                          {/* CAN EXPORT REPORTS */}
                          <label className={`flex items-start gap-4 p-3 border rounded-xl cursor-pointer transition-all select-none ${
                            chkCanExportReports
                              ? 'bg-blue-50/30 border-blue-200 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={chkCanExportReports}
                              onChange={(e) => setChkCanExportReports(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-extrabold block text-slate-800">📥 Export CSV Audits</span>
                              <span className="text-[10px] text-slate-500 block leading-normal font-sans pt-0.5">
                                Allows compiling and exporting PDF, CSV, or raw logs from databases. Security prevents information leaks.
                              </span>
                            </div>
                          </label>

                        </div>
                      </div>

                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <button
                        type="button"
                        onClick={handleAccessControlCancel}
                        className="px-5 py-2 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        Reset Changes
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        Apply Access Policy
                      </button>
                    </div>
                  </form>

                  {/* Restructured Advanced Information Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2.5 font-sans">
                      🔒 Operator Permission Matrix Policy Governance
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-600">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1">📖 Page Master Access Control Rules:</div>
                        <p className="text-slate-500 leading-normal text-[11px] font-sans">De-selecting the Page Master privilege restricts this operator from navigating into standard master lists, metrics registries, and hardware directory routes dynamically.</p>
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1">🏢 Unit details Access Policy:</div>
                        <p className="text-slate-500 leading-normal text-[11px] font-sans">Unit details access policies apply instantly. Inactive checkmarks suppress hardware listings and block all check-out operations for restricted legal organizational units.</p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-indigo-50/80 border border-indigo-100/70 rounded-xl text-indigo-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-medium">
                      <div className="leading-normal text-[11px] font-sans">
                        💡 <strong>Simulated Live Previews</strong>: Switch user context instantly to test how the newly saved policies partition directories and restrict user forms on the dashboard!
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const found = users.find(u => u.email === accessSelectedEmail);
                          if (found) {
                            setCurrentUser(found);
                            triggerToast(`Switched virtual operator session to "${found.name}" successfully!`, 'success');
                          }
                        }}
                        className="self-end sm:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition-all shrink-0 uppercase tracking-wider cursor-pointer font-sans"
                      >
                        Quick Switch Operator
                      </button>
                    </div>
                  </div>

                  {/* Operator Account Custom Authorization Registrations Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                    
                    {/* User Register Form */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-5 lg:col-span-1 font-sans">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <span>👤</span> Configure Virtual Operator
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Register new logins with checkboxes to simulate dynamic permission scopes.</p>
                      </div>

                      {currentUser.role !== 'admin' && !currentUser.isRootAdmin ? (
                        <div className="p-4 bg-amber-50/50 border border-amber-201 rounded-xl text-[11px] text-amber-700 font-medium">
                          🔒 Only <strong>Administrative</strong> operators can configure new user directories and authorization scopes.
                        </div>
                      ) : (
                        <form onSubmit={handleRegisterUser} className="space-y-4 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">
                              Operator Name
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Anand"
                              value={registerName}
                              onChange={(e) => setRegisterName(e.target.value)}
                              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">
                              Secure Email / Login Identifier
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="e.g. anand@astra-tec.com"
                              value={registerEmail}
                              onChange={(e) => setRegisterEmail(e.target.value)}
                              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-505 font-semibold"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">
                              Role / Rights (Check Box Type)
                            </label>
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                              {[
                                { id: 'root', label: '👑 Root User', desc: 'Overriding system owner with complete bypass capabilities' },
                                { id: 'admin', label: '🟩 Admin', desc: 'Full application & dynamic configs' },
                                { id: 'manager', label: '🟨 Manager', desc: 'Resource checks & standard transfer workflows' },
                                { id: 'viewer', label: '🟦 Viewer', desc: 'General observation & reports review' },
                                { id: 'manager_viewer', label: '🟪 Manager Viewer', desc: 'Resource check-outs + full visual reporting list' }
                              ].map(r => (
                                <label
                                  key={r.id}
                                  className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all select-none ${
                                    registerRole === r.id
                                      ? 'bg-indigo-50/40 border-indigo-200 text-indigo-950 shadow-2xs'
                                      : 'bg-white border-slate-150 hover:bg-slate-50/55 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={registerRole === r.id}
                                    onChange={() => setRegisterRole(r.id as any)}
                                    className="mt-0.5 w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <div>
                                    <span className="text-[11px] font-bold block">{r.label}</span>
                                    <span className="text-[9px] text-slate-400 block leading-tight">{r.desc}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-sans">
                              Unit details (Check Box Type)
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {dropdownCompanies.map(comp => (
                                <label
                                  key={comp}
                                  className={`flex items-center gap-1.5 p-2 border rounded-xl cursor-pointer transition-all select-none ${
                                    registerCompanies.includes(comp)
                                      ? 'bg-emerald-50/40 border-emerald-250 text-emerald-950 shadow-2xs'
                                      : 'bg-white border-slate-150 hover:bg-slate-50 hover:text-slate-705'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={registerCompanies.includes(comp)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setRegisterCompanies(prev => [...prev, comp]);
                                      } else {
                                        setRegisterCompanies(prev => prev.filter(c => c !== comp));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold truncate">🏢 {comp}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                          >
                            ➕ Save Operator Directory Login
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Users List Grid Display */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm lg:col-span-2 space-y-4 font-sans">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Simulated Operator Directory</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Displays dynamically registered system profiles, company tenants scope, and security levels.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                          <thead>
                            <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                              <th className="px-3 py-2">Profile Name</th>
                              <th className="px-3 py-2">Identity Email</th>
                              <th className="px-3 py-2">Authorized Privilege</th>
                              <th className="px-3 py-2">Scope Entity</th>
                              {(currentUser.role === 'admin' || currentUser.isRootAdmin) && <th className="px-3 py-2 text-right">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600">
                            {users.map(u => (
                              <tr key={u.email} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{u.isRootAdmin || u.role === 'root' ? '👑' : '👤'} {u.name}</span>
                                    {u.isLocked && (
                                      <span className="text-[8px] bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded font-mono font-black animate-pulse" title="Locked profile">
                                        🔒 LOCKED
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  {u.email}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase ${
                                    u.isRootAdmin || u.role === 'root' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                    u.role === 'admin' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    u.role === 'manager' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    u.role === 'manager_viewer' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                    'bg-indigo-50 text-indigo-700 border border-indigo-150'
                                  }`}>
                                    {u.role === 'manager_viewer' ? 'Manager Viewer' : u.role}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-slate-500 font-bold truncate max-w-[150px]" title={u.company}>
                                  🏢 {u.company}
                                </td>
                                {(currentUser.role === 'admin' || currentUser.isRootAdmin) && (
                                  <td className="px-3 py-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                      {/* Edit button */}
                                      <button
                                        type="button"
                                        onClick={() => handleEditUser(u.email)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-650 hover:text-indigo-600 rounded-lg hover:bg-slate-150 transition-colors cursor-pointer"
                                        title="Edit profile & permissions"
                                      >
                                        <Edit size={13} />
                                      </button>

                                      {/* Lock/Unlock Toggle */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (u.isLocked) {
                                            handleUnlockUser(u.email);
                                          } else {
                                            handleLockUser(u.email);
                                          }
                                        }}
                                        disabled={u.email === 'saravananengineerit@gmail.com' || u.email === 'root.admin@company.com'}
                                        className={`p-1.5 rounded-lg hover:bg-slate-150 transition-colors ${
                                          u.email === 'saravananengineerit@gmail.com' || u.email === 'root.admin@company.com'
                                            ? 'opacity-30 cursor-not-allowed text-slate-300'
                                            : u.isLocked
                                              ? 'text-rose-600 hover:text-rose-800 cursor-pointer bg-rose-50'
                                              : 'text-slate-400 hover:text-slate-600 cursor-pointer'
                                        }`}
                                        title={
                                          u.email === 'saravananengineerit@gmail.com' || u.email === 'root.admin@company.com'
                                            ? 'Protected administrator account'
                                            : u.isLocked
                                              ? 'Unlock credential profile'
                                              : 'Lock credential profile'
                                        }
                                      >
                                        {u.isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                                      </button>

                                      {/* Delete button */}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveUser(u.email)}
                                        disabled={u.email === 'saravananengineerit@gmail.com' || u.email === 'root.admin@company.com'}
                                        className={`p-1.5 text-slate-400 hover:text-red-550 hover:text-red-650 rounded-lg hover:bg-slate-150 transition-colors ${
                                          u.email === 'saravananengineerit@gmail.com' || u.email === 'root.admin@company.com' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                                        }`}
                                        title={u.email === 'saravananengineerit@gmail.com' || u.email === 'root.admin@company.com' ? 'System administrator cannot be removed.' : 'Remove credentials'}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Sub-tab 3: Email Alerts Settings */}
              {settingsSubTab === 'email' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left grid - settings toggles */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2.5 border-b border-slate-100 flex items-center gap-2">
                      📬 Email Notifications Routing & Policies
                    </h2>
                    
                    <div className="space-y-4">
                      
                      {/* Global Enable */}
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="space-y-0.5 max-w-md">
                          <span className="text-xs font-bold text-slate-800 block">Enable Global Compliance Alerts</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">
                            Toggle all system automated notification emails. When checked, the server queues transactional summaries and dispatches alert streams to technical contacts.
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={emailAlertsEnabled}
                            onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Recipient Addresses */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Primary Alert Recipients</label>
                        <input
                          type="text"
                          value={alertRecipients}
                          onChange={(e) => setAlertRecipients(e.target.value)}
                          placeholder="e.g. compliance-office@astra-tec.com, admin@astra-tec.com"
                          className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-blue-500 font-medium"
                        />
                        <span className="text-[10px] text-slate-400 font-sans block">
                          Commas separate multiple technician recipient addresses. All alerts will copy these addresses.
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trigger Conditions</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-700 font-sans select-none">
                          <label className="flex items-start gap-2.5 p-3.5 border border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-colors rounded-xl">
                            <input
                              type="checkbox"
                              checked={alertOnCheckInOut}
                              onChange={(e) => setAlertOnCheckInOut(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block text-[11px]">Device Check-In / Check-Out</span>
                              <span className="text-[10px] text-slate-500 block leading-normal">Alert when laptops, scanners, or tablets switch active handlers.</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-2.5 p-3.5 border border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-colors rounded-xl">
                            <input
                              type="checkbox"
                              checked={alertOnTransfer}
                              onChange={(e) => setAlertOnTransfer(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block text-[11px]">Asset Ownership Transfers</span>
                              <span className="text-[10px] text-slate-500 block leading-normal">Dispatch notification when inventory moves between corporate tenants or legal owners.</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-2.5 p-3.5 border border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-colors rounded-xl">
                            <input
                              type="checkbox"
                              checked={alertOnMaintenance}
                              onChange={(e) => setAlertOnMaintenance(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block text-[11px]">Maintenance Alarming & Cadences</span>
                              <span className="text-[10px] text-slate-500 block leading-normal">Notify compliance managers before preventative maintenance cycles expire.</span>
                            </div>
                          </label>

                          <label className="flex items-start gap-2.5 p-3.5 border border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-colors rounded-xl">
                            <input
                              type="checkbox"
                              checked={alertOnDelete}
                              onChange={(e) => setAlertOnDelete(e.target.checked)}
                              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block text-[11px]">Hard Asset Purges / Deletion</span>
                              <span className="text-[10px] text-slate-500 block leading-normal">High-priority warning email when an asset record is permanently deleted.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right grid - mail server credentials info */}
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">🔩 Gateway Parameters</h3>
                      
                      <div className="space-y-3 font-sans text-xs">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 block">Outbound SMTP Server Relay</label>
                          <input
                            type="text"
                            value={emailSmtpServer}
                            onChange={(e) => setEmailSmtpServer(e.target.value)}
                            placeholder="e.g. smtp.office365.com:587"
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-blue-500 font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 block">System Sender Email Address</label>
                          <input
                            type="email"
                            value={emailSenderAddress}
                            onChange={(e) => setEmailSenderAddress(e.target.value)}
                            placeholder="alerts@astra-tec.com"
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-blue-500 font-mono"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSendTestEmail}
                            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer text-center select-none"
                          >
                            🚀 Send Diagnostics Test Email
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-[11px] leading-relaxed text-slate-500 space-y-2.5 font-sans">
                      <strong className="text-slate-700 block text-xs">💡 Dynamic Email Payload Engine</strong>
                      <p>
                        Our backend triggers simulated mail transmissions styled with high-contrast corporate colors. Triggered emails list hardware properties including Serial Numbers, Asset Identifiers (IDs with D/L/F/S/SC/P classifications), action dates, and operator audit footprints.
                      </p>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {activeTab === 'it-service-calls' && (
            <TicketCallSystem currentUser={currentUser} assets={assets} />
          )}

        </div>
      </div>

        {/* Quick Actions Footer */}
        <div className="h-12 bg-slate-100 border-t border-slate-200 px-8 flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider shrink-0 select-none">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Status: All Systems Operational
            </span>
            <span>Server Sync: {BASELINE_DATE}</span>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-blue-600 cursor-pointer">User Guide</span>
            <span className="hover:text-blue-650 hover:text-blue-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-blue-650 hover:text-blue-600 cursor-pointer">API Doc</span>
          </div>
        </div>

      </div>

      {/* REGISTER / EDIT ASSET FORM DIALOG */}
      <AssetFormModal
        isOpen={isAssetModalOpen}
        onClose={() => {
          setIsAssetModalOpen(false);
          setAssetToEdit(null);
        }}
        onSubmit={handleSaveAsset}
        assetToEdit={assetToEdit}
        existingAssets={assets}
        companies={dropdownCompanies}
        categories={dropdownCategories}
        departments={dropdownDepartments}
        cadences={dropdownCadences}
        onAddOption={handleAddOption}
        onRemoveOption={handleRemoveOption}
        currentUserRole={currentUser.role}
      />

      {/* CHECK-IN CHECK-OUT FLOW DIALOG */}
      <CheckInOutModal
        isOpen={isCheckInOutOpen}
        onClose={() => {
          setIsCheckInOutOpen(false);
          setCheckInOutAsset(null);
        }}
        asset={checkInOutAsset}
        mode={checkInOutMode}
        onSubmit={handleCheckInOutSubmit}
        departments={dropdownDepartments}
      />

      {/* COMPLETED MAINTENANCE REGULATION DIALOG */}
      <MaintenanceModal
        isOpen={isMaintenanceOpen}
        onClose={() => {
          setIsMaintenanceOpen(false);
          setMaintenanceAsset(null);
        }}
        asset={maintenanceAsset}
        onSubmit={handleMaintenanceSubmit}
      />

      {/* CORE ASSET TRANSFER FLOW DIALOG */}
      <AssetTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferAsset(null);
        }}
        asset={transferAsset}
        assetsList={assets}
        companies={dropdownCompanies}
        departments={dropdownDepartments}
        onSubmit={handleTransferSubmit}
      />

      {/* CONFIRM PERMANENT ASSET DELETION MODAL */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteAsset(null);
        }}
        asset={deleteAsset}
        onConfirm={handleConfirmDelete}
      />

    </div>
  );
}
