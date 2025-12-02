'use client'

/**
 * NG2 Email Templates Component
 *
 * UI for managing and using email templates:
 * - Template browser with categories
 * - Template editor with variable substitution
 * - Quick insert into compose
 * - Template suggestions
 */

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  ChevronRightIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import {
  useTemplates,
  useTemplateEditor,
  suggestTemplates,
  compileTemplate,
  type EmailTemplate,
  type TemplateCategory,
  type TemplateVariable
} from '@/lib/templates/email-templates'

// =============================================================================
// Category Config
// =============================================================================

const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; icon: string; color: string }> = {
  response: { label: 'Responses', icon: '💬', color: 'text-blue-400' },
  follow_up: { label: 'Follow-ups', icon: '🔄', color: 'text-purple-400' },
  introduction: { label: 'Introductions', icon: '👋', color: 'text-green-400' },
  meeting: { label: 'Meetings', icon: '📅', color: 'text-yellow-400' },
  feedback: { label: 'Feedback', icon: '📝', color: 'text-orange-400' },
  support: { label: 'Support', icon: '🛠️', color: 'text-red-400' },
  sales: { label: 'Sales', icon: '💼', color: 'text-cyan-400' },
  custom: { label: 'Custom', icon: '⚡', color: 'text-gray-400' }
}

// =============================================================================
// Template Card
// =============================================================================

interface TemplateCardProps {
  template: EmailTemplate
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onTogglePin?: () => void
  isSelected?: boolean
  showActions?: boolean
}

