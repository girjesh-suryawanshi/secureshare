# HexaSend Admin Dashboard Design Guidelines

## Design Approach
**Hybrid System**: Linear's dashboard aesthetics + Notion's content editing experience, maintaining HexaSend's blue/purple gradient brand identity.

## Typography
- **Primary Font**: Inter (Google Fonts)
- **Headings**: 600-700 weight, sizes: text-2xl (dashboard title), text-lg (section headers)
- **Body**: 400-500 weight, text-base for content, text-sm for metadata
- **Code/Technical**: JetBrains Mono for any code snippets or technical content

## Layout System
**Spacing Primitives**: Tailwind units of 3, 4, 6, 8, 12
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Container margins: mx-auto with max-w-6xl

**Dashboard Structure**:
- Fixed sidebar (240px width) with gradient background (blue/purple theme)
- Main content area with max-w-4xl center-aligned for optimal reading
- Top bar (h-16) with breadcrumbs and user profile

## Core Components

**Sidebar Navigation**:
- Logo at top with subtle gradient glow
- Navigation items: Dashboard, Blog Posts, New Post, Analytics, Settings
- Active state: lighter background with subtle left border accent
- Icons from Heroicons (CDN)

**Blog Editor Interface**:
- Two-column layout (60/40 split on desktop, stacked on mobile)
- Left: Rich text editor with floating toolbar
- Right: Live preview pane with published appearance
- Editor toolbar: sticky positioning, subtle shadow, icons for formatting

**Post Management**:
- Card-based list view with thumbnail, title, date, status badge
- Status badges: Draft (gray), Scheduled (blue), Published (gradient)
- Quick actions: Edit, Preview, Delete (icon buttons)

**Publishing Panel** (Right sidebar when editing):
- Publish button (prominent, gradient background matching brand)
- Schedule picker (date/time)
- Category tags (multi-select chips)
- Featured image uploader with preview
- SEO metadata fields (collapsible)

## Component Library

**Input Fields**:
- Clean borders (border-gray-200)
- Focus state: blue ring matching brand
- Labels above inputs (text-sm, font-medium)

**Buttons**:
- Primary: Gradient background (blue→purple), white text, rounded-lg, px-6 py-3
- Secondary: Border with gradient on hover, px-4 py-2
- Danger: Red outline, red text on hover

**Cards**:
- White background, rounded-xl, subtle shadow
- Padding: p-6
- Border: 1px solid gray-100

**Tables/Lists**:
- Alternating row backgrounds (subtle)
- Hover state: light gray background
- Headers: sticky, font-semibold, border-bottom

## Images
**No hero image needed** - this is a functional dashboard, not marketing.

**Required Images**:
1. **Blog post thumbnails** (16:9 aspect ratio, 400x225px) - displayed in post list cards
2. **Featured images** (shown in preview pane and upload interface)
3. **User avatar** (top right corner, 32x32px, circular)

## Animations
**Minimal approach**:
- Smooth transitions on hover (150ms)
- Fade-in for modal overlays (200ms)
- NO elaborate scroll animations or motion graphics

## Key Dashboard Screens

**Main Dashboard View**:
- Stats cards row: Total Posts, Published This Week, Drafts (3 cards, gradient borders)
- Recent posts table with quick actions
- Activity feed sidebar

**New/Edit Post View**:
- Full-width editor with distraction-free mode toggle
- Floating save indicator (top right)
- Auto-save status display

**Post List View**:
- Filters: Status, Date range, Category (horizontal row)
- Search bar with real-time filtering
- Bulk actions: Delete, Change status

## Accessibility
- All form inputs have associated labels
- Focus indicators on all interactive elements
- Semantic HTML structure maintained
- ARIA labels for icon-only buttons
- Keyboard navigation support throughout