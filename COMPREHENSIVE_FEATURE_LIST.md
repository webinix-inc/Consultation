# Comprehensive Feature List - Consultation Platform

## 📋 Table of Contents
1. [Backend Modules](#backend-modules)
2. [Frontend - Admin Panel](#frontend---admin-panel)
3. [Frontend - Consultant Panel](#frontend---consultant-panel)
4. [Shared Features](#shared-features)
5. [Technology Stack](#technology-stack)

---

## 🔧 Backend Modules

### 1. **Authentication & Authorization Module**
- **OTP-based Authentication**
  - Send OTP via mobile number
  - Verify OTP for login/registration
  - OTP expiration handling (5 minutes)
  
- **User Registration**
  - Register new users with OTP verification
  - Role-based registration (Admin, Employee, Consultant, Client)
  - Profile completion workflow
  
- **Profile Management**
  - Update user profile (name, email, password)
  - Password change with current password verification
  - Auto-generated password handling
  
- **Role-Based Access Control (RBAC)**
  - Roles: Admin, Employee, Consultant, Client
  - Role hierarchy and permissions
  - JWT token-based authentication
  - Route-level authorization

### 2. **User Management Module**
- **User CRUD Operations**
  - List all users (Admin, Employee, Consultant roles only)
  - Get user profile
  - Create users (Admin, Employee, Consultant)
  - Update users (Admin, Employee, Consultant)
  - Delete users (Admin, Employee, Consultant)
  
- **Active Consultants Listing**
  - Get active consultants for clients
  - Filter by category/subcategory
  - Public consultant directory access
  
- **User Status Management**
  - Active/Inactive status
  - Verification status: Approved, Pending, Rejected, Blocked
  - Last login tracking

### 3. **Consultant Management Module**
- **Consultant Profile Management**
  - Create consultant profiles
  - Update consultant information
  - Delete consultant profiles
  - Get consultant details by ID
  - List all consultants with filters
  
- **Consultant Approval Workflow**
  - Approve consultant applications
  - Reject consultant applications
  - Status tracking (Approved, Pending, Rejected, Blocked)
  
- **Consultant Profile Features**
  - Basic Info: Name, email, phone, alternate phone
  - Professional Details: Category, department, registration number
  - Bio & About: Bio title, description, image
  - Education: Multiple education entries with details
  - Experience: Work history with company, role, years
  - Awards: Awards and recognitions
  - Social Media Links: Website, LinkedIn, Twitter, Instagram, Facebook
  - Address: Full address with country, state, city, pincode
  - Languages: Multiple language support
  - Tags: Professional tags/specializations
  - Commission Settings: Platform percentage, duration limits
  - Rating & Reviews: Average rating, review breakdown
  - Client Stats: Total clients, appointments, response time
  - Fee Management: Consultation fees per session type

### 4. **Client Management Module**
- **Client Profile Management**
  - Get client profile (self for clients)
  - Update client profile
  - View client profile by ID (Consultant/Admin)
  - Extended profile information
  
- **Client Profile Fields**
  - Date of birth
  - Address details (address, city, state, country, pincode)
  - Emergency contact
  - Avatar/Profile image

### 5. **Category & Subcategory Management Module**
- **Category Management**
  - List all categories (public access)
  - Create categories (Admin only)
  - Update categories (Admin, Consultant)
  - Delete categories (Admin only)
  - Category statistics: Rating, consultants count, clients count, monthly revenue
  
- **Subcategory Management**
  - List subcategories (Admin, Consultant)
  - Get subcategory by ID
  - Create subcategories (Admin, Consultant)
  - Update subcategories (Admin, Consultant)
  - Delete subcategories (Admin only)
  - Link subcategories to categories

### 6. **Appointment Management Module**
- **Appointment CRUD Operations**
  - Create appointments (Admin, Consultant, Client)
  - List appointments with filters (date, consultant, client, status)
  - Get appointment by ID
  - Update appointments (Admin, Consultant, Client)
  - Delete/cancel appointments (Admin, Consultant, Client)
  
- **Available Slots Management**
  - Get available slots for consultant on specific date
  - Slot generation based on consultant working hours
  - Conflict detection and overlap prevention
  - Support for legacy date/time format and ISO date format
  - Dynamic slot duration configuration
  
- **Appointment Features**
  - Status Management: Upcoming, Confirmed, Completed, Cancelled
  - Session Type: Video Call (with extensibility)
  - Date & Time: Support for both legacy and ISO format
  - Client & Consultant snapshots for historical data
  - Appointment notes and reason
  - Fee management per appointment
  - Payment integration with transaction tracking
  
- **Role-Based Appointment Rules**
  - Clients can only create appointments for themselves
  - Consultants can create appointments for linked clients only
  - Appointment conflict detection
  - Validation based on client-consultant relationship

### 7. **Client-Consultant Relationship Module**
- **Relationship Management**
  - Link client to consultant (Admin, Consultant)
  - Unlink client-consultant relationship (Admin, Consultant, Client)
  - Get all clients for a consultant (with pagination)
  - Get all consultants for a client (with pagination)
  - Get all relationships with filters
  - Update relationship status (Active/Inactive)
  
- **Relationship Features**
  - Status tracking (Active, Inactive)
  - Linking timestamp
  - Notes field for relationship context
  - Compound indexing for uniqueness
  - Efficient querying with indexes

### 8. **Transaction & Payment Module**
- **Transaction Management**
  - Get all transactions (authenticated users)
  - Filter by user, consultant, appointment
  - Transaction history tracking
  
- **Transaction Types**
  - Payment: Client payment to consultant
  - Refund: Refund processing
  - Payout: Consultant payouts
  - Adjustment: Manual adjustments
  
- **Transaction Status**
  - Pending, Success, Failed, Refunded
  
- **Transaction Details**
  - Amount and currency (default: INR)
  - Payment method
  - Transaction ID
  - User and consultant snapshots
  - Appointment linkage
  - Metadata for additional information

### 9. **Notification Module**
- **Notification Management**
  - List notifications (all authenticated users)
  - Create notifications (Admin only via API)
  - Mark notification as read
  - Mark all notifications as read
  - Delete notification
  - Delete all notifications
  
- **Notification Types**
  - System notifications
  - Appointment notifications
  - Registration notifications
  - Payment notifications
  - Other custom notifications
  
- **Notification Features**
  - Recipient targeting (specific user or role-based)
  - Read/unread status
  - Avatar support
  - Timestamp tracking

### 10. **Consultant Settings Module**
- **Settings Management**
  - Get consultant settings
  - Create settings
  - Update settings (full or partial)
  - Update notification settings
  - Update availability settings
  
- **Availability Settings**
  - Accepting new clients toggle
  - Current status: available, busy, offline
  - Working hours per day (Monday-Sunday)
  - Custom time slots per day
  - Generated slots for appointment booking
  - Session settings (duration, buffer time, max sessions per day)
  - Cancellation settings (window, policy, auto-cancel unpaid)
  - Time off/Vacation management
  
- **Notification Settings**
  - Email notifications
  - SMS notifications
  - Appointment reminders
  - Client message notifications
  - Weekly reports
  
- **Calendar Settings**
  - Default view (day, week, month)
  - Working days only
  - Show/hide weekends
  - Time slot interval
  - Google Calendar sync
  - Outlook Calendar sync
  
- **Payment Settings**
  - Accepted payment methods
  - Auto-confirm payments
  - Require payment upfront
  - Partial payment support
  - Refund policy
  - Currency selection
  
- **Communication Settings**
  - Preferred contact method
  - Auto-response enabled
  - Response time SLA
  - Allow video/audio calls
  - Allow chat
  - Allow in-person consultations
  
- **Privacy Settings**
  - Public profile visibility
  - Email/phone visibility
  - Address visibility
  - Review settings (allow, moderate)
  - Availability visibility
  
- **Professional Settings**
  - Consultation types
  - Languages
  - Specializations
  - Consultation fees (initial, follow-up, emergency)
  - Qualifications
  - Memberships
  
- **Integration Settings**
  - Zoom integration
  - Google Meet integration
  - Skype integration
  - Microsoft Teams integration
  
- **Dashboard Settings**
  - Default view
  - Widget configuration
  - Refresh interval
  - Show tips
  - Compact mode

### 11. **Admin Settings Module**
- **Settings Management**
  - Get admin settings
  - Create settings
  - Update settings (full or partial)
  - Update profile settings
  - Update platform settings
  - Update general settings
  - Update notification settings
  
- **Profile Settings**
  - Admin name
  - Admin email
  
- **Platform Settings**
  - Platform name
  - Description
  - Version
  
- **General Settings**
  - Platform name
  - Timezone
  - Date format
  - Time format (12h/24h)
  - Language
  - Currency
  - Default page
  
- **Notification Settings**
  - Email notifications
  - SMS notifications
  - Push notifications
  - Notification types: appointment, payment, marketing, system

### 12. **Analytics & Reporting Module**
- **Admin Analytics (Overview)**
  - Total consultants count
  - Total appointments count
  - Active clients count
  - Monthly revenue aggregation
  - Top categories by revenue
  - Category appointment counts
  - Recent appointments list
  
- **Consultant Analytics**
  - Total appointments
  - Today's appointments
  - Active clients count
  - Monthly revenue
  - Client statistics (active/inactive with percentages)
  - Recent appointments list
  - Appointment status breakdown
  
- **Client Analytics**
  - Client-specific statistics
  - Appointment history
  - Payment history
  - Consultation summary

### 13. **Email Job Queue Module**
- **Email Service**
  - Background email processing
  - Queue-based email delivery
  - Email templates support
  - Async email sending

---

## 🖥️ Frontend - Admin Panel (`Consultation_Admin`)

### 1. **Authentication**
- Login page with OTP-based authentication
- Protected routes
- Role-based access control

### 2. **Dashboard**
- Overview analytics dashboard
- Key metrics cards
- Recent appointments
- Top categories visualization
- Quick action shortcuts

### 3. **User Management**
- List all users
- Create new users
- Edit user details
- Delete users
- Filter and search users
- User status management

### 4. **Consultant Management**
- Consultant listing page
- Consultant approval workflow
- View consultant profiles
- Edit consultant information
- Consultant status management (Approve/Reject)

### 5. **Client Management**
- Client listing page
- View client profiles
- Client dashboard
- Client information management

### 6. **Category Management (Consultation Types)**
- List categories
- Create new categories
- Edit categories
- Delete categories
- Category statistics display

### 7. **Subcategory Management**
- List subcategories
- Create subcategories
- Edit subcategories
- Delete subcategories
- Link subcategories to categories

### 8. **Appointment Management**
- View all appointments
- Filter appointments (date, status, consultant, client)
- Appointment details view
- Manual appointment creation (if needed)
- Appointment status updates

### 9. **Analytics Dashboard**
- Platform-wide analytics
- Revenue reports
- Consultant performance metrics
- Client engagement metrics
- Category-wise statistics
- Charts and visualizations (using Recharts)

### 10. **Notifications**
- Notification center
- View all notifications
- Mark as read/unread
- Delete notifications
- Real-time notification updates

### 11. **Settings**
- Admin settings page
- Platform settings configuration
- General settings
- Notification preferences
- Profile settings

---

## 👨‍💼 Frontend - Consultant Panel (`Consultant`)

### 1. **Authentication**
- Login page (OTP-based)
- Registration flow
- Profile completion workflow
- Protected routes with role-based access

### 2. **Dashboard**
- Consultant-specific dashboard
- Today's appointments
- Upcoming appointments overview
- Quick stats (appointments, clients, revenue)
- Recent activity feed

### 3. **Profile Management**
- Consultant profile page
- Edit profile information
- Update professional details
- Upload profile image
- Manage education, experience, awards
- Update social media links
- Public profile view

### 4. **Client Management**
- List all linked clients
- View client profiles
- Client details page
- Client documents (if implemented)
- Client communication history

### 5. **Appointment Management**
- View all appointments
- Create new appointments
- Update appointment details
- Cancel appointments
- Available slots management
- Appointment calendar view
- Filter appointments by status, date, client

### 6. **Analytics Dashboard**
- Consultant performance metrics
- Appointment statistics
- Client statistics
- Revenue analytics
- Monthly/weekly reports
- Charts and graphs

### 7. **Notifications**
- Notification center
- Appointment reminders
- Client messages
- System notifications
- Mark as read functionality

### 8. **Settings**
- Consultant settings page
- Availability management
  - Working hours configuration
  - Time slot setup
  - Time off/vacation management
- Notification preferences
- Calendar settings
- Payment settings
- Communication preferences
- Privacy settings
- Integration settings (Zoom, Google Meet, etc.)

### 9. **Client Features (If logged in as Client)**
- My Consultants: View linked consultants
- My Bookings: View all appointments
- My Documents: Client documents management
- My Payments: Transaction history
- Consultant Public Profile: Browse and view consultant profiles

---

## 🔄 Shared Features

### 1. **Common Components**
- Dashboard layout with sidebar navigation
- Responsive design (mobile-friendly)
- Toast notifications
- Loading states
- Error handling
- Form validation
- Data tables with pagination
- Search and filter functionality

### 2. **UI Components (Radix UI + Tailwind CSS)**
- Buttons, Inputs, Forms
- Dialogs and Modals
- Dropdowns and Selects
- Tabs and Accordions
- Cards and Badges
- Tooltips and Popovers
- Date pickers
- Charts and Graphs (Recharts)
- Toast notifications (Sonner)

### 3. **State Management**
- Redux Toolkit for global state
- React Query for server state management
- Local storage for authentication persistence

### 4. **API Integration**
- Axios-based API client
- Centralized API instance with interceptors
- Error handling and response parsing
- Request/response interceptors for authentication

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB with Mongoose 8.16.3
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Validation**: Joi 17.13.3
- **Password Hashing**: bcryptjs 3.0.2
- **Email**: Nodemailer 7.0.5
- **Logging**: Winston 3.17.0
- **Security**: Helmet 8.1.0, CORS 2.8.5
- **Rate Limiting**: express-rate-limit 8.0.1

### Frontend (Both Panels)
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.1
- **Routing**: React Router DOM 6.26.2
- **State Management**: Redux Toolkit 2.8.2, React Query 5.56.2
- **UI Library**: Radix UI components
- **Styling**: Tailwind CSS 3.4.17
- **Forms**: React Hook Form 7.53.0 with Zod 3.23.8
- **Charts**: Recharts 3.1.0
- **Date Handling**: date-fns 3.6.0
- **Icons**: Lucide React 0.462.0, React Icons 5.5.0
- **HTTP Client**: Axios 1.11.0
- **Notifications**: Sonner 1.5.0, React Hot Toast 2.5.2

### Infrastructure
- **Deployment**: Netlify (frontend)
- **API Documentation**: Swagger/Postman Collection
- **Environment**: dotenv for configuration
- **Logging**: Winston with file rotation

---

## 📊 Data Models Summary

1. **User**: Core user accounts with roles and authentication
2. **Consultant**: Extended consultant profiles with professional details
3. **Client**: Extended client profiles with personal information
4. **Appointment**: Booking system with scheduling and payment
5. **Category**: Consultation categories with statistics
6. **Subcategory**: Subcategories linked to categories
7. **Transaction**: Payment and financial transactions
8. **Notification**: System and user notifications
9. **ClientConsultant**: Relationship mapping between clients and consultants
10. **ConsultantSettings**: Comprehensive settings for consultants
11. **AdminSettings**: Platform-wide admin settings
12. **OTP**: OTP storage for authentication
13. **Token**: Token management (if implemented)

---

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Route-level authorization
- Input validation with Joi
- Rate limiting
- CORS configuration
- Helmet for security headers
- OTP expiration (5 minutes)

---

## 📈 Scalability Features

- Modular code structure
- RESTful API design
- Database indexing for performance
- Background job queue for emails
- Pagination support
- Efficient querying with Mongoose
- Environment-based configuration

---

This comprehensive feature list covers all modules, functionalities, and capabilities of the Consultation Platform across both backend and frontend applications.