function TemplateCard({
  template,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onTogglePin,
  isSelected,
  showActions = true
}: TemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const categoryConfig = CATEGORY_CONFIG[template.category]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-purple-500/20 border-purple-500/50'
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span>{categoryConfig.icon}</span>
            <h4 className="text-sm font-medium text-white truncate">
              {template.name}
            </h4>
            {template.isPinned && (
              <StarIconSolid className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
            )}
          </div>

          {template.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-2">
              {template.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className={categoryConfig.color}>
              {categoryConfig.label}
            </span>
            {template.usageCount > 0 && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                Used {template.usageCount}x
              </span>
            )}
          </div>
        </div>

        {showActions && (
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            >
              <ChevronRightIcon className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 py-1"
                >
                  {onTogglePin && (
                    <button
                      onClick={() => { onTogglePin(); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                    >
                      {template.isPinned ? (
                        <>
                          <StarIcon className="w-4 h-4" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <StarIconSolid className="w-4 h-4 text-yellow-400" />
                          Pin
                        </>
                      )}
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={() => { onDuplicate(); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                      Duplicate
                    </button>
                  )}
                  {onDelete && template.scope === 'personal' && (
                    <button
                      onClick={() => { onDelete(); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// =============================================================================
// Variable Input
// =============================================================================

interface VariableInputProps {
  variable: TemplateVariable
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

function VariableInput({ variable, value, onChange, autoFocus }: VariableInputProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-sm text-gray-300">
        {variable.label}
        {variable.required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={variable.type === 'email' ? 'email' : variable.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={variable.defaultValue || `Enter ${variable.label.toLowerCase()}...`}
        autoFocus={autoFocus}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
      />
    </div>
  )
}

// =============================================================================
// Template Preview
// =============================================================================

interface TemplatePreviewProps {
  template: EmailTemplate
  variableValues: Record<string, string>
  className?: string
}

function TemplatePreview({ template, variableValues, className = '' }: TemplatePreviewProps) {
  const compiled = useMemo(
    () => compileTemplate(template, variableValues),
    [template, variableValues]
  )

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="p-3 bg-gray-800/50 rounded-lg">
        <p className="text-xs text-gray-400 mb-1">Subject</p>
        <p className="text-sm text-white">{compiled.subject}</p>
      </div>

      <div className="p-3 bg-gray-800/50 rounded-lg">
        <p className="text-xs text-gray-400 mb-1">Body</p>
        <pre className="text-sm text-white whitespace-pre-wrap font-sans">
          {compiled.body}
        </pre>
      </div>

      {compiled.missingVariables.length > 0 && (
        <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-400">
            Missing: {compiled.missingVariables.join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Template Editor Modal
// =============================================================================

interface TemplateEditorModalProps {
  isOpen: boolean
  onClose: () => void
  template?: EmailTemplate
  onSave: (template: Partial<EmailTemplate>) => void
  userId: string
}

function TemplateEditorModal({
  isOpen,
  onClose,
  template,
  onSave,
  userId
}: TemplateEditorModalProps) {
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'custom')
  const [subject, setSubject] = useState(template?.subject || '')
  const [body, setBody] = useState(template?.body || '')

  const handleSave = () => {
    onSave({
      name,
      description,
      category,
      subject,
      body,
      scope: 'personal',
      ownerId: userId,
      isActive: true,
      isPinned: false,
      variables: [] // Would need to extract variables from subject/body
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              placeholder="e.g., Quick Thank You"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              placeholder="Brief description..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_CONFIG) as TemplateCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    category === cat
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span>{CATEGORY_CONFIG[cat].icon}</span>
                  {CATEGORY_CONFIG[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              placeholder="Use {{variable_name}} for dynamic content"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email Body
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              placeholder="Use {{variable_name}} for dynamic content like {{recipient_name}}"
            />
          </div>

          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400">
              <strong>Tip:</strong> Use {"{{variable_name}}"} syntax for dynamic content.
              Common variables: {"{{recipient_name}}"}, {"{{my_name}}"}, {"{{company}}"}, {"{{topic}}"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !subject || !body}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// =============================================================================
// Template Browser
// =============================================================================

interface TemplateBrowserProps {
  userId: string
  teamId?: string
  onSelectTemplate: (template: EmailTemplate, variableValues: Record<string, string>) => void
  className?: string
}

export function TemplateBrowser({
  userId,
  teamId,
  onSelectTemplate,
  className = ''
}: TemplateBrowserProps) {
  const {
    allTemplates,
    recentTemplates,
    templatesByCategory,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    useTemplate,
    searchTemplates,
    togglePin
  } = useTemplates(userId, teamId)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all' | 'recent'>('all')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | undefined>()

  // Template editor hook
  const {
    template: selectedTemplate,
    variableValues,
    compiledTemplate,
    setVariable,
    applyDefaults,
    isComplete
  } = useTemplateEditor(selectedTemplateId)

  // Filtered templates
  const displayedTemplates = useMemo(() => {
    if (searchQuery) {
      return searchTemplates(searchQuery)
    }

    if (selectedCategory === 'recent') {
      return recentTemplates
    }

    if (selectedCategory === 'all') {
      // Pinned first, then by usage
      return [...allTemplates].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1
        return b.usageCount - a.usageCount
      })
    }

    return templatesByCategory[selectedCategory] || []
  }, [searchQuery, selectedCategory, allTemplates, recentTemplates, templatesByCategory, searchTemplates])

  const handleUseTemplate = useCallback(() => {
    if (!selectedTemplate || !compiledTemplate) return

    useTemplate(selectedTemplate.id, userId, variableValues)
    onSelectTemplate(selectedTemplate, variableValues)
  }, [selectedTemplate, compiledTemplate, variableValues, useTemplate, userId, onSelectTemplate])

  const handleSaveTemplate = useCallback((templateData: Partial<EmailTemplate>) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, templateData)
    } else {
      addTemplate(templateData as any)
    }
    setEditingTemplate(undefined)
  }, [editingTemplate, addTemplate, updateTemplate])

  return (
    <div className={`flex h-full ${className}`}>
      {/* Sidebar */}
      <div className="w-56 border-r border-gray-700 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-gray-700/50">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedCategory === 'all'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <FolderIcon className="w-4 h-4" />
            All Templates
          </button>

          <button
            onClick={() => setSelectedCategory('recent')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedCategory === 'recent'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <ClockIcon className="w-4 h-4" />
            Recently Used
          </button>

          <div className="pt-2 mt-2 border-t border-gray-700/50">
            {(Object.keys(CATEGORY_CONFIG) as TemplateCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === cat
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>{CATEGORY_CONFIG[cat].icon}</span>
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* New Template Button */}
        <div className="p-3 border-t border-gray-700/50">
          <button
            onClick={() => {
              setEditingTemplate(undefined)
              setIsEditorOpen(true)
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {displayedTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No templates found</p>
            </div>
          ) : (
            displayedTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => {
                  setSelectedTemplateId(template.id)
                  applyDefaults()
                }}
                onEdit={() => {
                  setEditingTemplate(template)
                  setIsEditorOpen(true)
                }}
                onDelete={() => deleteTemplate(template.id)}
                onDuplicate={() => duplicateTemplate(template.id, `${template.name} (Copy)`)}
                onTogglePin={() => togglePin(template.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Variable Panel */}
      {selectedTemplate && (
        <div className="w-80 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-medium text-white">{selectedTemplate.name}</h3>
            <p className="text-xs text-gray-400 mt-1">
              Fill in the variables below
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedTemplate.variables.map((variable, index) => (
              <VariableInput
                key={variable.name}
                variable={variable}
                value={variableValues[variable.name] || ''}
                onChange={(value) => setVariable(variable.name, value)}
                autoFocus={index === 0}
              />
            ))}

            {selectedTemplate.variables.length === 0 && (
              <p className="text-sm text-gray-500">
                This template has no variables.
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="p-4 border-t border-gray-700">
            <TemplatePreview
              template={selectedTemplate}
              variableValues={variableValues}
            />
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleUseTemplate}
              disabled={!isComplete}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
              Use Template
            </button>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <TemplateEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingTemplate(undefined)
        }}
        template={editingTemplate}
        onSave={handleSaveTemplate}
        userId={userId}
      />
    </div>
  )
}

// =============================================================================
// Template Suggestions Widget
// =============================================================================

interface TemplateSuggestionsProps {
  email: {
    subject: string
    body: string
    from: string
    fromName?: string
  }
  userId: string
  onSelect: (template: EmailTemplate) => void
  className?: string
}

export function TemplateSuggestions({
  email,
  userId,
  onSelect,
  className = ''
}: TemplateSuggestionsProps) {
  const { allTemplates } = useTemplates(userId)

  const suggestions = useMemo(
    () => suggestTemplates(email, allTemplates),
    [email, allTemplates]
  )

  if (suggestions.length === 0) return null

  return (
    <div className={`p-3 bg-gray-800/50 rounded-lg ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <SparklesIcon className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-gray-300">Suggested Templates</span>
      </div>

      <div className="space-y-2">
        {suggestions.map(suggestion => (
          <button
            key={suggestion.templateId}
            onClick={() => onSelect(suggestion.template)}
            className="w-full flex items-center justify-between p-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>{CATEGORY_CONFIG[suggestion.template.category].icon}</span>
              <span className="text-sm text-white">{suggestion.template.name}</span>
            </div>
            <span className="text-xs text-gray-500">
              {suggestion.confidence}% match
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Quick Insert Button
// =============================================================================

interface QuickTemplateButtonProps {
  userId: string
  onInsert: (subject: string, body: string) => void
  className?: string
}

export function QuickTemplateButton({ userId, onInsert, className = '' }: QuickTemplateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { recentTemplates, allTemplates } = useTemplates(userId)

  const quickTemplates = recentTemplates.length > 0 ? recentTemplates : allTemplates.slice(0, 5)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
      >
        <DocumentTextIcon className="w-4 h-4" />
        Templates
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10"
          >
            <div className="p-2 border-b border-gray-700">
              <p className="text-xs text-gray-400">Quick Insert</p>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {quickTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    onInsert(template.subject, template.body)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                >
                  <span>{CATEGORY_CONFIG[template.category].icon}</span>
                  <span className="truncate">{template.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TemplateBrowser
