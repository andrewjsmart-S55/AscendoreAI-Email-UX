'use client'

/**
 * NG2 Label Manager - Label Management UI Panel
 *
 * Features:
 * - Create, edit, delete labels
 * - Custom colors and icons
 * - Auto-tagging rules
 * - Label statistics
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import {
  useLabelStore,
  Label,
  LabelRule,
  LABEL_COLORS,
  useLabelSelector
} from '@/stores/labelStore'
import { ascendoreAuth } from '@/lib/ascendore-auth'

// =============================================================================
// Types
// =============================================================================

interface NG2LabelManagerProps {
  isOpen: boolean
  onClose: () => void
}

interface LabelFormData {
  name: string
  color: string
  icon?: string
}

interface RuleFormData {
  field: LabelRule['conditions'][0]['field']
  operator: LabelRule['conditions'][0]['operator']
  value: string
  caseSensitive: boolean
}

// =============================================================================
// Main Component
// =============================================================================

export function NG2LabelManager({ isOpen, onClose }: NG2LabelManagerProps) {
  const [activeTab, setActiveTab] = useState<'labels' | 'rules'>('labels')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [expandedLabelId, setExpandedLabelId] = useState<string | null>(null)

  const user = ascendoreAuth.getUser()
  const userId = user?.id || 'default'

  // Label store
  const labels = useLabelStore((state) => state.getLabelsByUser(userId))
  const createLabel = useLabelStore((state) => state.createLabel)
  const updateLabel = useLabelStore((state) => state.updateLabel)
  const deleteLabel = useLabelStore((state) => state.deleteLabel)
  const rules = useLabelStore((state) => state.rules)
  const createRule = useLabelStore((state) => state.createRule)
  const deleteRule = useLabelStore((state) => state.deleteRule)

  // Form state
  const [formData, setFormData] = useState<LabelFormData>({
    name: '',
    color: LABEL_COLORS[0]
  })

  const [ruleFormData, setRuleFormData] = useState<RuleFormData>({
    field: 'from',
    operator: 'contains',
    value: '',
    caseSensitive: false
  })

  // Handle label creation
  const handleCreateLabel = useCallback(() => {
    if (!formData.name.trim()) {
      toast.error('Label name is required')
      return
    }

    createLabel({
      name: formData.name.trim(),
      color: formData.color,
      icon: formData.icon,
      isSystem: false,
      isAISuggested: false,
      userId
    })

    toast.success(`Label "${formData.name}" created`)
    setFormData({ name: '', color: LABEL_COLORS[0] })
    setShowCreateForm(false)
  }, [formData, createLabel, userId])

  // Handle label update
  const handleUpdateLabel = useCallback(() => {
    if (!editingLabel || !formData.name.trim()) {
      return
    }

    updateLabel(editingLabel.id, {
      name: formData.name.trim(),
      color: formData.color,
      icon: formData.icon
    })

    toast.success(`Label updated`)
    setEditingLabel(null)
    setFormData({ name: '', color: LABEL_COLORS[0] })
  }, [editingLabel, formData, updateLabel])

  // Handle label deletion
  const handleDeleteLabel = useCallback(
    (label: Label) => {
      if (label.isSystem) {
        toast.error('Cannot delete system labels')
        return
      }

      if (window.confirm(`Delete label "${label.name}"?`)) {
        deleteLabel(label.id)
        toast.success(`Label deleted`)
      }
    },
    [deleteLabel]
  )

  // Handle edit click
  const handleEditClick = useCallback((label: Label) => {
    setEditingLabel(label)
    setFormData({
      name: label.name,
      color: label.color,
      icon: label.icon
    })
    setShowCreateForm(true)
  }, [])

  // Handle rule creation
  const handleCreateRule = useCallback(
    (labelId: string) => {
      if (!ruleFormData.value.trim()) {
        toast.error('Rule value is required')
        return
      }

      createRule({
        labelId,
        conditions: [
          {
            field: ruleFormData.field,
            operator: ruleFormData.operator,
            value: ruleFormData.value.trim(),
            caseSensitive: ruleFormData.caseSensitive
          }
        ],
        matchType: 'all',
        isActive: true,
        priority: 0,
        userId
      })

      toast.success('Rule created')
      setRuleFormData({
        field: 'from',
        operator: 'contains',
        value: '',
        caseSensitive: false
      })
    },
    [ruleFormData, createRule, userId]
  )

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TagIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Label Manager
                </h2>
                <p className="text-sm text-gray-500">
                  Organize your emails with labels
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 px-6">
            <button
              onClick={() => setActiveTab('labels')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'labels'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Labels ({labels.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'rules'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <SparklesIcon className="w-4 h-4 inline mr-1" />
              Auto-Tag Rules
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'labels' && (
              <div className="space-y-4">
                {/* Create/Edit Form */}
                {showCreateForm ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      {editingLabel ? 'Edit Label' : 'Create New Label'}
                    </h3>

                    <div className="space-y-3">
                      {/* Name Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Label Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="e.g. Important, Work, Personal"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      {/* Color Picker */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {LABEL_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() =>
                                setFormData({ ...formData, color })
                              }
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                formData.color === color
                                  ? 'border-gray-900 scale-110'
                                  : 'border-transparent hover:border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                            >
                              {formData.color === color && (
                                <CheckIcon className="w-4 h-4 text-white mx-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setShowCreateForm(false)
                            setEditingLabel(null)
                            setFormData({ name: '', color: LABEL_COLORS[0] })
                          }}
                          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={
                            editingLabel ? handleUpdateLabel : handleCreateLabel
                          }
                          className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                        >
                          {editingLabel ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Create New Label</span>
                  </button>
                )}

                {/* Labels List */}
                <div className="space-y-2">
                  {labels.map((label) => {
                    const labelRules = rules.filter(
                      (r) => r.labelId === label.id
                    )
                    const isExpanded = expandedLabelId === label.id

                    return (
                      <div
                        key={label.id}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* Expand/Collapse */}
                          <button
                            onClick={() =>
                              setExpandedLabelId(isExpanded ? null : label.id)
                            }
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          {/* Color dot */}
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: label.color }}
                          />

                          {/* Label info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {label.name}
                              </span>
                              {label.isSystem && (
                                <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">
                                  System
                                </span>
                              )}
                              {label.isAISuggested && (
                                <span className="text-xs text-purple-600 px-2 py-0.5 bg-purple-50 rounded-full">
                                  <SparklesIcon className="w-3 h-3 inline mr-0.5" />
                                  AI
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {label.emailCount} emails
                              {labelRules.length > 0 &&
                                ` • ${labelRules.length} rules`}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditClick(label)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                              title="Edit label"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            {!label.isSystem && (
                              <button
                                onClick={() => handleDeleteLabel(label)}
                                className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                title="Delete label"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded: Rules */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              Auto-Tag Rules
                            </div>

                            {/* Existing rules */}
                            {labelRules.length > 0 ? (
                              <div className="space-y-2 mb-3">
                                {labelRules.map((rule) => (
                                  <div
                                    key={rule.id}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded text-sm"
                                  >
                                    <span className="text-gray-600">
                                      When{' '}
                                      <span className="font-medium">
                                        {rule.conditions[0]?.field}
                                      </span>{' '}
                                      {rule.conditions[0]?.operator}{' '}
                                      <span className="font-medium text-purple-600">
                                        "{rule.conditions[0]?.value}"
                                      </span>
                                    </span>
                                    <button
                                      onClick={() => {
                                        deleteRule(rule.id)
                                        toast.success('Rule deleted')
                                      }}
                                      className="ml-auto text-gray-400 hover:text-red-500"
                                    >
                                      <XMarkIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 mb-3">
                                No rules yet. Add a rule to automatically apply
                                this label.
                              </p>
                            )}

                            {/* Add rule form */}
                            <div className="flex flex-wrap gap-2">
                              <select
                                value={ruleFormData.field}
                                onChange={(e) =>
                                  setRuleFormData({
                                    ...ruleFormData,
                                    field: e.target
                                      .value as RuleFormData['field']
                                  })
                                }
                                className="px-2 py-1 text-xs border border-gray-300 rounded"
                              >
                                <option value="from">From</option>
                                <option value="to">To</option>
                                <option value="subject">Subject</option>
                                <option value="body">Body</option>
                                <option value="domain">Domain</option>
                              </select>
                              <select
                                value={ruleFormData.operator}
                                onChange={(e) =>
                                  setRuleFormData({
                                    ...ruleFormData,
                                    operator: e.target
                                      .value as RuleFormData['operator']
                                  })
                                }
                                className="px-2 py-1 text-xs border border-gray-300 rounded"
                              >
                                <option value="contains">contains</option>
                                <option value="equals">equals</option>
                                <option value="starts_with">starts with</option>
                                <option value="ends_with">ends with</option>
                              </select>
                              <input
                                type="text"
                                value={ruleFormData.value}
                                onChange={(e) =>
                                  setRuleFormData({
                                    ...ruleFormData,
                                    value: e.target.value
                                  })
                                }
                                placeholder="Value..."
                                className="flex-1 min-w-[120px] px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <button
                                onClick={() => handleCreateRule(label.id)}
                                className="px-3 py-1 text-xs text-white bg-purple-600 hover:bg-purple-700 rounded"
                              >
                                Add Rule
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {labels.length === 0 && !showCreateForm && (
                  <div className="text-center py-8">
                    <TagIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No labels yet</p>
                    <p className="text-sm text-gray-400">
                      Create your first label to get started
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Auto-tag rules automatically apply labels to incoming emails
                  based on conditions you define.
                </p>

                {/* All rules grouped by label */}
                {labels.map((label) => {
                  const labelRules = rules.filter((r) => r.labelId === label.id)
                  if (labelRules.length === 0) return null

                  return (
                    <div
                      key={label.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="font-medium text-gray-900">
                          {label.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {labelRules.length} rule
                          {labelRules.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {labelRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded text-sm"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                rule.isActive ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                            <span className="flex-1 text-gray-600">
                              When{' '}
                              <span className="font-medium">
                                {rule.conditions[0]?.field}
                              </span>{' '}
                              {rule.conditions[0]?.operator}{' '}
                              <span className="font-medium text-purple-600">
                                "{rule.conditions[0]?.value}"
                              </span>
                            </span>
                            <button
                              onClick={() => {
                                deleteRule(rule.id)
                                toast.success('Rule deleted')
                              }}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {rules.length === 0 && (
                  <div className="text-center py-8">
                    <SparklesIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No auto-tag rules</p>
                    <p className="text-sm text-gray-400">
                      Create rules from the Labels tab by expanding a label
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default NG2LabelManager
