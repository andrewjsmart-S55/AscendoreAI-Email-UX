import { EmailAccount, Email, EmailThread, EmailFolder, EmailLabel } from '@/types/email'

export const mockAccounts: EmailAccount[] = [
  // Work Accounts
  {
    id: 'acc1',
    name: 'Corporate Email',
    email: 'you@company.com',
    provider: 'Gmail',
    type: 'Work',
    isDefault: true,
    avatar: 'https://ui-avatars.com/api/?name=Corporate&background=3b82f6&color=fff',
  },
  {
    id: 'acc2',
    name: 'Project Team',
    email: 'you@projects.company.com',
    provider: 'Outlook',
    type: 'Work',
    isDefault: false,
    avatar: 'https://ui-avatars.com/api/?name=Project&background=2563eb&color=fff',
  },
  // Personal Accounts
  {
    id: 'acc3',
    name: 'Personal Gmail',
    email: 'you@gmail.com',
    provider: 'Gmail',
    type: 'Personal',
    isDefault: false,
    avatar: 'https://ui-avatars.com/api/?name=Personal&background=10b981&color=fff',
  },
  {
    id: 'acc4',
    name: 'Personal Yahoo',
    email: 'you@yahoo.com',
    provider: 'Yahoo',
    type: 'Personal',
    isDefault: false,
    avatar: 'https://ui-avatars.com/api/?name=Yahoo&background=059669&color=fff',
  },
  // Family Account
  {
    id: 'acc5',
    name: 'Family Updates',
    email: 'you@family.net',
    provider: 'Other',
    type: 'Family',
    isDefault: false,
    avatar: 'https://ui-avatars.com/api/?name=Family&background=f97316&color=fff',
  },
  // School Account
  {
    id: 'acc6',
    name: 'University',
    email: 'you@university.edu',
    provider: 'Outlook',
    type: 'School',
    isDefault: false,
    avatar: 'https://ui-avatars.com/api/?name=University&background=7c3aed&color=fff',
  },
  // Community Account
  {
    id: 'acc7',
    name: 'Board Advisory',
    email: 'you@board.org',
    provider: 'Gmail',
    type: 'Community',
    isDefault: false,
    avatar: 'https://ui-avatars.com/api/?name=Board&background=dc2626&color=fff',
  },
  // Other Account
  {
    id: 'acc8',
    name: 'Newsletter Subscriptions',
    email: 'you@news.me',
    provider: 'Other',
    type: 'Other',
    isDefault: false,
    avatar: 'https://ui-avatars.com/api/?name=News&background=64748b&color=fff',
  },
]

export const mockFolders: EmailFolder[] = [
  { id: 'inbox', name: 'Inbox', type: 'inbox', unreadCount: 12, totalCount: 145, accountId: 'acc1' },
  { id: 'sent', name: 'Sent', type: 'sent', unreadCount: 0, totalCount: 78, accountId: 'acc1' },
  { id: 'drafts', name: 'Drafts', type: 'drafts', unreadCount: 0, totalCount: 3, accountId: 'acc1' },
  { id: 'archive', name: 'Archive', type: 'custom', unreadCount: 0, totalCount: 234, accountId: 'acc1' },
  { id: 'all-folders', name: 'All Folders', type: 'custom', unreadCount: 14, totalCount: 460, accountId: 'acc1' },
]

export const mockLabels: EmailLabel[] = [
  { id: 'important', name: 'Important', color: '#ef4444', accountId: 'acc1' },
  { id: 'todo', name: 'To-Do', color: '#f59e0b', accountId: 'acc1' },
  { id: 'waiting', name: 'Waiting', color: '#8b5cf6', accountId: 'acc1' },
  { id: 'personal', name: 'Personal', color: '#06b6d4', accountId: 'acc1' },
  { id: 'finance', name: 'Finance', color: '#10b981', accountId: 'acc1' },
]

