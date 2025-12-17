# Agora Video Calling Integration Setup Guide

This guide explains how to set up and use the Agora video calling integration for your consultation platform.

## 📋 Prerequisites

1. **Agora Account**: Sign up at [https://www.agora.io/](https://www.agora.io/)
2. **Agora Project**: Create a project in the Agora Console
3. **Credentials**: Obtain the following from your Agora Console:
   - App ID
   - App Certificate
   - Customer ID (for Cloud Recording)
   - Customer Secret (for Cloud Recording)

## 🔧 Backend Configuration

### 1. Environment Variables

Add the following to your `backend/.env` file:

```env
# Agora Configuration
AGORA_APP_ID=your_app_id_here
AGORA_APP_CERTIFICATE=your_app_certificate_here
AGORA_CUSTOMER_ID=your_customer_id_here
AGORA_CUSTOMER_SECRET=your_customer_secret_here
```

### 2. Dependencies

The following packages are already installed:
- `agora-access-token` (for token generation)
- `axios` (for Cloud Recording REST API calls)

### 3. API Endpoints

The following endpoints are available:

- **POST** `/api/v1/agora/token` - Generate RTC token for joining video calls
- **POST** `/api/v1/agora/recording/start` - Start Cloud Recording
- **POST** `/api/v1/agora/recording/stop` - Stop Cloud Recording
- **GET** `/api/v1/agora/recording/status/:appointmentId` - Get recording status

## 🎨 Frontend Configuration

### 1. Environment Variables

Add the following to your `Consultant/.env` file:

```env
VITE_AGORA_APP_ID=your_app_id_here
```

### 2. Dependencies

The following package is already installed:
- `agora-rtc-sdk-ng` (Agora Web SDK)

## 📦 Integration Components

### Backend Files Created

1. **`backend/src/services/agora.service.js`** - Agora service for token generation and Cloud Recording
2. **`backend/src/api/v1/controllers/agora.controller.js`** - Agora API controllers
3. **`backend/src/api/v1/validators/agora.validator.js`** - Request validation schemas
4. **`backend/src/api/v1/routes/agora.routes.js`** - Agora API routes
5. **`backend/src/models/appointment.model.js`** - Updated with Agora fields

### Frontend Files Created

1. **`Consultant/src/api/agora.api.ts`** - Agora API client
2. **`Consultant/src/hooks/useAgoraVideoCall.ts`** - React hook for video calling
3. **`Consultant/src/components/videoCall/VideoCallRoom.tsx`** - Video call room component

## 🚀 Usage

### Basic Video Call Setup

When an appointment is created, an Agora channel is automatically created with the format: `appointment-{appointmentId}`.

### Using the VideoCallRoom Component

```tsx
import { VideoCallRoom } from '@/components/videoCall/VideoCallRoom';
import { AGORA_APP_ID } from '@/constants/appConstants';

function AppointmentVideoPage({ appointmentId, userId }) {
  return (
    <VideoCallRoom
      appointmentId={appointmentId}
      appId={AGORA_APP_ID}
      userId={userId}
      role="publisher" // or "audience" for viewers
      onLeave={() => {
        // Handle leaving the call
        console.log('User left the call');
      }}
    />
  );
}
```

### Using the Hook Directly

```tsx
import { useAgoraVideoCall } from '@/hooks/useAgoraVideoCall';
import { AGORA_APP_ID } from '@/constants/appConstants';

function CustomVideoCallComponent({ appointmentId, userId }) {
  const {
    localVideoTrack,
    localAudioTrack,
    remoteUsers,
    isJoined,
    isRecording,
    joinChannel,
    leaveChannel,
    toggleAudio,
    toggleVideo,
    startRecording,
    stopRecording,
    error,
    loading,
  } = useAgoraVideoCall({
    appointmentId,
    appId: AGORA_APP_ID,
    userId,
    role: 'publisher',
  });

  // Use the hook methods and state as needed
}
```

## 🎥 Features

### Video Calling
- ✅ Real-time video and audio communication
- ✅ Auto-join on component mount
- ✅ Toggle audio/video on/off
- ✅ Multiple participants support
- ✅ Role-based access (publisher/audience)

### Cloud Recording
- ✅ Start/stop recording (consultant only)
- ✅ Recording status tracking
- ✅ Automatic file URL storage in appointment
- ✅ Support for individual and mix recording modes

## 🔐 Security

- Tokens are generated server-side and never exposed to the client
- Role-based authorization ensures only authorized users can join channels
- Recording controls are restricted to consultants and admins
- Token expiration (default: 1 hour) prevents long-lived access

## 📝 Workflow

1. **Appointment Booking**: When a client books an appointment, an Agora channel is automatically created
2. **Join Call**: Both client and consultant can join the call using the `VideoCallRoom` component
3. **Recording** (Optional): Consultant can start/stop recording during the call
4. **Call End**: Participants can leave the call, and recording files are stored if recording was active

## 🐛 Troubleshooting

### Token Generation Fails
- Check that `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` are correctly set in backend `.env`
- Verify the credentials in Agora Console

### Cannot Join Channel
- Ensure the user is either the client or consultant for the appointment
- Check that the token is generated successfully
- Verify browser permissions for camera and microphone

### Recording Not Working
- Ensure `AGORA_CUSTOMER_ID` and `AGORA_CUSTOMER_SECRET` are set in backend `.env`
- Check Agora Console for Cloud Recording subscription status
- Verify storage configuration if using custom storage (S3, etc.)

## 📚 Additional Resources

- [Agora Web SDK Documentation](https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=web)
- [Agora Cloud Recording Documentation](https://docs.agora.io/en/cloud-recording/product_overview?platform=RESTful)
- [Agora Token Generation Guide](https://docs.agora.io/en/video-calling/develop/integrate-token-generation)

