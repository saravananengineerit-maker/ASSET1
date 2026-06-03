/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Trash2, AlertTriangle, Cpu, Tag, RefreshCw } from 'lucide-react';
import { Asset } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onConfirm: (assetId: string) => void;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  asset,
  onConfirm
}: DeleteConfirmModalProps) {
  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-red-650 bg-red-600 text-white flex justify-between items-center select-none">
          <div className="flex items-center gap-3">
            <div className="bg-red-700/80 p-1.5 rounded-lg text-white">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Confirm Asset Deletion</h2>
              <p className="text-[10px] text-red-100 font-medium font-sans">This transaction permanently purges the asset from tracking archives</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-red-700 rounded-lg text-red-200 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-700 font-sans">
          
          <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-red-800 text-xs">Warning: Irreversible Action</span>
              <p className="text-[11px] text-red-750 text-red-700 leading-relaxed font-medium">
                You are about to permanently delete this device record from the registered corporate catalog. Historical assignments, specifications, and related ledgers will be decoupled from search routes.
              </p>
            </div>
          </div>

          {/* Asset Summary Details */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Hardware Spec</span>
              <span className="font-mono font-bold text-xs bg-white text-blue-600 border border-slate-250 px-2 py-0.5 rounded shadow-2xs">
                {asset.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Brand & Name</span>
                <span className="font-bold text-slate-800">{asset.brand} {asset.name}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Serial Number</span>
                <span className="font-mono text-slate-700 font-medium">{asset.serialNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Dept Node</span>
                <span className="font-bold text-slate-800">{asset.department}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Status State</span>
                <span className={`inline-flex items-center gap-1.5 font-bold uppercase text-[9px] ${
                  asset.status === 'available' ? 'text-green-600' :
                  asset.status === 'checked-out' ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {asset.status}
                </span>
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-[11px] leading-relaxed text-center font-medium">
            Are you absolutely sure you want to delete this hardware inventory record?
          </p>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 select-none">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 text-slate-600 bg-slate-50 hover:bg-slate-100 font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel, Keep Asset
            </button>
            <button
              type="button"
              onClick={() => onConfirm(asset.id)}
              className="py-2 px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Confirm Permanent Deletion</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
