/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, ChevronDown, Plus, Trash2, Settings, ShieldAlert } from 'lucide-react';
import { Asset, AssetType, DepartmentType, AssetStatus } from '../types';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (asset: Asset) => void;
  assetToEdit: Asset | null;
  existingAssets: Asset[];
  companies: string[];
  categories: string[];
  departments: string[];
  cadences: string[];
  onAddOption: (type: 'company' | 'category' | 'department' | 'cadence', value: string) => void;
  onRemoveOption: (type: 'company' | 'category' | 'department' | 'cadence', value: string) => void;
  currentUserRole: 'admin' | 'manager' | 'viewer';
}

export default function AssetFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  assetToEdit, 
  existingAssets,
  companies,
  categories,
  departments,
  cadences,
  onAddOption,
  onRemoveOption,
  currentUserRole
}: AssetFormModalProps) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('laptop');
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [os, setOs] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('2026-05-31');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('IT');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [maintenanceFrequency, setMaintenanceFrequency] = useState<string>('bi-annually');
  const [status, setStatus] = useState<AssetStatus>('available');
  const [company, setCompany] = useState('Cyberdyne Systems');
  const [serialNumber, setSerialNumber] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [mailType, setMailType] = useState<'INTERNAL' | 'EXTERNAL' | 'GROUP' | 'NIL'>('NIL');
  const [usb, setUsb] = useState<'ALLOW' | 'BLOCK'>('ALLOW');
  const [emailAddress, setEmailAddress] = useState('');
  const [error, setError] = useState('');

  // Inline Option List Editing State
  const [editingOptionType, setEditingOptionType] = useState<'company' | 'category' | 'department' | 'cadence' | null>(null);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [optionActionError, setOptionActionError] = useState('');

  useEffect(() => {
    if (assetToEdit) {
      setId(assetToEdit.id);
      setName(assetToEdit.name);
      setType(assetToEdit.type);
      setSerialNumber(assetToEdit.serialNumber);
      setBrand(assetToEdit.brand);
      
      const parts = assetToEdit.model.split('/').map(p => p.trim());
      setModelName(parts[0] || '');
      setRam(parts[1] || '');
      setStorage(parts[2] || '');

      setOs(assetToEdit.os);
      setPurchaseDate(assetToEdit.purchaseDate);
      setPurchaseCost(assetToEdit.purchaseCost.toString());
      setDepartment(assetToEdit.department);
      setLocation(assetToEdit.location);
      setNotes(assetToEdit.notes);
      setMaintenanceFrequency(assetToEdit.maintenanceFrequency);
      setStatus(assetToEdit.status);
      setCompany(assetToEdit.company || companies[0] || 'Cyberdyne Systems');
      setIpAddress(assetToEdit.ipAddress || '');
      setMailType(assetToEdit.mailType || 'NIL');
      setUsb(assetToEdit.usb || 'ALLOW');
      setEmailAddress(assetToEdit.emailAddress || '');
      setError('');
    } else {
      setName('');
      setType(categories[0] || 'laptop');
      setSerialNumber('');
      setBrand('');
      setModelName('');
      setRam('');
      setStorage('');
      setOs('');
      setPurchaseDate('2026-05-31');
      setPurchaseCost('');
      setDepartment(departments[0] || 'IT');
      setLocation('');
      setNotes('');
      setMaintenanceFrequency(cadences[0] || 'bi-annually');
      setStatus('available');
      setCompany(companies[0] || 'Cyberdyne Systems');
      setIpAddress('');
      setMailType('NIL');
      setUsb('ALLOW');
      setEmailAddress('');
      setError('');
    }
  }, [assetToEdit, isOpen, existingAssets, companies, categories, departments, cadences]);

  // Custom prefix helper according to specific device classifications
  const getAssetPrefix = (assetType: string): string => {
    const normType = assetType.toLowerCase();
    if (normType.includes('desktop')) return 'D-';
    if (normType.includes('laptop')) return 'L-';
    if (normType.includes('firewall') || normType.includes('firewal')) return 'F-';
    if (normType.includes('server')) return 'S-';
    if (normType.includes('printer')) return 'P-';
    if (normType.includes('scanner')) return 'SC-';
    if (normType.includes('switch')) return 'SW-';
    if (normType.includes('router')) return 'R-';
    if (normType.includes('peripheral')) return 'PE-';
    if (assetType.trim().length > 0) {
      const clean = assetType.trim().replace(/\s+/g, '');
      if (clean.length > 2) {
        return `${clean.slice(0, 2).toUpperCase()}-`;
      }
      return `${clean.toUpperCase()}-`;
    }
    return 'AST-';
  };

  const getNextAssetId = (assetType: string, assets: Asset[]): string => {
    const prefix = getAssetPrefix(assetType);
    const matchingAssets = assets.filter(a => a.id.startsWith(prefix));
    
    let maxNum = 0;
    matchingAssets.forEach(a => {
      const numPart = a.id.slice(prefix.length);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });
    
    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(3, '0');
    return `${prefix}${paddedNum}`;
  };

  // Dynamic ID generation when category / type changes during registration
  useEffect(() => {
    if (!assetToEdit && isOpen) {
      const nextId = getNextAssetId(type, existingAssets);
      setId(nextId);
    }
  }, [type, assetToEdit, isOpen, existingAssets]);

  // Set default OS/Firmware recommendations depending on type selection
  useEffect(() => {
    if (!assetToEdit) {
      if (type.toLowerCase() === 'laptop') setOs('Windows 11 Pro');
      else if (type.toLowerCase() === 'desktop') setOs('Windows 11 Enterprise');
      else if (type.toLowerCase() === 'server') setOs('RHEL 9.3');
      else if (type.toLowerCase() === 'switch') setOs('Cisco IOS-XE');
      else if (type.toLowerCase() === 'printer') setOs('Printer Firmware v4.0');
      else if (type.toLowerCase() === 'peripheral') setOs('N/A - Peripheral Driver');
      else if (type.toLowerCase() === 'scanner') setOs('TWAIN Driver Standard');
    }
  }, [type, assetToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (currentUserRole === 'viewer') {
      return setError('ACCESS DENIED: Your account role (Viewer) does not possess write privileges for adding or editing assets.');
    }

    if (!name.trim()) return setError('Asset classification / Name is required');
    if (!serialNumber.trim()) return setError('Serial Number (or asset unique serial identifier) is required');
    if (!brand.trim()) return setError('Brand is required');
    if (!modelName.trim()) return setError('Model is required');
    if (!purchaseCost.trim() || isNaN(parseFloat(purchaseCost)) || parseFloat(purchaseCost) < 0) {
      return setError('Please key in a valid purchase cost (INR amount)');
    }

    // Check if Serial already exists on a different asset
    const serialExists = existingAssets.some(
      a => a.serialNumber.toLowerCase() === serialNumber.trim().toLowerCase() && a.id !== id
    );
    if (serialExists) {
      return setError(`An asset with Serial Number "${serialNumber}" already parsed in database.`);
    }

    // Calculate next maintenance date from purchase date (if no last maintenance date exists)
    let nextM: string | null = null;
    if (maintenanceFrequency !== 'none') {
      const pDate = new Date(purchaseDate);
      if (maintenanceFrequency === 'monthly') pDate.setMonth(pDate.getMonth() + 1);
      else if (maintenanceFrequency === 'quarterly') pDate.setMonth(pDate.getMonth() + 3);
      else if (maintenanceFrequency === 'bi-annually') pDate.setMonth(pDate.getMonth() + 6);
      else if (maintenanceFrequency === 'annually') pDate.setFullYear(pDate.getFullYear() + 1);
      nextM = pDate.toISOString().split('T')[0];
    }

    // Combine modelName, ram, and storage
    const combinedModelParts = [modelName.trim()];
    if (ram.trim()) combinedModelParts.push(ram.trim());
    if (storage.trim()) combinedModelParts.push(storage.trim());
    const finalModel = combinedModelParts.join(' / ');

    const savedAsset: Asset = {
      id,
      type,
      name: name.trim(),
      serialNumber: serialNumber.trim(),
      brand: brand.trim(),
      model: finalModel,
      os: os.trim() || 'N/A',
      purchaseDate,
      purchaseCost: parseFloat(purchaseCost),
      department,
      location: location.trim() || 'IT Depot Facility',
      status: assetToEdit ? assetToEdit.status : status,
      assignedTo: assetToEdit ? assetToEdit.assignedTo : null,
      assignedEmail: assetToEdit ? assetToEdit.assignedEmail : null,
      assignedDate: assetToEdit ? assetToEdit.assignedDate : null,
      expectedReturnDate: assetToEdit ? assetToEdit.expectedReturnDate : null,
      lastMaintenanceDate: assetToEdit ? assetToEdit.lastMaintenanceDate : purchaseDate,
      nextMaintenanceDate: assetToEdit ? assetToEdit.nextMaintenanceDate : nextM,
      maintenanceFrequency,
      notes: notes.trim(),
      company,
      ipAddress: ipAddress.trim() || 'N/A',
      mailType: mailType,
      usb: usb,
      emailAddress: emailAddress.trim() || undefined
    };

    onSubmit(savedAsset);
  };

  const handleAddCustomOption = () => {
    setOptionActionError('');
    if (!newOptionValue.trim()) {
      return setOptionActionError('Option value cannot be empty');
    }
    
    if (currentUserRole !== 'admin') {
      return setOptionActionError('Only administrators are allowed to edit list options');
    }

    if (editingOptionType) {
      onAddOption(editingOptionType, newOptionValue.trim());
      setNewOptionValue('');
    }
  };

  const handleRemoveCustomOption = (val: string) => {
    setOptionActionError('');
    
    if (currentUserRole !== 'admin') {
      return setOptionActionError('Only administrators are allowed to edit list options');
    }

    if (editingOptionType) {
      onRemoveOption(editingOptionType, val);
    }
  };

  const getOptionListLabel = (typeKey: 'company' | 'category' | 'department' | 'cadence') => {
    switch (typeKey) {
      case 'company': return 'Corporate Entities (Multiple Companies)';
      case 'category': return 'Device Categories / Form Factors';
      case 'department': return 'Assigned Corporate Departments';
      case 'cadence': return 'Maintenance Frequencies';
    }
  };

  const activeOptionList = (() => {
    if (editingOptionType === 'company') return companies;
    if (editingOptionType === 'category') return categories;
    if (editingOptionType === 'department') return departments;
    if (editingOptionType === 'cadence') return cadences;
    return [];
  })();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {editingOptionType 
                ? `Manage List: ${getOptionListLabel(editingOptionType)}`
                : (assetToEdit ? `Edit Asset Data: ${assetToEdit.id}` : 'Register New Corporate Asset')
              }
            </h2>
            <p className="text-xs text-slate-500">
              {editingOptionType 
                ? 'Add, inspect, or delete available selections in this dropdown.'
                : 'Provide device metadata, acquisition values, and support frequencies.'
              }
            </p>
          </div>
          <button 
            onClick={() => editingOptionType ? setEditingOptionType(null) : onClose()} 
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Inner Tab: Option List Editor */}
        {editingOptionType ? (
          <div className="p-6 space-y-4">
            {optionActionError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-center gap-2 font-medium text-xs">
                <AlertTriangle size={15} />
                <span>{optionActionError}</span>
              </div>
            )}

            {currentUserRole !== 'admin' && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 flex items-start gap-2.5 text-xs">
                <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Privilege Restriction</span>
                  <p className="text-amber-700/90 mt-0.5">Your current account role is <span className="font-bold uppercase font-mono">{currentUserRole}</span>. Only <span className="font-bold uppercase font-mono">admin</span> operators can modify central dropdown selections.</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-slate-400 tracking-wider">Add New Selection Option</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  disabled={currentUserRole !== 'admin'}
                  placeholder={`e.g. New ${editingOptionType === 'company' ? 'Company Group' : 'Option'}`}
                  value={newOptionValue}
                  onChange={(e) => setNewOptionValue(e.target.value)}
                  className="flex-1 p-2.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-xl focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomOption();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomOption}
                  disabled={currentUserRole !== 'admin'}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  Add Option
                </button>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                Current Registered Options ({activeOptionList.length})
              </div>
              <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                {activeOptionList.map((val) => (
                  <li key={val} className="px-4 py-3 flex items-center justify-between text-slate-700 font-medium hover:bg-slate-50/50">
                    <span className="capitalize">{val}</span>
                    {currentUserRole === 'admin' ? (
                      <button 
                        type="button"
                        onClick={() => handleRemoveCustomOption(val)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Delete this option"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-400 font-mono font-bold uppercase rounded">Locked</span>
                    )}
                  </li>
                ))}
                {activeOptionList.length === 0 && (
                  <li className="p-6 text-center text-slate-400 italic">No options found. Feel free to add some!</li>
                )}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingOptionType(null)}
                className="py-2 px-5 bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back to Form Editor
              </button>
            </div>
          </div>
        ) : (
          /* Main Form Element */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh] space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 flex items-center gap-2 font-medium">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Asset ID & Company Select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">Asset ID</label>
                <input
                  type="text"
                  disabled
                  value={id}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-600 font-mono font-bold rounded-xl cursor-not-allowed"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Company Owner</label>
                  <button 
                    type="button" 
                    onClick={() => setEditingOptionType('company')}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Settings size={10} /> Edit List
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 appearance-none transition-all"
                  >
                    {companies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* Device Form Factor / Category & User Name Customization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Device Form Factor / Category</label>
                  <button 
                    type="button" 
                    onClick={() => setEditingOptionType('category')}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Settings size={10} /> Edit List
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 appearance-none transition-all"
                  >
                    {categories.map(cat => {
                      // Visual emoji representations for standard keywords
                      let emoji = '⚙️ ';
                      const label = cat.toLowerCase();
                      if (label.includes('laptop')) emoji = '💻 ';
                      else if (label.includes('desktop')) emoji = '🖥️ ';
                      else if (label.includes('server')) emoji = '🎛️ ';
                      else if (label.includes('switch')) emoji = '🔌 ';
                      else if (label.includes('printer')) emoji = '🖨️ ';
                      else if (label.includes('scanner')) emoji = '📠 ';
                      else if (label.includes('peripheral') || label.includes('mouse') || label.includes('keyboard')) emoji = '🖱️ ';
                      
                      return (
                        <option key={cat} value={cat}>{emoji} {cat}</option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">USER NAME</label>
                <input
                  type="text"
                  placeholder="e.g. MacBook Pro M3 Max"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">Hardware Manufacturer (Brand)</label>
                <input
                  type="text"
                  placeholder="e.g. Apple, Dell, Lenovo"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">MODEL</label>
                  <input
                    type="text"
                    placeholder="e.g. T14"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">RAM</label>
                  <input
                    type="text"
                    placeholder="e.g. 32GB"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">SSD / HDD</label>
                  <input
                    type="text"
                    placeholder="e.g. 1TB"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">Serial Number (S/N CODE)</label>
                <input
                  type="text"
                  placeholder="Unique manufacturer identifier code"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">Operating System / Firmware Version</label>
                <input
                  type="text"
                  placeholder="e.g. Windows 11 Enterprise, macOS Sequoia"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Assigned Department</label>
                  <button 
                    type="button" 
                    onClick={() => setEditingOptionType('department')}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Settings size={10} /> Edit List
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-white border border-slate-200 text-slate-800 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 appearance-none"
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">Maintenance Cadence</label>
                  <button 
                    type="button" 
                    onClick={() => setEditingOptionType('cadence')}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Settings size={10} /> Edit List
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={maintenanceFrequency}
                    onChange={(e) => setMaintenanceFrequency(e.target.value)}
                    className="w-full p-2.5 pr-10 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 appearance-none"
                  >
                    {cadences.map(cad => (
                      <option key={cad} value={cad}>
                        {cad === 'none' ? 'No Schedule' : `Routine: ${cad}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">Acquisition Cost (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 125000.00"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">PURCHASE DATE</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">LOCATION</label>
                <input
                  type="text"
                  placeholder="e.g. Ashburn DataCenter Sec C Rack 12"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. owner@webcorp.io"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Standard inputs for IP Address, Mail Type, and USB Access Policy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">IP Address</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.102"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">Mail Type</label>
                <div className="relative">
                  <select
                    value={mailType}
                    onChange={(e) => setMailType(e.target.value as any)}
                    className="w-full p-2.5 pr-8 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 appearance-none font-medium"
                  >
                    <option value="NIL">NIL</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="EXTERNAL">EXTERNAL</option>
                    <option value="GROUP">GROUP</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">USB Policy</label>
                <div className="relative">
                  <select
                    value={usb}
                    onChange={(e) => setUsb(e.target.value as any)}
                    className="w-full p-2.5 pr-8 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 appearance-none font-medium"
                  >
                    <option value="ALLOW">🟩 ALLOW</option>
                    <option value="BLOCK">🟥 BLOCK</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">Additional Device Audit Notes</label>
              <textarea
                placeholder="Record any special configuration flags, memory modules, accessories, or condition remarks."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500"
              ></textarea>
            </div>

            {/* Footer actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={onClose}
                id="btn-modal-cancel"
                className="py-2.5 px-4 text-slate-600 bg-slate-50 hover:bg-slate-100 font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-modal-save"
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                {assetToEdit ? 'Save Changes' : 'Register Asset'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
