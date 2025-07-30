# Ali FS App - Field Sales Application

A comprehensive field sales application built with React, Node.js, and HubSpot
integration. This monorepo contains both the frontend UI and backend service for
managing sales meetings, contacts, companies, and deals.

## 🏗️ Project Structure

```
ali-fs-app/
├── apps/
│   ├── hubspot-service/     # Backend API service
│   └── hubspot-ui/         # Frontend React application
├── packages/                # Shared packages and configurations
│   ├── eslint-prettier-config/
│   ├── jest-playwight-config/
│   ├── typescript-config/
│   └── utils/
├── package.json            # Root package.json for monorepo
├── turbo.json             # Turborepo configuration
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- npm >= 10.8.2
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ali-fs-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** Create `.env` files in both apps:

   **apps/hubspot-service/.env**
   ```env
   PORT=3000
   HUBSPOT_CLIENT_ID=your_hubspot_client_id
   HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
   SESSION_SECRET=your_session_secret
   ```

   **apps/hubspot-ui/.env**
   ```env
   VITE_PUBLIC_API_BASE_URL=http://localhost:3000
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

## 📁 Detailed Structure

### Apps

#### `apps/hubspot-service/` - Backend API

- **Technology**: Node.js, Express.js
- **Key Features**:
  - HubSpot API integration
  - Google Calendar integration
  - File upload handling
  - Session management
  - Zapier webhook integration

**Key Endpoints**:

- `POST /api/meetings/create` - Create meetings
- `POST /api/company/note` - Send notes to Zapier
- `POST /api/hubspot/contact/create` - Create contacts
- `GET /api/companies/search` - Search companies
- `POST /api/meeting/send-voice` - Handle voice notes

#### `apps/hubspot-ui/` - Frontend Application

- **Technology**: React, TypeScript, Vite, Tailwind CSS
- **Key Features**:
  - Meeting management
  - Contact and company search
  - Voice recording
  - File uploads
  - Real-time updates

**Key Components**:

- `ContactSearch.tsx` - Contact search with duplicate detection
- `CompanySearch.tsx` - Company search functionality
- `AudioRecorder.tsx` - Voice recording component
- `FileUploader.tsx` - File upload handling
- `MeetingCard.tsx` - Meeting display component

### Packages

#### `packages/eslint-prettier-config/`

Shared ESLint and Prettier configurations for consistent code formatting.

#### `packages/jest-playwight-config/`

Shared testing configurations for Jest and Playwright.

#### `packages/typescript-config/`

Shared TypeScript configurations for different project types.

#### `packages/utils/`

Shared utility functions and Zustand store configurations.

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start all apps in development mode
npm run dev:federation   # Start with module federation

# Building
npm run build            # Build all apps
npm run build:dev        # Build in development mode

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run end-to-end tests

# Linting and Formatting
npm run lint             # Lint all code
npm run format           # Format all code
npm run format:check     # Check formatting without changes

# Type Checking
npm run check-types      # Type check all TypeScript files
```

### Key Features

#### 1. Meeting Management

- Create and schedule meetings
- Track meeting outcomes (positive/negative/follow-up)
- Voice recording and text notes
- File uploads for contracts

#### 2. Contact Management

- Search existing contacts
- Create new contacts with duplicate detection
- Associate contacts with companies
- Handle contact relationships

#### 3. Company Management

- Search and create companies
- Associate companies with deals
- Handle company data and relationships

#### 4. Deal Management

- Create and manage deals
- Track deal stages and outcomes
- Associate deals with companies and contacts

#### 5. Integration Features

- **HubSpot Integration**: Full CRM integration
- **Google Calendar**: Meeting scheduling and sync
- **Zapier Webhooks**: Note processing and automation
- **Voice Recording**: Audio note capture
- **File Uploads**: Contract and document handling

## 🗄️ Database & External Services

### HubSpot CRM

- **Contacts**: Customer contact management
- **Companies**: Business entity management
- **Deals**: Sales opportunity tracking
- **Meetings**: Meeting scheduling and outcomes
- **Notes**: Meeting notes and documentation

### Google Calendar

- Meeting scheduling and synchronization
- Calendar event creation and updates
- Time zone handling

### Zapier Integration

- Webhook endpoints for note processing
- Automated workflows for data processing
- Integration with external services

## 🔐 Authentication & Security

### Session Management

- Express sessions for user authentication
- HubSpot OAuth integration
- Secure token handling

### Environment Variables

- Sensitive data stored in environment variables
- Separate configurations for development and production
- Secure API key management

## 🧪 Testing

### Unit Testing

- Jest configuration for unit tests
- Component testing with React Testing Library
- API endpoint testing

### End-to-End Testing

- Playwright for E2E testing
- Cross-browser testing support
- Automated test workflows

## 📦 Deployment

### Production Build

```bash
npm run build
```

### Environment Setup

- Configure production environment variables
- Set up HubSpot production credentials
- Configure Google Calendar production settings
- Set up Zapier production webhooks

### Deployment Options

- **Frontend**: Vercel, Netlify, or similar
- **Backend**: Heroku, Railway, or similar
- **Database**: HubSpot (managed service)

## 🔄 Key Workflows

### Meeting Flow

1. **Create Meeting**: Schedule with company/contact
2. **Conduct Meeting**: Use app during meeting
3. **Record Outcome**: Voice/text notes
4. **Process Results**: Update deals and contacts
5. **Follow-up**: Schedule next steps

### Contact Management Flow

1. **Search Contacts**: Find existing contacts
2. **Create New**: Add new contacts with validation
3. **Associate**: Link contacts to companies
4. **Update**: Modify contact information

### Deal Management Flow

1. **Create Deal**: Initialize sales opportunity
2. **Track Progress**: Update deal stages
3. **Record Outcomes**: Positive/negative results
4. **Follow-up**: Schedule next actions

## 🐛 Troubleshooting

### Common Issues

#### Backend Issues

- **HubSpot API Errors**: Check credentials and permissions
- **Session Issues**: Verify session configuration
- **File Upload Errors**: Check file size and format limits

#### Frontend Issues

- **Build Errors**: Check TypeScript configurations
- **API Connection**: Verify backend URL configuration
- **Component Errors**: Check React dependencies

#### Integration Issues

- **Google Calendar**: Verify OAuth setup
- **Zapier Webhooks**: Check webhook URLs and payloads
- **HubSpot Sync**: Verify API permissions

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Check specific service
DEBUG=hubspot-service:* npm run dev
```

## 📚 Additional Resources

### Documentation

- [HubSpot API Documentation](https://developers.hubspot.com/)
- [Google Calendar API](https://developers.google.com/calendar)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Key Dependencies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, HubSpot API Client
- **Testing**: Jest, Playwright, React Testing Library
- **Build Tools**: Turborepo, ESLint, Prettier

## 🤝 Contributing

### Code Style

- Follow ESLint and Prettier configurations
- Use TypeScript for type safety
- Write meaningful commit messages
- Include tests for new features

### Development Process

1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

## 📞 Support

For questions or issues:

1. Check existing documentation
2. Review troubleshooting section
3. Check GitHub issues
4. Contact development team

---

**Last Updated**: December 2024 **Version**: 1.0.0
