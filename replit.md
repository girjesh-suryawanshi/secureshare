# replit.md

## Overview

This is a peer-to-peer (P2P) file sharing application called "SecureShare" built with a modern web stack. The application enables direct file transfers between devices without storing files on a server, using WebRTC for peer-to-peer connections and WebSocket for signaling coordination.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React hooks with TanStack Query for server state
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Real-time Communication**: WebSocket server for signaling coordination
- **Database**: Drizzle ORM configured for PostgreSQL (schema ready but minimal storage needed)
- **Session Management**: Minimal in-memory storage for connection tracking
- **File Transfer**: Pure P2P via WebRTC data channels (no server storage)

## Key Components

### Core Application Features
1. **Simple Two-Button Interface**: Just "Send File" and "Receive File" buttons
2. **Multiple File Selection**: Users can select and send multiple files at once
3. **6-Digit Code System**: Alphanumeric codes for easy file sharing
4. **ZIP Download**: Multiple files are automatically packaged as ZIP for download
5. **Direct Transfer**: No server storage - files transfer through temporary memory
6. **Mobile Responsive**: Clean, minimal UI that works on all devices

### UI Components Structure
- **Connection Panel**: Device pairing and connection status
- **File Transfer Panel**: File selection and transfer initiation
- **Incoming Files**: Handle incoming transfer requests
- **Status Bar**: Real-time connection and transfer status
- **Toast Notifications**: User feedback and error handling

### WebRTC Implementation
- **Signaling Server**: WebSocket-based coordination for connection establishment
- **STUN Servers**: Google STUN servers for NAT traversal
- **Data Channels**: Chunked file transfer with progress tracking
- **Connection Management**: Automatic cleanup and reconnection handling

## Data Flow

1. **File Upload Process**:
   - User selects single or multiple files through file picker
   - Files converted to base64 for transmission
   - Server generates 6-digit alphanumeric code
   - Files temporarily stored in server memory with code association

2. **File Download Process**:
   - Receiver enters 6-digit code in app
   - Server validates code and retrieves associated files
   - Single file: Direct download
   - Multiple files: Automatically packaged as ZIP file
   - Files removed from server memory after 1 hour

3. **State Management**:
   - WebSocket connection managed by custom hook
   - File upload/download progress tracked in React state
   - Toast notifications provide user feedback
   - Simple mode switching between send/receive/select states

## External Dependencies

### Frontend Dependencies
- **UI Components**: Extensive Radix UI component library
- **Icons**: Lucide React for consistent iconography
- **File Handling**: Browser File API for reading selected files
- **WebRTC**: Native browser WebRTC APIs for peer connections

### Backend Dependencies
- **WebSocket**: 'ws' library for WebSocket server implementation
- **Database**: Neon serverless PostgreSQL with Drizzle ORM
- **Utilities**: nanoid for generating unique connection IDs
- **Development**: tsx for TypeScript execution in development

### Build Dependencies
- **Bundling**: esbuild for production server bundling
- **Development**: Vite with React plugin and error overlay
- **CSS Processing**: PostCSS with Tailwind CSS and Autoprefixer

## Deployment Strategy

### Development Environment
- **Server**: tsx running Express server with hot reload
- **Client**: Vite dev server with HMR and React Fast Refresh
- **Database**: Drizzle push for schema synchronization
- **WebSocket**: Same-port WebSocket server for development

### Production Build
- **Client Build**: Vite builds optimized React bundle to dist/public
- **Server Build**: esbuild bundles Express server to dist/index.js
- **Static Serving**: Express serves built client files in production
- **Database Migration**: Drizzle migrations for schema changes

### Architecture Decisions

1. **P2P Over Server Storage**: Chose WebRTC for direct transfers to eliminate server storage costs and improve privacy
2. **WebSocket Signaling**: Used WebSocket instead of HTTP polling for real-time signaling coordination
3. **Minimal Database**: Database schema present but minimal usage since transfers are peer-to-peer
4. **Shadcn/ui**: Selected for consistent, accessible components with Tailwind integration
5. **TypeScript Throughout**: Full TypeScript implementation for type safety across client and server
6. **Vite Build System**: Chosen for fast development experience and optimized production builds

The application prioritizes user privacy by keeping file transfers completely peer-to-peer while maintaining a simple, intuitive interface for cross-device file sharing.