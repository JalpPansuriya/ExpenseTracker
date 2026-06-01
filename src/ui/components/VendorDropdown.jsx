import React, { useState, useEffect, useRef } from 'react'
import { VendorService } from '../../domain/vendor'

export default function VendorDropdown({ value, onChange, transactionType }) {
  const [vendors, setVendors] = useState([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [newVendor, setNewVendor] = useState({
    name: '',
    type: transactionType === 'income' ? 'customer' : 'supplier',
    phone: ''
  })

  const containerRef = useRef(null)

  useEffect(() => {
    let active = true
    VendorService.listVendors().then(list => {
      if (active) setVendors(list)
    })
    return () => { active = false }
  }, [value])

  useEffect(() => {
    if (value && vendors.length > 0) {
      const selected = vendors.find(v => v.id === value)
      if (selected) {
        setSearch(selected.name)
      }
    } else if (!value) {
      setSearch('')
    }
  }, [value, vendors])

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setShowAddForm(false)
        setErrorMsg('')
        if (value) {
          const selected = vendors.find(v => v.id === value)
          if (selected) {
            setSearch(selected.name)
          }
        } else {
          setSearch('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value, vendors])

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddVendor = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setErrorMsg('')
    if (!newVendor.name.trim()) {
      setErrorMsg('Vendor name is required')
      return
    }
    try {
      const created = await VendorService.createVendor({
        name: newVendor.name,
        type: newVendor.type,
        phone: newVendor.phone,
        email: '',
        notes: ''
      })
      setVendors(prev => [...prev, created])
      onChange(created.id)
      setSearch(created.name)
      setShowAddForm(false)
      setIsOpen(false)
      setNewVendor({
        name: '',
        type: transactionType === 'income' ? 'customer' : 'supplier',
        phone: ''
      })
    } catch (err) {
      try {
        const errors = JSON.parse(err.message)
        if (Array.isArray(errors)) {
          setErrorMsg(errors[0].message)
        } else {
          setErrorMsg(err.message)
        }
      } catch {
        setErrorMsg(err.message || 'Error creating vendor')
      }
    }
  }

  const handleSelect = (vendor) => {
    onChange(vendor.id)
    setSearch(vendor.name)
    setIsOpen(false)
  }

  return (
    <div className="vendor-dropdown-container" ref={containerRef}>
      <div className="vendor-dropdown-input-wrapper">
        <input
          type="text"
          className="form-control"
          placeholder="Search or select vendor..."
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
        <span className={`vendor-dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="vendor-dropdown-menu">
          {!showAddForm ? (
            <ul className="vendor-dropdown-list">
              {filtered.map(v => (
                <li
                  key={v.id}
                  className={`vendor-dropdown-item ${value === v.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(v)}
                >
                  <span>{v.name}</span>
                  <span className={`vendor-type-badge ${v.type}`}>{v.type}</span>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="vendor-dropdown-item" style={{ color: 'var(--text-secondary)', cursor: 'default' }}>
                  No vendors found
                </li>
              )}
              <li
                className="vendor-dropdown-add-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAddForm(true)
                  setNewVendor({
                    name: search,
                    type: transactionType === 'income' ? 'customer' : 'supplier',
                    phone: ''
                  })
                }}
              >
                + Add New Vendor
              </li>
            </ul>
          ) : (
            <div className="vendor-inline-form" onClick={e => e.stopPropagation()}>
              <div className="vendor-inline-form-title">Quick Add Vendor</div>
              <div className="vendor-inline-form-grid">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Vendor Name *"
                  value={newVendor.name}
                  onChange={e => setNewVendor(p => ({ ...p, name: e.target.value }))}
                />
                
                <div className="type-toggle-group">
                  {['supplier', 'customer', 'both'].map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`type-toggle-btn ${newVendor.type === t ? 'active' : ''}`}
                      onClick={() => setNewVendor(p => ({ ...p, type: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Phone (optional)"
                  value={newVendor.phone}
                  onChange={e => setNewVendor(p => ({ ...p, phone: e.target.value }))}
                />
                
                {errorMsg && <div className="form-error">{errorMsg}</div>}
              </div>

              <div className="vendor-inline-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowAddForm(false)
                    setErrorMsg('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddVendor}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
