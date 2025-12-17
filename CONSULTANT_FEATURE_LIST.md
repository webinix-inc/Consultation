# Consultant Feature List - Comprehensive Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication & Onboarding](#authentication--onboarding)
3. [Dashboard](#dashboard)
4. [Client Management](#client-management)
5. [Appointment Management](#appointment-management)
6. [Profile Management](#profile-management)
7. [Analytics & Reporting](#analytics--reporting)
8. [Notifications](#notifications)
9. [Settings & Configuration](#settings--configuration)
10. [Public Profile](#public-profile)

---

## 🎯 Overview

The Consultant panel is part of the **Consultant** frontend application (`Consultant` folder), which serves both Client and Consultant roles. Consultants can manage their practice, clients, appointments, and professional profile through a comprehensive dashboard interface.

**Access Routes:** All routes are prefixed with `/` (root level)
**Technology Stack:** React 18.3.1, TypeScript, Tailwind CSS, Radix UI, React Query, Redux Toolkit

---

## 🔐 Authentication & Onboarding

### Login
- **OTP-based Authentication**
  - Mobile number login
  - OTP verification via `/api/v1/auth/send-otp`
  - OTP verification via `/api/v1/auth/verify-otp`
  - Auto-login after successful OTP verification
  - Session persistence with localStorage
  - Role-based redirect after login

### Registration
- **User Registration**
  - Registration via `/api/v1/auth/register`
  - Profile completion workflow
  - Role assignment: "Consultant"
  - Email and mobile verification

### Profile Completion
- **Complete Profile Page** (`/complete-profile`)
  - Initial consultant profile setup
  - Professional information collection
  - Category and specialization selection
  - Profile validation

---

## 📊 Dashboard

### Consultant Dashboard (`/dashboard`)
- **Welcome Section**
  - Personalized greeting with consultant name
  - Practice overview message
  - Quick action buttons

- **Key Metrics Cards**
  - **Total Appointments**
    - Complete appointment count
    - Visual gauge/chart
    - Trend indicators
  
  - **Today's Appointments**
    - Current day appointments
    - Quick access to today's schedule
  
  - **Active Clients**
    - Total active clients count
    - Client engagement metrics
    - Client growth indicators
  
  - **Monthly Revenue**
    - Revenue summary
    - Currency formatting (₹)
    - Revenue trends

- **Client Statistics Gauge**
  - Visual client engagement gauge
  - Active vs Inactive clients
  - Percentage breakdown
  - Color-coded visualization

- **Recent Appointments Widget**
  - Latest appointments list
  - Client names and avatars
  - Appointment details preview
  - Quick navigation to appointments
  - Status indicators

- **Quick Actions**
  - Create new appointment
  - Add new client
  - View analytics
  - Access settings

---

## 👥 Client Management

### Clients Page (`/clients`)
- **Client Listing**
  - Grid/list view of all clients
  - Client cards with avatars
  - Client information preview
  - Status indicators

- **Client Information Display**
  - Full name
  - Email address
  - Mobile number
  - Avatar/profile picture
  - Status badge (Active/Inactive)
  - Linked date

- **Client Actions**
  - **View Client Profile** (`/client-profile/:clientId`)
    - Complete client details
    - Tabbed interface (Profile, Bookings, Documents, Payments)
    - Client statistics
    - Recent activity
  
  - **Link New Client**
    - Search for clients
    - Link existing clients
    - Create client relationship
  
  - **Unlink Client**
    - Remove client relationship
    - Confirmation dialog
  
  - **Filter Clients**
    - Search by name/email
    - Filter by status
    - Sort options

- **Client Profile Details Page** (`/client-profile/:clientId`)
  - **Profile Tab**
    - Client personal information
    - Contact details
    - Address information
    - Emergency contact
    - Profile picture
  
  - **Bookings Tab**
    - All appointments with client
    - Upcoming appointments
    - Past appointments
    - Appointment details
    - Status tracking
  
  - **Documents Tab**
    - Client documents list
    - Document categories
    - Upload documents
    - View/download documents
  
  - **Payments Tab**
    - Payment history
    - Transaction details
    - Invoice information
    - Payment status

- **Client Statistics**
  - Total appointments
  - Completed appointments
  - Upcoming appointments
  - Total amount spent
  - Client engagement metrics

- **Auto-Link Feature**
  - Automatic client linking on appointment creation
  - Manual linking option
  - Link verification

---

## 📅 Appointment Management

### Appointments Page (`/appointments`)
- **Appointment List View**
  - All consultant appointments
  - Calendar view option
  - List view option
  - Filter by status (Upcoming, Confirmed, Completed, Cancelled)
  - Filter by date range
  - Filter by client

- **Appointment Cards**
  - Client information with avatar
  - Date and time display
  - Appointment status badges
  - Category/tag display
  - Session type indicator (Video Call)
  - Fee information

- **Appointment Actions**
  - **Create Appointment**
    - Select client
    - Choose date and time
    - Select available slot
    - Add appointment notes
    - Set appointment fee
    - Confirm booking
  
  - **View Appointment Details**
    - Full appointment information
    - Client details snapshot
    - Consultant details snapshot
    - Payment information
    - Notes and reason
  
  - **Update Appointment**
    - Reschedule appointment
    - Update appointment notes
    - Change appointment status
    - Update fee information
  
  - **Cancel Appointment**
    - Cancel with reason
    - Refund processing (if applicable)
    - Notification to client

- **Available Slots Management**
  - View available time slots
  - Slot generation based on working hours
  - Conflict detection
  - Real-time slot availability

- **Appointment Status Management**
  - **Upcoming**: Scheduled appointments
  - **Confirmed**: Confirmed by client/consultant
  - **Completed**: Finished appointments
  - **Cancelled**: Cancelled appointments

- **Live Appointment Indicators**
  - "Join Now" for active appointments
  - Time remaining display
  - Session start/end time

---

## 👤 Profile Management

### Consultant Profile (`/profile`)
- **Profile Header**
  - Profile picture/avatar
  - Full name and display name
  - Bio title
  - Professional category
  - Status badge

- **Basic Information**
  - First name and last name
  - Display name
  - Email address
  - Phone number
  - Alternate phone
  - Gender
  - Department

- **Professional Details**
  - Category selection
  - Subcategory selection
  - Registration number
  - Years of experience
  - Bio title
  - Consultation fees
  - Tags/specializations
  - Languages spoken

- **About Section**
  - Professional bio/description
  - Rich text editor support
  - Character limit management

- **Education Section**
  - Add multiple education entries
  - Institute name
  - Qualification/degree
  - Start year and end year
  - Description
  - Add/remove education entries

- **Experience Section**
  - Add multiple work experience entries
  - Company name
  - Role/position
  - Start year and end year
  - Years of experience
  - Description
  - Add/remove experience entries

- **Awards Section**
  - Add awards and recognitions
  - Award title
  - Year received
  - Description
  - Add/remove awards

- **Social Media Links**
  - Website URL
  - LinkedIn profile
  - Twitter/X profile
  - Instagram profile
  - Facebook profile

- **Address Information**
  - Street address
  - City
  - State
  - Country
  - Pincode

- **Profile Picture Management**
  - Upload profile image
  - Image preview
  - Image cropping (if implemented)
  - Remove profile picture

- **Profile Settings**
  - Status management (Active, Pending, Rejected, Blocked)
  - Public profile visibility
  - Profile completion indicator

---

## 📈 Analytics & Reporting

### Analytics Dashboard (`/analytics`)
- **Revenue Analytics**
  - **Monthly Revenue Trend**
    - 6-month revenue chart
    - Revenue visualization (Area chart)
    - Revenue growth indicators
    - Export revenue report
  
  - **Monthly Revenue Card**
    - Current month revenue
    - Growth percentage
    - Revenue sparkline chart

- **Session Analytics**
  - **Total Sessions**
    - Total session count
    - Growth percentage
    - Session trend chart
  
  - **Weekly Appointments Chart**
    - Day-wise appointment breakdown
    - Visual bar chart
    - Appointment patterns

- **Performance Metrics**
  - **Session Completion Rate**
    - Completion percentage (e.g., 96%)
    - Visual gauge/indicator
  
  - **Average Rating**
    - Overall rating (e.g., 4.8/5)
    - Rating breakdown
    - Review count
  
  - **Response Time**
    - Average response time (e.g., < 2 hours)
    - Response time indicator
  
  - **Rebooking Rate**
    - Client rebooking percentage (e.g., 78%)
    - Client retention metric

- **Appointment Analytics**
  - Appointment count badge
  - Appointment status breakdown
  - Appointment trends
  - Category-wise appointments

- **Export Features**
  - Export analytics report
  - Download revenue report
  - Generate performance report

---

## 🔔 Notifications

### Notifications Page (`/notifications`)
- **Notification Center**
  - All notifications display
  - Unread notifications highlight
  - Notification categories
  - Real-time updates

- **Notification Types**
  - **Appointment Notifications**
    - New appointment requests
    - Appointment confirmations
    - Appointment cancellations
    - Rescheduling notifications
    - Appointment reminders
  
  - **Client Notifications**
    - New client linked
    - Client message notifications
    - Client document uploads
  
  - **Payment Notifications**
    - Payment received
    - Payment confirmations
    - Refund notifications
  
  - **System Notifications**
    - Profile updates
    - Account changes
    - Platform announcements
    - Weekly reports

- **Notification Features**
  - Mark as read/unread
  - Mark all as read
  - Delete notification
  - Delete all notifications
  - Notification filters
  - Notification search

- **Notification Display**
  - Notification icon/avatar
  - Notification name/title
  - Notification message
  - Timestamp
  - Read/unread indicator
  - Action buttons

---

## ⚙️ Settings & Configuration

### Settings Page (`/settings`)
- **Settings Tabs**
  - Notifications settings
  - Availability settings

### Notification Settings Tab
- **Email Notifications**
  - Enable/disable email notifications
  - Email notification preferences

- **SMS Notifications**
  - Enable/disable SMS notifications
  - SMS notification preferences

- **Notification Types**
  - Appointment reminders toggle
  - Client messages toggle
  - Weekly reports toggle
  - Payment notifications toggle
  - System notifications toggle

### Availability Settings Tab
- **Current Status**
  - Available
  - Busy
  - Offline
  - Status selector

- **Accepting New Clients**
  - Toggle to accept/decline new clients
  - Client acceptance status

- **Working Hours Configuration**
  - **Per-Day Settings** (Monday - Sunday)
    - Enable/disable day
    - Working hours time slots
    - Start and end times
    - Multiple time slots per day
  
  - **Slot Generation**
    - Automatic slot generation
    - Slot duration configuration
    - Buffer time between slots
    - Preview generated slots
    - Regenerate slots button

- **Session Settings**
  - Default duration (minutes)
  - Minimum duration
  - Maximum duration
  - Buffer time between sessions (minutes)
  - Maximum sessions per day

- **Time Off Management**
  - Add vacation/time off
  - Start date and end date
  - Reason for time off
  - Time off type (vacation, sick, personal, other)
  - Status (approved, pending, rejected)
  - View time off list
  - Delete time off entries

- **Cancellation Settings**
  - Cancellation window (hours)
  - Cancellation policy
  - Auto-cancel unpaid bookings
  - Unpaid booking window (hours)

### Settings Features
- **Save Settings**
  - Save notification preferences
  - Save availability settings
  - Real-time settings update
  - Success/error notifications

- **Settings Validation**
  - Input validation
  - Time slot validation
  - Conflict detection
  - Error handling

---

## 🌐 Public Profile

### Public Profile View (`/consultant/:id`)
- **Profile Display**
  - Professional profile showcase
  - Accessible by clients and other users
  - Public-facing consultant information

- **Profile Sections**
  - Professional photo
  - Name and bio title
  - Category and specialization
  - Rating and reviews
  - Years of experience
  - Contact information (based on privacy settings)
  - Education and experience
  - Awards and achievements
  - Social media links
  - Availability status

- **Actions Available**
  - Book appointment button
  - Contact consultant
  - View full profile

---

## 🔗 API Integration

### Authentication APIs
- `POST /api/v1/auth/send-otp` - Send OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP
- `POST /api/v1/auth/register` - Register user
- `PATCH /api/v1/auth/edit-profile` - Update profile

### Consultant APIs
- `GET /api/v1/consultants` - List consultants
- `GET /api/v1/consultants/:id` - Get consultant details
- `POST /api/v1/consultants` - Create consultant profile
- `PATCH /api/v1/consultants/:id` - Update consultant profile
- `DELETE /api/v1/consultants/:id` - Delete consultant profile
- `POST /api/v1/consultants/:id/approve` - Approve consultant
- `POST /api/v1/consultants/:id/reject` - Reject consultant

### Client APIs
- `GET /api/v1/clients/:id` - Get client profile by ID
- `GET /api/v1/clients/profile` - Get own profile (not for consultant)

### Client-Consultant APIs
- `GET /api/v1/client-consultants/consultant/:consultantId/clients` - Get consultant's clients
- `GET /api/v1/client-consultants/client/:clientId/consultants` - Get client's consultants
- `POST /api/v1/client-consultants/link` - Link client to consultant
- `DELETE /api/v1/client-consultants/:id` - Unlink client-consultant
- `GET /api/v1/client-consultants/` - Get all relationships
- `PATCH /api/v1/client-consultants/:id/status` - Update relationship status

### Appointment APIs
- `GET /api/v1/appointments` - List appointments
- `GET /api/v1/appointments/available-slots` - Get available slots
- `GET /api/v1/appointments/:id` - Get appointment details
- `POST /api/v1/appointments` - Create appointment
- `PATCH /api/v1/appointments/:id` - Update appointment
- `DELETE /api/v1/appointments/:id` - Delete/cancel appointment

### Consultant Settings APIs
- `GET /api/v1/consultant-settings/:consultantId` - Get settings
- `POST /api/v1/consultant-settings/` - Create settings
- `PUT /api/v1/consultant-settings/:consultantId` - Update settings
- `PUT /api/v1/consultant-settings/:consultantId/notifications` - Update notification settings
- `PUT /api/v1/consultant-settings/:consultantId/availability` - Update availability settings

### Notification APIs
- `GET /api/v1/notifications` - List notifications
- `POST /api/v1/notifications` - Create notification (Admin only)
- `PATCH /api/v1/notifications/:id/read` - Mark as read
- `POST /api/v1/notifications/mark-all-read` - Mark all as read
- `DELETE /api/v1/notifications/:id` - Delete notification
- `DELETE /api/v1/notifications/` - Delete all notifications

### Dashboard/Analytics APIs
- `GET /api/v1/analytics/consultant` - Get consultant analytics/stats

### User APIs
- `GET /api/v1/users/profile` - Get user profile
- `GET /api/v1/users/consultants/active` - Get active consultants

### Category APIs
- `GET /api/v1/categories` - List categories
- `GET /api/v1/subcategories` - List subcategories

---

## 🎨 UI/UX Features

### Design System
- **Component Library**: Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: Lucide React and React Icons (FaUserTie, FaBriefcase, FaChartLine, etc.)
- **Animations**: Framer Motion for smooth transitions
- **Charts**: Recharts for analytics visualization

### Navigation
- **Sidebar Navigation**
  - Role-based menu items
  - Active route highlighting
  - Icon-based navigation
  - Collapsible sidebar (responsive)

- **Menu Items (Consultant)**
  - Dashboard
  - Clients
  - Appointments
  - Analytics
  - Notifications
  - Settings
  - Profile (bottom)

### Responsive Design
- Mobile-first approach
- Tablet optimization
- Desktop layouts
- Adaptive sidebar navigation
- Responsive data tables
- Mobile-friendly modals

### User Experience
- Role-based navigation
- Breadcrumb navigation
- Loading states (skeletons, spinners)
- Error handling and error messages
- Success notifications
- Toast messages (React Hot Toast, Sonner)
- Modal dialogs
- Confirmation dialogs
- Form validation
- Real-time updates

### Visualizations
- **Charts and Graphs**
  - Revenue trend charts (Area charts)
  - Appointment bar charts
  - Client engagement gauges
  - Performance metrics visualization
  - Sparkline charts
  - Ring/Donut charts

### Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management
- Color contrast compliance
- Semantic HTML

---

## 🔒 Security Features

- **Authentication**
  - JWT token-based authentication
  - Token storage in localStorage
  - Automatic token refresh
  - Protected routes

- **Authorization**
  - Role-based access control (Consultant role)
  - Route-level permissions
  - API-level authorization
  - Consultant can only access own data and linked clients

- **Data Protection**
  - Secure API communication
  - Input validation
  - XSS protection
  - CSRF protection
  - Data sanitization

---

## 🚀 Key Features Summary

✅ **Complete Client Management**
- View and manage all linked clients
- Detailed client profiles with tabs
- Client statistics and analytics
- Link/unlink clients
- Client communication

✅ **Comprehensive Appointment System**
- Create and manage appointments
- Available slots management
- Conflict detection
- Appointment status tracking
- Live appointment indicators

✅ **Professional Profile Management**
- Complete profile with all professional details
- Education, experience, and awards
- Social media integration
- Profile picture management
- Public profile showcase

✅ **Advanced Analytics Dashboard**
- Revenue tracking and trends
- Appointment analytics
- Performance metrics
- Client engagement statistics
- Export reports

✅ **Flexible Availability System**
- Working hours per day
- Multiple time slots
- Automatic slot generation
- Time off management
- Session configuration

✅ **Comprehensive Settings**
- Notification preferences
- Availability management
- Session settings
- Cancellation policies
- Time off tracking

✅ **User-Friendly Interface**
- Intuitive navigation
- Responsive design
- Real-time updates
- Smooth user experience
- Visual analytics

---

This comprehensive feature list covers all consultant-facing features available in the Consultant frontend application. All features are designed to help consultants efficiently manage their practice, clients, appointments, and professional profile.

