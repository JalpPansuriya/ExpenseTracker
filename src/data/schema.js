/**
 * Default categories pre-loaded for embroidery business.
 */
export const DEFAULT_CATEGORIES = [
  { id: 'cat-thread', name: 'Thread & Yarn', icon: '🧵', isCustom: false, archived: false },
  { id: 'cat-fabric', name: 'Fabric & Base Material', icon: '👗', isCustom: false, archived: false },
  { id: 'cat-maintenance', name: 'Machine Maintenance & Repair', icon: '🔧', isCustom: false, archived: false },
  { id: 'cat-equipment', name: 'Equipment Purchase', icon: '💻', isCustom: false, archived: false },
  { id: 'cat-labor', name: 'Outsourced Labor / Tailoring', icon: '✂️', isCustom: false, archived: false },
  { id: 'cat-shipping', name: 'Packaging & Shipping', icon: '📦', isCustom: false, archived: false },
  { id: 'cat-utilities', name: 'Utilities (electricity, water)', icon: '⚡', isCustom: false, archived: false },
  { id: 'cat-software', name: 'Software & Subscriptions', icon: '🖥️', isCustom: false, archived: false },
  { id: 'cat-marketing', name: 'Marketing & Advertising', icon: '📢', isCustom: false, archived: false },
  { id: 'cat-misc', name: 'Miscellaneous', icon: '🏷️', isCustom: false, archived: false },
  
  // Income Categories
  { id: 'cat-income-1', name: 'Customer Payment', icon: '💰', isCustom: false, archived: false },
  { id: 'cat-income-2', name: 'Advance Payment', icon: '🤝', isCustom: false, archived: false },
  { id: 'cat-income-3', name: 'Bulk Order', icon: '📦', isCustom: false, archived: false },
  { id: 'cat-income-4', name: 'Retail Sale', icon: '🛍️', isCustom: false, archived: false },
  { id: 'cat-income-5', name: 'Other Income', icon: '💵', isCustom: false, archived: false }
]

export const SCHEMA_VERSION = 2

export const DEFAULT_NOTIFICATION_SETTINGS = {
  id: 'singleton',
  enabled: true,
  defaultLeadDays: 5,
  permissionState: 'default'
}