// Inbox statistics per account
export const mockInboxStats = {
  'all': {
    totalEmails: 423,
    clearedEmails: 298,
    remainingEmails: 125,
    clearancePercentage: 70,
    accountName: 'All Accounts'
  },
  'acc1': {
    totalEmails: 145,
    clearedEmails: 125,
    remainingEmails: 20,
    clearancePercentage: 86,
    accountName: 'Corporate Email'
  },
  'acc2': {
    totalEmails: 89,
    clearedEmails: 65,
    remainingEmails: 24,
    clearancePercentage: 73,
    accountName: 'Project Team'
  },
  'acc3': {
    totalEmails: 156,
    clearedEmails: 98,
    remainingEmails: 58,
    clearancePercentage: 63,
    accountName: 'Personal Gmail'
  },
  'acc4': {
    totalEmails: 33,
    clearedEmails: 10,
    remainingEmails: 23,
    clearancePercentage: 30,
    accountName: 'Personal Yahoo'
  },
  'acc5': {
    totalEmails: 12,
    clearedEmails: 8,
    remainingEmails: 4,
    clearancePercentage: 67,
    accountName: 'Family Updates'
  },
  'acc6': {
    totalEmails: 67,
    clearedEmails: 45,
    remainingEmails: 22,
    clearancePercentage: 67,
    accountName: 'University'
  },
  'acc7': {
    totalEmails: 23,
    clearedEmails: 12,
    remainingEmails: 11,
    clearancePercentage: 52,
    accountName: 'News & Updates'
  },
  'type:Work': {
    totalEmails: 234,
    clearedEmails: 190,
    remainingEmails: 44,
    clearancePercentage: 81,
    accountName: 'Work Accounts'
  },
  'type:Personal': {
    totalEmails: 189,
    clearedEmails: 108,
    remainingEmails: 81,
    clearancePercentage: 57,
    accountName: 'Personal Accounts'
  },
  'type:Family': {
    totalEmails: 12,
    clearedEmails: 8,
    remainingEmails: 4,
    clearancePercentage: 67,
    accountName: 'Family Accounts'
  },
  'type:School': {
    totalEmails: 67,
    clearedEmails: 45,
    remainingEmails: 22,
    clearancePercentage: 67,
    accountName: 'School Accounts'
  },
  'type:News': {
    totalEmails: 23,
    clearedEmails: 12,
    remainingEmails: 11,
    clearancePercentage: 52,
    accountName: 'News Accounts'
  }
}

// Use a fixed base date to prevent hydration mismatches
const baseDate = new Date('2024-09-15T12:00:00Z')
const minutesAgo = (mins: number) => new Date(baseDate.getTime() - mins * 60000).toISOString()
const hoursAgo = (hours: number) => new Date(baseDate.getTime() - hours * 3600000).toISOString()
const daysAgo = (days: number) => new Date(baseDate.getTime() - days * 24 * 3600000).toISOString()

