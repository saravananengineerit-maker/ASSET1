/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, AlertCircle, ChevronDown } from 'lucide-react';
import { Asset, DepartmentType } from '../types';

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  mode: 'check-out' | 'check-in';
  onSubmit: (
    assetId: string,
    action: 'check-out' | 'check-in',
    data: {
      employeeName: string;
      employeeEmail: string;
      department: DepartmentType;
      expectedReturnDate?: string;
      notes: string;
      transitionToMaintenance?: boolean;
    }
  ) => void;
  departments: string[]; // Received live options array
}

export default function CheckInOutModal({ isOpen, onClose, asset, mode, onSubmit, departments }: CheckInOutModalProps) {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('Engineering');
  const [expectedReturnDate, setExpectedReturnDate] = useState('2026-12-31');
  const [notes, setNotes] = useState('');
  const [transitionToMaintenance, setTransitionToMaintenance] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'check-out') {
        setEmployeeName('');
        setEmployeeEmail('');
        setDepartment(departments[0] || 'Engineering');
        setExpectedReturnDate('2026-12-31');
        setNotes('Assigned standard equipment key assignment.');
        setTransitionToMaintenance(false);
      } else {
        // Preset from current assignment
        setEmployeeName(asset?.assignedTo || '');
        setEmployeeEmail(asset?.assignedEmail || '');
        setDepartment(asset?.department || departments[0] || 'Engineering');
        setNotes('Returned equipment back to IT inventory depot.');
        setTransitionToMaintenance(false);
      }
      setError('');
    }
  }, [isOpen, mode, asset, departments]);

  if (!isOpen || !asset) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'check-out') {
      if (!employeeName.trim()) return setError('Custodian employee name is required.');
      if (!employeeEmail.trim() || !employeeEmail.includes('@')) {
        return setError('A valid company email is required for tracking notifications.');
      }
      if (!expectedReturnDate) return setError('Please input an expected return date.');
    }

    onSubmit(asset.id, mode, {
      employeeName: employeeName.trim(),
      employeeEmail: employeeEmail.trim().toLowerCase(),
      department,
      expectedReturnDate: mode === 'check-out' ? expectedReturnDate : undefined,
      notes: notes.trim(),
      transitionToMaintenance: mode === 'check-in' ? transitionToMaintenance : false
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${mode === 'check-out' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'}`}>
              {mode === 'check-out' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {mode === 'check-out' ? 'Process Check-Out Flow' : 'Check-In Asset Retract'}
              </h2>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{asset.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Info Block */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-[11px] grid grid-cols-2 gap-2 text-slate-600 font-medium">
          <div>
            <span className="text-slate-400 block uppercase text-[9px] tracking-wide">Hardware Name</span>
            <span className="text-slate-700 font-bold">{asset.brand} {asset.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase text-[9px] tracking-wide">Serial Code</span>
            <span className="font-mono text-slate-700">{asset.serialNumber}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-center gap-2 font-semibold">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'check-out' ? (
            /* CHECK-OUT CONTROLS */
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Custodian Employee Name</label>
                <input
                  type="text"
                  required
                  placeholder="Employee Full Name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Employee Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="employeename@company.com"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Recipient Department</label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                      className="w-full p-2.5 pr-10 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 appearance-none transition-all"
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Target Return Date</label>
                  <input
                    type="date"
                    required
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 font-sans"
                  />
                </div>
              </div>
            </>
          ) : (
            /* CHECK-IN CONTROLS */
            <>
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-teal-800">
                <span className="font-semibold block">Confirm Asset Receipt</span>
                <p className="text-[10px] text-teal-700/80 mt-0.5">
                  Assigned custody to <span className="font-bold">{asset.assignedTo} ({asset.department})</span> will be terminated.
                </p>
              </div>

              {/* Transition to Maintenance Flag */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-slate-800">Flag physical defect?</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Send device straight to active inspection list.</span>
                </div>
                <input
                  type="checkbox"
                  checked={transitionToMaintenance}
                  onChange={(e) => setTransitionToMaintenance(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Check-In/Out Transaction Notes</label>
            <textarea
              required
              rows={3}
              placeholder={mode === 'check-out' ? 'Remark details on handover condition or expected operations.' : 'Report physical status, completeness of accessories, or returning comments.'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500"
            ></textarea>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              id="btn-process-cancel"
              className="py-2 px-4 text-slate-600 bg-slate-50 hover:bg-slate-100 font-bold rounded-xl border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-process-submit"
              className={`py-2 px-5 font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 ${
                mode === 'check-out' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {mode === 'check-out' ? 'Assign Equipment' : 'Complete Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
