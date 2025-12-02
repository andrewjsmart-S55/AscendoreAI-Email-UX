'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PhotoIcon,
  FaceSmileIcon,
  AtSymbolIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { Email, EmailCompose } from '@/types/email'
import { toast } from 'react-hot-toast'
import { useSendEmail, useAccounts } from '@/hooks/useEmails'

interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  replyTo?: Email
  forwardEmail?: Email
}

export default function ComposeModal({
  isOpen,
  onClose,
  replyTo,
  forwardEmail
}: ComposeModalProps) {
  // API hooks
  const sendEmailMutation = useSendEmail()
  const { data: accountsData } = useAccounts()
  const accounts = accountsData?.accounts || []

  const [isMinimized, setIsMinimized] = useState(false)
  const [compose, setCompose] = useState<EmailCompose>({
    to: replyTo ? [replyTo.from] : [],
    cc: [],
    bcc: [],
    subject: replyTo
      ? `Re: ${replyTo.subject}`
      : forwardEmail
      ? `Fwd: ${forwardEmail.subject}`
      : '',
    body: '',
    attachments: [],
    accountId: accounts.find((acc: any) => acc.isDefault)?.id || accounts[0]?.id || '',
  })

  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)

  const handleSend = async () => {
    if (!compose.to.length || !compose.subject.trim() || !compose.body.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await sendEmailMutation.mutateAsync({
        to: compose.to,
        cc: compose.cc?.length ? compose.cc : undefined,
        bcc: compose.bcc?.length ? compose.bcc : undefined,
        subject: compose.subject,
        body: compose.body,
        // Note: attachments type mismatch - EmailAttachment[] vs File[]
        // This will be handled when file upload is properly implemented
        attachments: compose.attachments?.length ? compose.attachments as unknown as File[] : undefined,
      })

      onClose()

      // Reset form
      setCompose({
        to: [],
        cc: [],
        bcc: [],
        subject: '',
        body: '',
        attachments: [],
        accountId: accounts.find((acc: any) => acc.isDefault)?.id || accounts[0]?.id || '',
      })
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error('Failed to send email:', error)
    }
  }

  const handleSaveDraft = () => {
    toast.success('Draft saved')
  }

  const addRecipient = (field: 'to' | 'cc' | 'bcc', email: string) => {
    const fieldValue = compose[field] || []
    if (email.trim() && !fieldValue.includes(email.trim())) {
      setCompose(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), email.trim()]
      }))
    }
  }

  const removeRecipient = (field: 'to' | 'cc' | 'bcc', email: string) => {
    setCompose(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter(e => e !== email)
    }))
  }

  const RecipientField = ({ 
    field, 
    label, 
    placeholder 
  }: { 
    field: 'to' | 'cc' | 'bcc'
    label: string
    placeholder: string
  }) => {
    const [inputValue, setInputValue] = useState('')

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
        e.preventDefault()
        addRecipient(field, inputValue)
        setInputValue('')
      }
    }

    return (
      <div className="flex items-start gap-3 py-2 border-b border-gray-100">
        <label className="text-sm text-gray-600 w-12 mt-2 font-medium">
          {label}:
        </label>
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 mb-2">
            {(compose[field] || []).map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-sm"
              >
                {email}
                <button
                  onClick={() => removeRecipient(field, email)}
                  className="text-primary-500 hover:text-primary-700"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                addRecipient(field, inputValue)
                setInputValue('')
              }
            }}
            placeholder={placeholder}
            className="w-full text-sm focus:outline-none"
          />
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Modal */}
      <AnimatePresence>
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: isMinimized ? 0.8 : 1
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed z-50 bg-white rounded-lg shadow-2xl border flex flex-col ${
              isMinimized
                ? 'bottom-4 right-4 w-80 h-12'
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-2xl h-[80vh] max-h-[600px]'
            }`}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {replyTo ? 'Reply' : forwardEmail ? 'Forward' : 'New Message'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <MinusIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Recipients */}
              <div className="px-6 py-2 flex-shrink-0">
                {/* Account Selector */}
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <label className="text-sm text-gray-600 w-12 font-medium">From:</label>
                  <select
                    value={compose.accountId}
                    onChange={(e) => setCompose(prev => ({ ...prev, accountId: e.target.value }))}
                    className="flex-1 text-sm focus:outline-none"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.email})
                      </option>
                    ))}
                  </select>
                </div>

                <RecipientField field="to" label="To" placeholder="Enter email addresses..." />

                {showCc && (
                  <RecipientField field="cc" label="Cc" placeholder="Enter CC recipients..." />
                )}

                {showBcc && (
                  <RecipientField field="bcc" label="Bcc" placeholder="Enter BCC recipients..." />
                )}

                <div className="flex items-center gap-4 py-2">
                  {!showCc && (
                    <button
                      onClick={() => setShowCc(true)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      onClick={() => setShowBcc(true)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Bcc
                    </button>
                  )}
                </div>

                {/* Subject */}
                <div className="flex items-center gap-3 py-2 border-b border-gray-100">
                  <label className="text-sm text-gray-600 w-12 font-medium">Subject:</label>
                  <input
                    type="text"
                    value={compose.subject}
                    onChange={(e) => setCompose(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter subject..."
                    className="flex-1 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 px-6 min-h-0 overflow-hidden">
                <textarea
                  value={compose.body}
                  onChange={(e) => setCompose(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Write your message..."
                  className="w-full h-full resize-none focus:outline-none text-sm leading-relaxed py-4 overflow-y-auto"
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                    <PaperClipIcon className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                    <PhotoIcon className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                    <FaceSmileIcon className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                    <AtSymbolIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveDraft}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Save Draft
                  </button>
                  <motion.button
                    onClick={handleSend}
                    disabled={sendEmailMutation.isPending}
                    whileHover={{ scale: sendEmailMutation.isPending ? 1 : 1.02 }}
                    whileTap={{ scale: sendEmailMutation.isPending ? 1 : 0.98 }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendEmailMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <PaperAirplaneIcon className="w-4 h-4" />
                    )}
                    {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}