export const mockEmails: Email[] = [
  // Thread 1 - Q4 Budget Discussion (2 emails)
  {
    id: '1',
    messageId: 'msg-001',
    threadId: 'thread-001',
    from: 'sarah.wilson@techcorp.com',
    to: ['you@company.com'],
    subject: 'Q4 Budget Review Meeting - Action Items',
    body: `
      <p>Hi there,</p>
      
      <p>Following up on our Q4 budget review meeting from yesterday. Here are the key action items we discussed:</p>
      
      <ul>
        <li>Finalize marketing spend allocation by Friday</li>
        <li>Review IT infrastructure costs with the DevOps team</li>
        <li>Prepare quarterly projections for the board presentation</li>
        <li>Schedule follow-up with finance team for next week</li>
      </ul>
      
      <p>I've attached the meeting notes and updated budget spreadsheet. Please review and let me know if you have any questions.</p>
      
      <p>Best regards,<br>Sarah</p>
    `,
    attachments: [
      { id: 'att1', name: 'Q4-Budget-Notes.pdf', size: 245760, type: 'application/pdf' },
      { id: 'att2', name: 'Budget-Spreadsheet-v2.xlsx', size: 98304, type: 'application/vnd.ms-excel' }
    ],
    receivedAt: minutesAgo(15),
    isRead: false,
    isStarred: true,
    isImportant: true,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['important', 'todo'],
    folder: 'inbox',
    accountId: 'acc1',
  },
  // Thread 1 - Reply to Q4 Budget
  {
    id: '1b',
    messageId: 'msg-001b',
    threadId: 'thread-001',
    from: 'you@company.com',
    to: ['sarah.wilson@techcorp.com'],
    subject: 'Re: Q4 Budget Review Meeting - Action Items',
    body: `
      <p>Hi Sarah,</p>
      
      <p>Thanks for the summary! I've reviewed the action items and have a few updates:</p>
      
      <ul>
        <li>Marketing spend allocation - I've spoken with the team and we should have this ready by Thursday</li>
        <li>IT infrastructure review is scheduled for tomorrow morning</li>
        <li>Board presentation projections are 80% complete</li>
      </ul>
      
      <p>I'll send you the updated numbers by end of day Thursday.</p>
      
      <p>Best,<br>You</p>
    `,
    attachments: [],
    receivedAt: minutesAgo(10),
    isRead: true,
    isStarred: true,
    isImportant: true,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['important', 'todo'],
    folder: 'sent',
    accountId: 'acc1',
  },
  // Thread 1 - Another reply
  {
    id: '1c',
    messageId: 'msg-001c',
    threadId: 'thread-001',
    from: 'sarah.wilson@techcorp.com',
    to: ['you@company.com'],
    subject: 'Re: Q4 Budget Review Meeting - Action Items',
    body: `
      <p>Perfect!</p>
      
      <p>Thursday works well. I'll prepare the consolidated report for Friday's executive review.</p>
      
      <p>Let me know if you need any assistance with the IT infrastructure review.</p>
      
      <p>Sarah</p>
    `,
    attachments: [],
    receivedAt: minutesAgo(5),
    isRead: false,
    isStarred: true,
    isImportant: true,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['important', 'todo'],
    folder: 'inbox',
    accountId: 'acc1',
  },
  {
    id: '2',
    messageId: 'msg-002',
    threadId: 'thread-002',
    from: 'billing@cloudservice.com',
    to: ['you@company.com'],
    subject: 'Your Cloud Service Bill for December 2024',
    body: `
      <h2>Monthly Service Summary</h2>
      
      <p>Dear Customer,</p>
      
      <p>Your December 2024 bill is now ready. Here's a summary of your usage:</p>
      
      <table>
        <tr>
          <td><strong>Compute Hours:</strong></td>
          <td>1,245 hours</td>
        </tr>
        <tr>
          <td><strong>Storage Used:</strong></td>
          <td>2.3 TB</td>
        </tr>
        <tr>
          <td><strong>Data Transfer:</strong></td>
          <td>845 GB</td>
        </tr>
        <tr>
          <td><strong>Total Amount:</strong></td>
          <td><strong>$2,847.50</strong></td>
        </tr>
      </table>
      
      <p>Payment is due by January 15th, 2025. You can view your detailed bill and make a payment in your account dashboard.</p>
      
      <p>Thank you for your business!</p>
    `,
    attachments: [
      { id: 'att3', name: 'December-2024-Bill.pdf', size: 156432, type: 'application/pdf' }
    ],
    receivedAt: hoursAgo(2),
    isRead: false,
    isStarred: false,
    isImportant: false,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['finance'],
    folder: 'inbox',
    accountId: 'acc1',
  },
  // Thread 3 - Coffee discussion with multiple messages
  {
    id: '3',
    messageId: 'msg-003',
    threadId: 'thread-003',
    from: 'jane@gmail.com',
    to: ['you@gmail.com'],
    subject: 'Coffee this weekend?',
    body: `
      <p>Hey!</p>
      
      <p>Are you free this Saturday morning for coffee? I was thinking we could meet at that new place downtown around 10 AM.</p>
      
      <p>I have some exciting news to share with you! 😊</p>
      
      <p>Let me know if that works for you.</p>
      
      <p>xoxo,<br>Jane</p>
    `,
    attachments: [],
    receivedAt: minutesAgo(45),
    isRead: false,
    isStarred: true,
    isImportant: false,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['personal'],
    folder: 'inbox',
    accountId: 'acc3',
  },
  // Thread 3 - Reply
  {
    id: '3b',
    messageId: 'msg-003b',
    threadId: 'thread-003',
    from: 'you@gmail.com',
    to: ['jane@gmail.com'],
    subject: 'Re: Coffee this weekend?',
    body: `
      <p>Hi Jane!</p>
      
      <p>Saturday at 10 AM works perfectly! I'm excited to hear your news!</p>
      
      <p>See you at the new place downtown. Looking forward to catching up!</p>
      
      <p>Best,<br>You</p>
    `,
    attachments: [],
    receivedAt: minutesAgo(30),
    isRead: true,
    isStarred: true,
    isImportant: false,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['personal'],
    folder: 'sent',
    accountId: 'acc3',
  },
  {
    id: '4',
    messageId: 'msg-004',
    threadId: 'thread-004',
    from: 'family@updates.net',
    to: ['you@family.net'],
    subject: 'Family Reunion Planning - Summer 2024',
    body: `
      <p>Hi everyone!</p>
      
      <p>Hope you're all doing well. It's time to start planning our annual family reunion!</p>
      
      <h3>Proposed Details:</h3>
      <ul>
        <li><strong>Date:</strong> July 15-17, 2024</li>
        <li><strong>Location:</strong> Lake House in Vermont</li>
        <li><strong>Accommodation:</strong> Cabins nearby for those who need them</li>
      </ul>
      
      <p>Please let me know if these dates work for everyone. We'll need headcount by March 1st for planning purposes.</p>
      
      <p>Can't wait to see everyone!<br>Love,<br>Aunt Sarah</p>
    `,
    attachments: [],
    receivedAt: hoursAgo(3),
    isRead: false,
    isStarred: false,
    isImportant: false,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['personal'],
    folder: 'inbox',
    accountId: 'acc5',
  },
  {
    id: '5',
    messageId: 'msg-005',
    from: 'registrar@university.edu',
    to: ['you@university.edu'],
    subject: 'Course Registration Opens Tomorrow',
    body: `
      <p>Dear Student,</p>
      
      <p>This is a reminder that course registration for the Spring 2024 semester opens tomorrow at 8:00 AM EST.</p>
      
      <p><strong>Important Information:</strong></p>
      <ul>
        <li>Registration opens based on your class standing and credit hours</li>
        <li>Your registration time slot: 10:00 AM - 12:00 PM</li>
        <li>Make sure you've met with your academic advisor</li>
        <li>Prerequisites must be satisfied before enrollment</li>
      </ul>
      
      <p>Log into the student portal to access the registration system.</p>
      
      <p>Best regards,<br>University Registrar</p>
    `,
    attachments: [
      { id: 'att6', name: 'Spring-2024-Course-Catalog.pdf', size: 1024000, type: 'application/pdf' }
    ],
    receivedAt: daysAgo(1),
    isRead: true,
    isStarred: true,
    isImportant: true,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['important'],
    folder: 'inbox',
    accountId: 'acc6',
  },
  {
    id: '6',
    messageId: 'msg-006',
    from: 'board-secretary@board.org',
    to: ['you@board.org'],
    subject: 'Board Meeting Minutes - December 2024',
    body: `
      <h2>Board Meeting Minutes</h2>
      <p><strong>Date:</strong> December 15, 2024<br>
      <strong>Time:</strong> 2:00 PM - 4:30 PM<br>
      <strong>Location:</strong> Conference Room A</p>
      
      <h3>Attendees:</h3>
      <ul>
        <li>John Smith (Chair)</li>
        <li>Mary Johnson (Vice Chair)</li>
        <li>You (Advisory Member)</li>
        <li>Robert Brown (Treasurer)</li>
      </ul>
      
      <h3>Key Decisions:</h3>
      <ol>
        <li><strong>Budget Approval:</strong> 2025 budget approved with $2.5M allocation</li>
        <li><strong>New Initiative:</strong> Green energy project approved for Phase 1</li>
        <li><strong>Policy Update:</strong> Remote work policy revised</li>
      </ol>
      
      <p>Next meeting: January 19, 2025 at 2:00 PM.</p>
    `,
    attachments: [
      { id: 'att7', name: 'Board-Minutes-Dec-2024.pdf', size: 456789, type: 'application/pdf' },
      { id: 'att8', name: '2025-Budget-Summary.xlsx', size: 123456, type: 'application/vnd.ms-excel' }
    ],
    receivedAt: hoursAgo(12),
    isRead: false,
    isStarred: false,
    isImportant: true,
    isSpam: false,
    isTrash: false,
    isDraft: false,
    labels: ['important'],
    folder: 'inbox',
    accountId: 'acc7',
  },
]

export const mockThreads: EmailThread[] = [
  {
    id: 'thread-001',
    subject: 'Q4 Budget Review Meeting - Action Items',
    participants: ['sarah.wilson@techcorp.com', 'you@company.com'],
    lastActivity: minutesAgo(15),
    messageCount: 1,
    isUnread: true,
    isStarred: true,
    isImportant: true,
    labels: ['important', 'todo'],
    folder: 'inbox',
    accountId: 'acc1',
    emails: [mockEmails[0]]
  },
  {
    id: 'thread-002',
    subject: 'Your Cloud Service Bill for December 2024',
    participants: ['billing@cloudservice.com', 'you@company.com'],
    lastActivity: hoursAgo(2),
    messageCount: 1,
    isUnread: true,
    isStarred: false,
    isImportant: false,
    labels: ['finance'],
    folder: 'inbox',
    accountId: 'acc1',
    emails: [mockEmails[1]]
  },
]