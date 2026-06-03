/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Check, AlertCircle, ChevronDown, Building2, MapPin, User, FileText } from 'lucide-react';
import { Asset, DepartmentType } from '../types';

interface AssetTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  assetsList: Asset[]; // To allow selecting an asset if none is passed
  companies: string[];
  departments: string[];
  onSubmit: (
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
  ) => void;
}

export default function AssetTransferModal({
  isOpen,
  onClose,
  asset,
  assetsList,
  companies,
  departments,
  onSubmit
}: AssetTransferModalProps) {
  // Mode selection: preset asset or dynamic selection
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

  // Form states
  const [toCompany, setToCompany] = useState<string>('');
  const [toDepartment, setToDepartment] = useState<string>('');
  const [toLocation, setToLocation] = useState<string>('');
  const [updateCustodian, setUpdateCustodian] = useState<boolean>(false);
  const [toCustodianName, setToCustodianName] = useState<string>('');
  const [toCustodianEmail, setToCustodianEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Sync active asset when selection or prop changes
  useEffect(() => {
    if (asset) {
      setActiveAsset(asset);
      setSelectedAssetId(asset.id);
    } else if (isOpen && assetsList.length > 0) {
      // Find the first non-retired asset if none is provided
      const firstActive = assetsList.filter(a => a.status !== 'retired')[0];
      if (firstActive) {
        setActiveAsset(firstActive);
        setSelectedAssetId(firstActive.id);
      }
    }
  }, [isOpen, asset, assetsList]);

  // Sync destination forms with current values of selected asset
  useEffect(() => {
    if (activeAsset) {
      setToCompany(activeAsset.company || 'ASTRA TEC');
      setToDepartment(activeAsset.department || 'IT');
      setToLocation(activeAsset.location || '');
      setToCustodianName(activeAsset.assignedTo || '');
      setToCustodianEmail(activeAsset.assignedEmail || '');
      setNotes(`Internal asset transfer transaction for ${activeAsset.id}.`);
      setUpdateCustodian(false);
      setError('');
    }
  }, [activeAsset]);

  // Handle manual dropdown selection of asset
  const handleAssetSelectChange = (id: string) => {
    setSelectedAssetId(id);
    const found = assetsList.find(a => a.id === id);
    if (found) {
      setActiveAsset(found);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!activeAsset) {
      setError('Please select an asset to transfer.');
      return;
    }

    if (!toCompany) {
      setError('Destination company/entity is required.');
      return;
    }

    if (!toDepartment) {
      setError('Destination department is required.');
      return;
    }

    if (!toLocation.trim()) {
      setError('Destination location description is required.');
      return;
    }

    if (updateCustodian) {
      if (toCustodianName.trim() && !toCustodianEmail.trim()) {
        setError('If specifying a new custodian name, a valid email registration is required.');
        return;
      }
      if (toCustodianEmail.trim() && !toCustodianEmail.includes('@')) {
        setError('Please enter a valid company custodian email address.');
        return;
      }
    }

    if (!notes.trim()) {
      setError('Please provide comments or authorization keys for the audit ledger trail.');
      return;
    }

    onSubmit(activeAsset.id, {
      toCompany,
      toDepartment: toDepartment as DepartmentType,
      toLocation: toLocation.trim(),
      updateCustodian,
      toCustodianName: updateCustodian ? (toCustodianName.trim() || null) : activeAsset.assignedTo,
      toCustodianEmail: updateCustodian ? (toCustodianEmail.trim().toLowerCase() || null) : activeAsset.assignedEmail,
      notes: notes.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center select-none">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white p-1.5 rounded-lg">
              <ArrowLeftRight size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Inter-Company & Departmental Transfer Center</h2>
              <p className="text-[10px] text-slate-300 font-medium">Re-route physical custody and ownership across authorized company nodes</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans text-slate-700">
          
          {error && (
            <div className="p-3 bg-red-55 text-red-800 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 font-semibold">
              <AlertCircle size={15} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* ASSET SELECTOR PANEL */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Selected Asset To Transfer
            </label>
            
            {asset ? (
              // Read-only locked asset preselected
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                    {activeAsset?.id}
                  </span>
                  <div className="font-bold text-slate-800 mt-1.5 text-sm">
                    {activeAsset?.brand} {activeAsset?.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Model: {activeAsset?.model} · S/N: {activeAsset?.serialNumber}
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <span className="text-slate-405 text-slate-400 block uppercase font-bold text-[9px] tracking-wide">Owner Entity</span>
                  <span className="font-extrabold text-indigo-700">{activeAsset?.company || 'ASTRA TEC'}</span>
                </div>
              </div>
            ) : (
              // Choose asset from dropdown list
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedAssetId}
                    onChange={(e) => handleAssetSelectChange(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 appearance-none transition-all cursor-pointer"
                  >
                    <option value="">-- Choose Hardware Asset --</option>
                    {assetsList
                      .filter(a => a.status !== 'retired')
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          [{a.id}] {a.brand} {a.name} ({a.company || 'ASTRA TEC'})
                        </option>
                      ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
                {activeAsset && (
                  <p className="text-[10px] text-slate-400 font-mono italic">
                    Current custodian status: <span className="font-bold text-slate-600">{activeAsset.assignedTo ? `Checked-out to ${activeAsset.assignedTo}` : 'In Stockpile Depot'} ({activeAsset.department})</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {activeAsset && (
            <div className="space-y-4">
              {/* CURRENT SOURCE STATE VS DESTINATION STATE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* SOURCE CURRENT DETAILS (Read-only reference) */}
                <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl space-y-2.5">
                  <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Current Location Node (Source)
                  </h3>
                  
                  <div className="space-y-2 text-[11px] font-medium text-slate-650">
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-slate-400 block font-light">Owning Company</span>
                        <span className="font-bold text-slate-800">{activeAsset.company || 'ASTRA TEC'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-slate-400 block font-light">Depot / Department</span>
                        <span className="font-semibold text-slate-700">{activeAsset.department} · <span className="italic font-light">{activeAsset.location || 'Central Shelf'}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-slate-400 block font-light">Active Custody Holder</span>
                        <span className="font-mono text-slate-600 font-bold">{activeAsset.assignedTo || 'Unassigned Stockpiled'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TARGET DESTINATION STATE FORM */}
                <div className="bg-white border-2 border-indigo-50 p-4 rounded-xl space-y-3 shadow-2xs">
                  <h3 className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider flex items-center gap-1">
                    <Check size={11} className="stroke-[3]" /> Target Destination
                  </h3>

                  <div className="space-y-2.5">
                    {/* Destination Company */}
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5 tracking-wider">To Owning Company</label>
                      <div className="relative">
                        <select
                          value={toCompany}
                          onChange={(e) => setToCompany(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg font-bold focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer text-xs"
                        >
                          {companies.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={12} />
                        </div>
                      </div>
                    </div>

                    {/* Destination Department */}
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5 tracking-wider">To Department Node</label>
                      <div className="relative">
                        <select
                          value={toDepartment}
                          onChange={(e) => setToDepartment(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg font-bold focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer text-xs"
                        >
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={12} />
                        </div>
                      </div>
                    </div>

                    {/* Destination Location */}
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5 tracking-wider">To Location Description</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Server Room B, Rack 4A, or Employee Office Desk"
                        value={toLocation}
                        onChange={(e) => setToLocation(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg font-medium focus:ring-1 focus:ring-indigo-500 text-xs font-sans"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* DIRECT CUSTODIAN CONVERSIONS / HANDOVER IN TRANSIT */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Transition Employee Custody Direct?</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Allows updating or removing active assignees along with physical transit.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={updateCustodian}
                    onChange={(e) => setUpdateCustodian(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {updateCustodian && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5 tracking-wider">Recipient Custodian Name</label>
                      <input
                        type="text"
                        placeholder="Leave blank to reset to unassigned stock"
                        value={toCustodianName}
                        onChange={(e) => setToCustodianName(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5 tracking-wider">Recipient Work Email</label>
                      <input
                        type="email"
                        placeholder="recipient@company.com"
                        value={toCustodianEmail}
                        onChange={(e) => setToCustodianEmail(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 text-slate-800 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* TRANSFER REMARK COMMENTARY */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                  <FileText size={12} className="text-slate-400" />
                  Reason for Transfer & Authorization Sign-Off
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the transfer approvals, business purpose, cost-center reallocation keys, or dispatch tracking references."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 font-sans font-medium leading-relaxed"
                ></textarea>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-150 flex justify-end gap-3 select-none">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 text-slate-600 bg-slate-50 hover:bg-slate-100 font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!activeAsset}
              className={`py-2 px-5 font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 ${
                activeAsset 
                  ? 'bg-blue-600 hover:bg-slate-900 border text-white hover:border-slate-800 cursor-pointer' 
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <span>Validate & Process Transfer</span>
              <ArrowLeftRight size={13} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
