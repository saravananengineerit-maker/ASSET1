/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, FileText, Printer, CheckCircle } from 'lucide-react';
import { Asset, AssignmentLog, AuditLog } from '../types';

interface ExportSectionProps {
  assets: Asset[];
  assignmentLogs: AssignmentLog[];
  auditLogs: AuditLog[];
}

export default function ExportSection({ assets, assignmentLogs, auditLogs }: ExportSectionProps) {
  
  // Helper to escape CSV strings
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    const escaped = str.replace(/"/g, '""');
    return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
      ? `"${escaped}"`
      : escaped;
  };

  // 1. Export Assets to CSV
  const handleExportCSV = () => {
    const headers = [
      'Asset ID', 'Name', 'Type', 'Brand', 'Model', 'Serial Number', 'Operating System',
      'Status', 'Department', 'Location', 'Purchase Cost', 'Purchase Date',
      'Assigned To', 'Assigned Email', 'Expected Return Date', 'Next Maintenance'
    ];

    const rows = assets.map(asset => [
      asset.id,
      asset.name,
      asset.type.toUpperCase(),
      asset.brand,
      asset.model,
      asset.serialNumber,
      asset.os,
      asset.status.toUpperCase(),
      asset.department,
      asset.location,
      '₹' + asset.purchaseCost.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      asset.purchaseDate,
      asset.assignedTo || 'Unassigned',
      asset.assignedEmail || 'N/A',
      asset.expectedReturnDate || 'N/A',
      asset.nextMaintenanceDate || 'N/A'
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(escapeCSV).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Asset_Inventory_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export Assets to Excel (Tab-delimited spreadsheet XML/TSV format which opens with perfect encoding in MS Excel)
  const handleExportExcel = () => {
    const headers = [
      'Asset ID', 'Asset Name', 'Item Type', 'Brand', 'Model Number', 'Serial Code', 
      'OS/Firmware', 'Current Status', 'Department', 'Office Location', 'Cost (INR)', 
      'Acquisition Date', 'Custodian Name', 'Custodian Email', 'Return Due Date', 'Next Maintenance Schedule'
    ];

    const rows = assets.map(asset => [
      asset.id,
      asset.name,
      asset.type,
      asset.brand,
      asset.model,
      asset.serialNumber,
      asset.os,
      asset.status,
      asset.department,
      asset.location,
      asset.purchaseCost,
      asset.purchaseDate,
      asset.assignedTo || 'Unassigned',
      asset.assignedEmail || 'N/A',
      asset.expectedReturnDate || 'N/A',
      asset.nextMaintenanceDate || 'N/A'
    ]);

    // Build tab-separated content with Excel support
    const spreadsheetContent = [headers, ...rows]
      .map(row => row.map(cell => String(cell).replace(/\t/g, ' ')).join('\t'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + spreadsheetContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Asset_Inventory_Spreadsheet_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export Assignment History CSV
  const handleExportHistoryCSV = () => {
    const headers = ['Log ID', 'Asset ID', 'Asset Name', 'Asset Type', 'Action', 'Employee Name', 'Email', 'Department', 'Timestamp', 'Check-In/Out Notes'];
    const rows = assignmentLogs.map(log => [
      log.id,
      log.assetId,
      log.assetName,
      log.assetType.toUpperCase(),
      log.action.toUpperCase(),
      log.employeeName,
      log.employeeEmail,
      log.department,
      log.date,
      log.notes
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(escapeCSV).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Asset_Assignment_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Trigger Web Print / Save as PDF Layout
  const triggerPrint = () => {
    window.print();
  };

  const totalCost = assets.reduce((sum, item) => sum + item.purchaseCost, 0);

  return (
    <div id="export-section" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Inventory Export Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Download size={20} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Inventory Audits</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Export the complete registry of {assets.length} items with deep attributes, cost history, allocations, and serial codes.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportCSV}
            id="btn-export-csv"
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors"
          >
            <FileText size={14} className="text-slate-500" />
            CSV Format
          </button>
          <button
            onClick={handleExportExcel}
            id="btn-export-excel"
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Download size={14} />
            Excel XLS
          </button>
        </div>
      </div>

      {/* Assignment Log Export Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-4">
            <FileText size={20} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Assignment History Logs</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Export chronological audit trails of check-ins and check-outs detailing employees, target dates, and device conditions.
          </p>
        </div>
        <button
          onClick={handleExportHistoryCSV}
          id="btn-export-history"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-xl border border-teal-100 transition-colors"
        >
          <Download size={14} />
          Export Historical CSV ({assignmentLogs.length} entries)
        </button>
      </div>

      {/* PDF / Print Generator */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <Printer size={20} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Printable PDF Summary</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Generate and print a polished, high-contrast, structured hardware report including total valuation and state summary ideal for physical audits.
          </p>
        </div>
        <button
          onClick={triggerPrint}
          id="btn-trigger-print"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-md"
        >
          <Printer size={14} />
          Print / Save PDF Report
        </button>
      </div>

      {/* Printable Report View (Invisible on UI, only shown when print stylesheet triggers) */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 overflow-y-auto print-only z-50">
        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900 border-l-4 border-indigo-600 pl-3">
                Corporate Asset Registry Audit
              </h1>
              <p className="text-xs text-slate-500 mt-1">Generated electronically on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono py-1 px-2.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-full font-bold">
                AUDIT SYSTEM SECURE
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary List */}
        <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="border border-slate-200 rounded-lg p-3">
            <span className="text-xs text-slate-400 block uppercase">Total Registered Items</span>
            <span className="text-lg font-bold text-slate-800">{assets.length} Assets</span>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <span className="text-xs text-slate-400 block uppercase">Total Asset Valuation</span>
            <span className="text-lg font-bold text-slate-800">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <span className="text-xs text-slate-400 block uppercase">In-Service / Checked-Out</span>
            <span className="text-lg font-bold text-slate-800">{assets.filter(a => a.status === 'checked-out').length} Assets</span>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <span className="text-xs text-slate-400 block uppercase">Maintenance / Warning</span>
            <span className="text-lg font-bold text-slate-800">{assets.filter(a => a.status === 'maintenance').length} Assets</span>
          </div>
        </div>

        {/* Master Registry Table */}
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">I. Hardware Registry List</h2>
        <table className="min-w-full divide-y divide-slate-200 border border-slate-200 text-left text-[10px] mb-8">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">ID</th>
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Asset Name & Details</th>
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Category</th>
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Serial Code</th>
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Department</th>
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Office Location</th>
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Status</th>
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Holder Name</th>
              <th className="px-2.5 py-1.5 font-bold uppercase text-slate-700-right text-slate-700 border-b border-slate-200">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assets.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-2.5 py-1.5 font-mono font-bold text-slate-900 whitespace-nowrap">{item.id}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">
                  <div className="font-semibold text-slate-800">{item.brand} {item.name}</div>
                  <div className="text-[9px] text-slate-400 font-mono italic">{item.os || 'No Config OS'}</div>
                </td>
                <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap uppercase">{item.type}</td>
                <td className="px-2.5 py-1.5 font-mono text-slate-500 whitespace-nowrap">{item.serialNumber}</td>
                <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">{item.department}</td>
                <td className="px-2.5 py-1.5 text-slate-500">{item.location}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                    item.status === 'available' ? 'bg-green-100 text-green-800' :
                    item.status === 'checked-out' ? 'bg-indigo-100 text-indigo-800' :
                    item.status === 'maintenance' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 text-slate-800 whitespace-nowrap">{item.assignedTo || 'Unassigned'}</td>
                <td className="px-2.5 py-1.5 text-right font-mono text-slate-900 whitespace-nowrap font-semibold">₹{item.purchaseCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Audit Logs Trail Table */}
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">II. Recent Audit Activities Trail</h2>
        <table className="min-w-full divide-y divide-slate-200 border border-slate-200 text-left text-[9px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Timestamp</th>
              <th className="px-2 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Log Action</th>
              <th className="px-2 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Event Details</th>
              <th className="px-2 py-1.5 font-bold uppercase text-slate-700 border-b border-slate-200">Operator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.slice(0, 10).map(log => (
              <tr key={log.id}>
                <td className="px-2 py-1.5 font-mono text-slate-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-2 py-1.5 font-bold text-slate-800 whitespace-nowrap uppercase">{log.action}</td>
                <td className="px-2 py-1.5 text-slate-600">{log.details}</td>
                <td className="px-2 py-1.5 font-mono text-slate-500 whitespace-nowrap">{log.user}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 border-t border-slate-100 pt-4 flex justify-between text-[9px] text-slate-400">
          <span>Company Asset Suite Electronic PDF Manifest</span>
          <span>End of Generated Document</span>
        </div>
      </div>
    </div>
  );
}
