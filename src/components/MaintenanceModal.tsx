/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Wrench, AlertTriangle, CheckSquare, ChevronDown } from 'lucide-react';
import { Asset, MaintenanceRecord } from '../types';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSubmit: (
    assetId: string,
    record: Omit<MaintenanceRecord, 'id' | 'assetId' | 'assetName'>,
    nextMaintenanceDate: string | null
  ) => void;
}

export default function MaintenanceModal({ isOpen, onClose, asset, onSubmit }: MaintenanceModalProps) {
  const [date, setDate] = useState('2026-05-31');
  const [performer, setPerformer] = useState('');
  const [type, setType] = useState<MaintenanceRecord['type']>('routine');
  const [cost, setCost] = useState('');
  const [details, setDetails] = useState('');
  const [outcome, setOutcome] = useState<MaintenanceRecord['outcome']>('resolved');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && asset) {
      setDate('2026-05-31');
      setPerformer('Internal IT Diagnostics');
      setType('routine');
      setCost('0.00');
      setDetails('System hardware diagnostics and physical dust clean.');
      setOutcome('resolved');
      
      // Predict next inspection based on frequency
      const pDate = new Date();
      if (asset.maintenanceFrequency === 'monthly') pDate.setMonth(pDate.getMonth() + 1);
      else if (asset.maintenanceFrequency === 'quarterly') pDate.setMonth(pDate.getMonth() + 3);
      else if (asset.maintenanceFrequency === 'bi-annually') pDate.setMonth(pDate.getMonth() + 6);
      else if (asset.maintenanceFrequency === 'annually') pDate.setFullYear(pDate.getFullYear() + 1);
      else pDate.setMonth(pDate.getMonth() + 6); // default to 6m if none

      setNextMaintenanceDate(pDate.toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!performer.trim()) return setError('Performer name or vendor service contact is required.');
    if (!cost.trim() || isNaN(parseFloat(cost)) || parseFloat(cost) < 0) {
      return setError('Please key in a valid maintenance cost value (INR amount).');
    }
    if (!details.trim()) return setError('Please specify maintenance action work details.');

    onSubmit(asset.id, {
      date,
      performer: performer.trim(),
      type,
      cost: parseFloat(cost),
      details: details.trim(),
      outcome
    }, nextMaintenanceDate || null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Log Maintenance Action</h2>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{asset.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Device Information Summary */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-[11px] grid grid-cols-2 gap-2 text-slate-600 font-medium">
          <div>
            <span className="text-slate-400 block uppercase text-[8px] tracking-wide">Target Hardware</span>
            <span className="text-slate-700 font-bold">{asset.brand} {asset.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase text-[8px] tracking-wide">Current Status</span>
            <span className="font-semibold text-amber-600 capitalize">{asset.status}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-center gap-2 font-semibold">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Service Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Maintenance Genre</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MaintenanceRecord['type'])}
                  className="w-full p-2.5 pr-10 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 appearance-none transition-all animate-none"
                >
                  <option value="routine">Routine Check / Tune Up</option>
                  <option value="repair">Hardware Repair / Part Swap</option>
                  <option value="upgrade">Hardware Upgrade (RAM/SSD)</option>
                  <option value="calibration">System Calibration / OS</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Service Performed By</label>
              <input
                type="text"
                required
                placeholder="e.g. HP Support Team, IT Desk"
                value={performer}
                onChange={(e) => setPerformer(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Maintenance Expense (INR)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-mono focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Service Diagnostics & Details</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Cleaned fan vents, re-applied thermal CPU paste, updated main firmware security build."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Asset Operational State</label>
              <div className="relative">
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as MaintenanceRecord['outcome'])}
                  className="w-full p-2.5 pr-10 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 appearance-none transition-all animate-none"
                >
                  <option value="resolved">🟢 Resolved (Back to Service / Depot)</option>
                  <option value="escalated">🟡 Escalated (Kept in Maintenance)</option>
                  <option value="retired">🔴 Retired / Scrap Asset</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Next Inspections Date</label>
              <input
                type="date"
                value={nextMaintenanceDate}
                onChange={(e) => setNextMaintenanceDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              id="btn-m-cancel"
              className="py-2 px-4 text-slate-600 bg-slate-50 hover:bg-slate-100 font-bold rounded-xl border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-m-submit"
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckSquare size={14} />
              Commit Maintenance Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
