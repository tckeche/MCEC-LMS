# MCEC LMS Design Guidelines

## Design Approach

**System-Based Approach**: Drawing from modern productivity and educational platforms (Linear, Notion, Google Classroom), emphasizing clarity, information hierarchy, and efficient workflows. This LMS prioritizes usability and data comprehension over decorative elements.

## Core Design Principles

1. **Information Clarity**: Dense data must be scannable and digestible
2. **Role-Appropriate Interfaces**: Each user type sees contextually relevant tools
3. **Consistent Patterns**: Reusable components across all dashboards
4. **Trust Through Professionalism**: Clean, reliable, educational-grade aesthetics

---

## Typography System

**Font Stack**: 
- Primary: Inter (via Google Fonts) - body text, UI elements, data tables
- Secondary: Space Grotesk (via Google Fonts) - headings, section titles

**Hierarchy**:
- Page Titles: `text-3xl font-bold` (Space Grotesk)
- Section Headers: `text-xl font-semibold` (Space Grotesk)
- Card Titles: `text-lg font-medium` (Inter)
- Body Text: `text-base font-normal` (Inter)
- Metadata/Labels: `text-sm font-medium` (Inter)
- Captions/Hints: `text-xs` (Inter)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: `p-4`, `p-6`, `p-8`
- Section gaps: `gap-6`, `gap-8`
- Page margins: `mx-4 md:mx-8`, `my-6 md:my-8`

**Container Strategy**:
- Dashboard content: `max-w-7xl mx-auto px-4 md:px-8`
- Forms/Modals: `max-w-2xl`
- Data tables: Full-width within container with horizontal scroll on mobile

**Grid Patterns**:
- Dashboard cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Stats widgets: `grid grid-cols-2 md:grid-cols-4 gap-4`
- Course listings: `grid grid-cols-1 lg:grid-cols-2 gap-6`

---

## Component Library

### Navigation
**Top Navigation Bar** (all roles):
- Height: `h-16`
- Logo (left), role-specific menu items (center), user profile dropdown (right)
- Sticky positioning: `sticky top-0 z-50`
- Shadow: `shadow-sm`

**Sidebar Navigation** (Tutors, Managers, Admins):
- Width: `w-64` (desktop), collapsible to icon-only on mobile
- Fixed positioning with smooth transitions
- Icons from Heroicons (outline style)
- Active state: subtle background treatment

### Dashboard Cards
**Stat Card**:
- Structure: Icon + Label + Value + Trend indicator
- Padding: `p-6`
- Border: `border rounded-lg`
- Hover: subtle lift effect

**Course Card**:
- Course image placeholder (16:9 aspect ratio) or icon
- Title, instructor, progress bar, enrollment count
- Padding: `p-4`
- Actions: View, Enroll/Manage buttons

**Assignment Card**:
- Status badge (Due Soon, Submitted, Graded)
- Title, due date, points possible
- Submission button or grade display
- Padding: `p-4`

### Data Tables
**Grade Book / Student Roster**:
- Sticky header row: `sticky top-0`
- Alternating row backgrounds for readability
- Sortable columns with arrow indicators
- Responsive: scroll horizontally on mobile with fixed first column
- Cell padding: `px-4 py-3`

### Forms
**Course Creation / Assignment Submission**:
- Label above input pattern
- Input spacing: `space-y-4`
- Full-width inputs with consistent height: `h-10` for text inputs
- Textarea: minimum `h-32`
- Submit buttons: Full-width on mobile, inline on desktop

### Modals & Overlays
**Dialogs** (confirmations, quick views):
- Max width: `max-w-md` (confirmations), `max-w-4xl` (content views)
- Padding: `p-6`
- Backdrop: semi-transparent overlay
- Close button (top-right)

---

## Role-Specific Layouts

### Student Dashboard
**Layout**: 3-column grid on desktop (upcoming assignments, enrolled courses, recent grades)
**Key Sections**: 
- Hero stats: Total courses, assignments due, current GPA
- Calendar widget showing due dates
- Course progress cards with completion percentages

### Tutor Dashboard
**Layout**: Sidebar navigation + main content area
**Key Sections**:
- Course management cards
- Quick actions: Create assignment, grade submissions
- Student roster table with performance metrics
- Analytics charts (submission rates, average grades)

### Parent Dashboard
**Layout**: Child selector dropdown + multi-section scroll
**Key Sections**:
- Child progress overview (multiple children support)
- Upcoming assignments across all courses
- Grade summary table
- Communication feed from tutors

### Manager Dashboard
**Layout**: Full-width analytics-focused
**Key Sections**:
- System-wide metrics (4-stat grid)
- Tutor performance table
- Course enrollment trends (data visualization)
- Recent activity feed

### Admin Dashboard
**Layout**: Sidebar + tabbed interface
**Key Sections**:
- User management table (search, filter, role assignment)
- System settings forms
- Audit log table
- Bulk operations interface

---

## Icons & Assets

**Icon Library**: Heroicons (outline style for navigation, solid for status indicators)
- Academic: `AcademicCapIcon`, `BookOpenIcon`
- Actions: `PlusIcon`, `PencilIcon`, `TrashIcon`
- Status: `CheckCircleIcon`, `ExclamationCircleIcon`, `ClockIcon`

**Placeholder Images**: Use `https://placehold.co/` for course thumbnails
- Course cards: 600x400 (3:2 ratio)
- User avatars: 40x40, 64x64, 128x128 (circular)

---

## Interaction Patterns

**Animations**: Minimal and purposeful
- Page transitions: None (instant navigation)
- Hover states: Subtle scale (1.02) or opacity change
- Loading states: Skeleton screens for data tables, spinner for forms

**Feedback**:
- Toast notifications (top-right): Success, error, info messages
- Inline validation for forms (immediate feedback)
- Progress indicators for multi-step processes (assignment submission, course creation)

---

## Accessibility

- All interactive elements: minimum touch target `h-10 w-10`
- Focus rings: clearly visible on all focusable elements
- Form labels: always visible, never placeholder-only
- Skip navigation link for keyboard users
- ARIA labels for icon-only buttons
- Sufficient contrast ratios (WCAG AA minimum)

---

## Responsive Behavior

**Breakpoints** (Tailwind defaults):
- Mobile: < 768px (single column, stacked navigation)
- Tablet: 768px - 1024px (2-column grids, visible sidebar)
- Desktop: > 1024px (3+ column grids, persistent sidebar)

**Mobile-First Considerations**:
- Bottom navigation bar for Students (quick access to courses, assignments, grades, profile)
- Collapsible sidebar for Tutors/Managers/Admins
- Full-width cards on mobile, grid on tablet+
- Simplified data tables with essential columns only