# BoxZero NG V2 - Next Generation Email Client

A modern, intelligent email client built with Next.js, featuring AI-powered organization, beautiful themes, and an intuitive interface inspired by modern email workflows.

## 🚀 Features

### Core Email Features
- **Multi-Account Support**: Manage multiple email accounts (Gmail, Outlook, Yahoo, etc.)
- **Smart Inbox**: AI-powered email categorization and prioritization
- **Advanced Search**: Powerful search with filters (date, sender, attachments, etc.)
- **Rich Compose**: Modern email composition with attachment support
- **Thread Management**: Intelligent email threading and conversation view

### Modern UI/UX
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **Dark/Light Themes**: 8 beautiful color themes inherited from Agenda project
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Keyboard Shortcuts**: Power-user friendly navigation
- **Accessibility**: WCAG compliant design

### Smart Features
- **Auto-categorization**: Automatic labeling and folder organization
- **Smart Notifications**: Non-intrusive toast notifications
- **Draft Auto-save**: Never lose your composed emails
- **Quick Actions**: One-click archive, delete, star, and reply
- **Attachment Preview**: Visual attachment management

## 🎨 Available Themes

1. **Ocean Blue** (Default) - Calm and professional
2. **Emerald Green** - Fresh and natural
3. **Sunset Orange** - Warm and energetic
4. **Vibrant Rainbow** - Vibrant and playful
5. **Desert Sand** - Warm and golden
6. **Rose Gold** - Elegant and sophisticated
7. **Professional Slate** - Clean and minimal
8. **Lavender Dream** - Soft and dreamy

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom themes
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Icons**: Heroicons
- **Notifications**: React Hot Toast
- **Rich Text Editor**: TipTap (for future email composition)
- **Database**: Prisma with SQLite (for future backend integration)

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BoxzeroNGV2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm run start
```

## ⌨️ Keyboard Shortcuts

- `Cmd/Ctrl + N` - Compose new email
- `Cmd/Ctrl + K` - Focus search bar
- `Cmd/Ctrl + T` - Open theme selector
- `Escape` - Close modals/dialogs

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
├── components/
│   └── EmailClient/        # Email client components
│       ├── EmailClient.tsx # Main email client container
│       ├── Sidebar.tsx     # Navigation sidebar
│       ├── EmailList.tsx   # Email list view
│       ├── EmailView.tsx   # Email detail view
│       ├── ComposeModal.tsx# Email composition
│       ├── SearchBar.tsx   # Search and filters
│       └── ThemeSelector.tsx# Theme selection modal
├── contexts/
│   └── ThemeContext.tsx    # Theme management
├── types/
│   └── email.ts           # TypeScript type definitions
├── lib/
│   └── mockData.ts        # Mock data for development
└── hooks/                 # Custom React hooks (future)
```

## 🎯 Key Components

### EmailClient
Main container component that orchestrates the entire email client interface and handles global state management.

### Sidebar
Navigation sidebar with account switching, folder management, and theme selection.

### EmailList
Displays filtered and searchable list of emails with smart categorization and visual indicators.

### EmailView
Rich email viewer with attachment support, reply/forward actions, and thread management.

### ComposeModal
Modern email composition interface with recipient management, rich text editing, and attachment support.

### ThemeSelector
Beautiful theme selection modal with live preview and instant switching.

## 🚀 Future Enhancements

- **Backend Integration**: Connect to real email providers via APIs
- **AI Features**: Smart replies, email summarization, and priority detection
- **Offline Support**: Progressive Web App with offline capabilities
- **Plugin System**: Extensible architecture for custom features
- **Calendar Integration**: Meeting scheduling and event management
- **Security Features**: Enhanced encryption and privacy controls
- **Mobile App**: React Native version for iOS and Android

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Agenda Project**: Theme system and color schemes
- **Heroicons**: Beautiful icon library
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Next.js Team**: Amazing React framework

---

Built with ❤️ using the same technology stack as the Agenda project, featuring its beautiful 8-theme color system for a consistent and delightful user experience.