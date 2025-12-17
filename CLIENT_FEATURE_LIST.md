# Client Feature List - Comprehensive Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication & Onboarding](#authentication--onboarding)
3. [Dashboard](#dashboard)
4. [My Consultants](#my-consultants)
5. [Appointment Management](#appointment-management)
6. [My Bookings](#my-bookings)
7. [My Documents](#my-documents)
8. [Payments & Invoices](#payments--invoices)
9. [Profile Management](#profile-management)
10. [Notifications](#notifications)
11. [Settings](#settings)
12. [Public Features](#public-features)

---

## 🎯 Overview

The Client panel is part of the **Consultant** frontend application (`Consultant` folder), which serves both Client and Consultant roles. Clients can manage their consultations, appointments, documents, and payments through an intuitive interface.

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

### Registration
- **User Registration**
  - Registration via `/api/v1/auth/register`
  - Profile completion workflow
  - Role assignment: "Client"
  - Email and mobile verification

### Profile Completion
- **Complete Profile Page** (`/complete-profile`)
  - Initial profile setup after registration
  - Required information collection
  - Profile validation

---

## 📊 Dashboard

### Client Dashboard (`/dashboard`)
- **Welcome Section**
  - Personalized greeting with user name
  - Role-based dashboard content
  - Quick stats overview

- **Dashboard Metrics**
  - Upcoming appointments count
  - Active consultants count
  - Recent activity summary
  - Quick action buttons

- **Recent Appointments Widget**
  - Next appointment preview
  - Appointment status badges
  - Quick navigation to appointments

- **Consultants Overview**
  - Active consultants list
  - Quick access to consultant profiles
  - Link new consultant option

---

## 👨‍⚕️ My Consultants

### Consultant Listing (`/my-consultants`)
- **Consultant Grid View**
  - Card-based consultant display
  - Profile images and avatars
  - Consultant information preview
  - Status indicators (Active/Inactive)

- **Consultant Information Display**
  - Full name and bio title
  - Category and specialization
  - Contact information (email, phone)
  - Location details
  - Rating and reviews summary
  - Years of experience

- **Filtering Options**
  - Filter by active consultants only
  - Filter by all consultants (including inactive)
  - Search functionality

- **Actions Available**
  - View consultant profile
  - Book appointment with consultant
  - Contact consultant
  - Navigate to public profile page

### Consultant Public Profile View
- **Profile Details**
  - Full consultant profile information
  - Professional credentials
  - Education and experience
  - Awards and achievements
  - Social media links
  - Availability status

- **Booking Actions**
  - Book appointment button
  - View available slots
  - Contact consultant directly

---

## 📅 Appointment Management

### Appointments Page (`/appointments`)
- **Appointment List View**
  - All client appointments display
  - Filter by status (Upcoming, Confirmed, Completed, Cancelled)
  - Filter by date range
  - Filter by consultant

- **Appointment Cards**
  - Consultant information
  - Date and time display
  - Appointment status badges
  - Category/tag display
  - Session type indicator (Video Call)

- **Appointment Actions**
  - View appointment details
  - Cancel appointment
  - Reschedule appointment (if allowed)
  - View appointment notes

### Create Appointment
- **Booking Flow**
  - Select consultant
  - Choose date
  - Select available time slot
  - Add appointment reason/notes
  - Confirm booking
  - Payment processing (if required)

### Appointment Details
- **Information Display**
  - Consultant details with snapshot
  - Date and time (ISO format or legacy format)
  - Appointment status
  - Category and session type
  - Fee information
  - Payment status
  - Notes and reason

---

## 📖 My Bookings

### Bookings Page (`/my-bookings`)
- **Booking Management Interface**
  - Dedicated bookings view
  - Enhanced booking display
  - Calendar integration

- **Booking Categories**
  - **Upcoming Bookings**
    - Future appointments list
    - Time until appointment
    - Preparation reminders
    - Reschedule options
  
  - **Past Bookings**
    - Completed appointments history
    - Appointment notes access
    - Feedback/review options

- **Booking Row Features**
  - Consultant avatar and name
  - Date and time display
  - Status badge (Upcoming, Completed, Cancelled)
  - Category tag
  - Session type icon
  - Action buttons (View, Reschedule, Cancel)

- **Booking Actions**
  - View booking details in modal
  - View appointment notes
  - Reschedule booking
  - Cancel booking with reason
  - Join video call (when active)

- **Date Navigation**
  - Previous/Next date navigation
  - Today button for quick access
  - Calendar date picker

---

## 📄 My Documents

### Documents Page (`/my-documents`)
- **Document Management**
  - Complete document library
  - Upload new documents
  - View existing documents
  - Download documents
  - Delete documents

- **Document Types**
  - **Medical Reports**
    - Health records
    - Test results
    - Medical history documents
  
  - **Consultation Notes**
    - Session summaries
    - Treatment plans
    - Progress notes
  
  - **Prescriptions**
    - Medication prescriptions
    - Dosage instructions
    - Pharmacy information
  
  - **Invoices**
    - Payment receipts
    - Transaction invoices
    - Billing documents

- **Document Features**
  - Document categorization
  - Search functionality
  - Filter by document type
  - Document metadata (date, size, consultant)
  - Document preview
  - Download functionality
  - File size display

- **Document Upload**
  - Upload button/interface
  - File selection
  - Document type selection
  - Metadata entry

- **Document Display**
  - Card-based document listing
  - Document type badges
  - Client and consultant information
  - Date and size information
  - Quick action buttons (View, Download, Delete)

---

## 💳 Payments & Invoices

### Payments Page (`/my-payments`)
- **Payment History**
  - Complete transaction history
  - All payment records
  - Invoice access
  - Receipt download

- **Payment Information Display**
  - Consultant name and details
  - Payment amount (₹)
  - Transaction date
  - Payment method
  - Transaction ID
  - Invoice number
  - Payment status

- **Payment Status**
  - Completed payments
  - Pending payments
  - Failed payments
  - Refunded payments

- **Payment Features**
  - Search payments
  - Filter by status
  - Filter by date range
  - Filter by consultant
  - Payment details modal

- **Payment Details Modal**
  - Complete transaction information
  - Consultant details
  - Service category and type
  - Payment method details
  - Transaction date and time
  - Amount breakdown
  - Transaction ID
  - Invoice number
  - Download invoice button
  - Download receipt button

- **Invoice Management**
  - View invoice details
  - Download invoice PDF
  - Print invoice
  - Email invoice option

- **Receipt Management**
  - View receipt details
  - Download receipt PDF
  - Receipt for tax purposes

---

## 👤 Profile Management

### Client Profile (`/profile`)
- **Profile Information**
  - Full name
  - Email address
  - Mobile number
  - Date of birth
  - Address information
    - Street address
    - City
    - State
    - Country
    - Pincode
  - Emergency contact
  - Avatar/profile picture

- **Profile Editing**
  - Update personal information
  - Change profile picture
  - Update contact details
  - Modify address
  - Save profile changes

- **Profile Display**
  - Profile header with avatar
  - Information cards
  - Contact details section
  - Address section
  - Emergency contact section

---

## 🔔 Notifications

### Notifications Page (`/notifications`)
- **Notification Center**
  - All notifications display
  - Unread notifications highlight
  - Notification categories

- **Notification Types**
  - **Appointment Notifications**
    - Appointment reminders
    - Appointment confirmations
    - Appointment cancellations
    - Rescheduling notifications
  
  - **Payment Notifications**
    - Payment confirmations
    - Payment receipts
    - Refund notifications
  
  - **System Notifications**
    - Profile updates
    - Account changes
    - Platform announcements

- **Notification Features**
  - Mark as read/unread
  - Mark all as read
  - Delete notification
  - Delete all notifications
  - Notification filters
  - Real-time updates

- **Notification Display**
  - Notification icon/avatar
  - Notification message
  - Timestamp
  - Read/unread indicator
  - Action buttons

---

## ⚙️ Settings

### Settings Page (`/settings`)
- **General Settings**
  - Account preferences
  - Profile visibility
  - Language preferences
  - Timezone settings

- **Notification Preferences**
  - Email notifications toggle
  - SMS notifications toggle
  - Push notifications toggle
  - Notification frequency
  - Notification types selection

- **Privacy Settings**
  - Profile visibility
  - Contact information visibility
  - Data sharing preferences

---

## 🌐 Public Features

### Home Page (`/`)
- **Landing Page** (`AIOBHero`)
  - Platform introduction
  - Feature highlights
  - Call-to-action buttons
  - Navigation to login/registration

### Consultant Public Profile (`/consultant/:id`)
- **Public Profile View**
  - View consultant profiles (accessible to all roles)
  - Consultant information display
  - Professional credentials
  - Ratings and reviews
  - Book appointment option

---

## 🔗 API Integration

### Authentication APIs
- `POST /api/v1/auth/send-otp` - Send OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP
- `POST /api/v1/auth/register` - Register user
- `PATCH /api/v1/auth/edit-profile` - Update profile

### Client APIs
- `GET /api/v1/clients/profile` - Get client profile
- `PATCH /api/v1/clients/profile` - Update client profile

### Consultant APIs
- `GET /api/v1/consultants` - List consultants
- `GET /api/v1/consultants/:id` - Get consultant details

### Client-Consultant APIs
- `GET /api/v1/client-consultants/client/:clientId/consultants` - Get client's consultants
- `POST /api/v1/client-consultants/link` - Link consultant (via consultant/admin)
- `DELETE /api/v1/client-consultants/:id` - Unlink consultant

### Appointment APIs
- `GET /api/v1/appointments` - List appointments
- `GET /api/v1/appointments/available-slots` - Get available slots
- `GET /api/v1/appointments/:id` - Get appointment details
- `POST /api/v1/appointments` - Create appointment
- `PATCH /api/v1/appointments/:id` - Update appointment
- `DELETE /api/v1/appointments/:id` - Delete/cancel appointment

### Transaction APIs
- `GET /api/v1/transactions` - Get transactions

### Notification APIs
- `GET /api/v1/notifications` - List notifications
- `PATCH /api/v1/notifications/:id/read` - Mark as read
- `POST /api/v1/notifications/mark-all-read` - Mark all as read
- `DELETE /api/v1/notifications/:id` - Delete notification

### Dashboard APIs
- `GET /api/v1/analytics/client` - Get client analytics/stats

---

## 🎨 UI/UX Features

### Design System
- **Component Library**: Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: Lucide React and React Icons
- **Animations**: Framer Motion for smooth transitions

### Responsive Design
- Mobile-first approach
- Tablet optimization
- Desktop layouts
- Adaptive sidebar navigation

### User Experience
- Role-based navigation
- Breadcrumb navigation
- Loading states
- Error handling
- Success notifications
- Toast messages (React Hot Toast)
- Modal dialogs
- Confirmation dialogs

### Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management
- Color contrast compliance

---

## 🔒 Security Features

- **Authentication**
  - JWT token-based authentication
  - Token storage in localStorage
  - Automatic token refresh
  - Protected routes

- **Authorization**
  - Role-based access control
  - Route-level permissions
  - API-level authorization
  - Client can only access own data

- **Data Protection**
  - Secure API communication
  - Input validation
  - XSS protection
  - CSRF protection

---

## 📱 Shared Features (Available to Both Client and Consultant)

### Dashboard
- Role-specific dashboard content
- Quick stats overview
- Recent activity

### Appointments
- View appointments
- Create appointments (with role-based restrictions)
- Update appointments
- Cancel appointments

### Notifications
- View notifications
- Mark as read
- Delete notifications

### Settings
- Profile settings
- Notification preferences
- Account preferences

---

## 🚀 Key Features Summary

✅ **Complete Appointment Management**
- Book appointments with consultants
- View appointment history
- Reschedule and cancel appointments
- View available time slots

✅ **Consultant Discovery & Management**
- Browse and search consultants
- View consultant profiles
- Link with consultants
- Manage consultant relationships

✅ **Document Management**
- Upload and store documents
- Organize by type
- Download documents
- View document history

✅ **Payment & Invoice System**
- Complete payment history
- Invoice generation and download
- Receipt management
- Transaction tracking

✅ **User-Friendly Interface**
- Intuitive navigation
- Responsive design
- Real-time updates
- Smooth user experience

✅ **Comprehensive Analytics**
- Personal dashboard statistics
- Appointment tracking
- Payment summaries

---

This comprehensive feature list covers all client-facing features available in the Consultant frontend application. All features are designed to provide clients with complete control over their consultation journey, from finding consultants to managing appointments, documents, and payments.

