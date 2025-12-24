# Agora Mobile App Integration Guide

This guide details how to integrate Agora Video Calling into the mobile application (iOS/Android/React Native/Flutter) using the existing backend infrastructure for token generation and cloud recording.

## 1. System Overview

The system uses **Agora RTC (Real-Time Communication)** for video calls. The backend acts as a secure token server. The mobile app **must not** generate tokens locally; it must fetch them from the backend API.

-   **App ID**: (Ensure this matches the one used in the web app)
-   **Channel Profile**: `Communication` (or `Live Broadcasting` depending on use case, web uses `rtc` mode which maps to Communication usually, but check SDK specifics. Web SDK `mode: 'rtc'` corresponds to Communication profile).
-   **Codec**: VP8 (Web uses VP8, mobile should match or negotiate automatically).

## 2. Authentication & Token Generation

The mobile app must authenticate with your backend to retrieve an Agora RTC Token before joining a channel.

### API Endpoint: Generate Token

**Request:**

-   **Method**: `POST`
-   **URL**: `/api/v1/agora/token`
-   **Headers**: 
    -   `Authorization`: `Bearer <access_token>` (User must be logged in)
-   **Body**:
    ```json
    {
      "channelName": "appointment-{appointmentId}",
      "uid": 0,
      "role": "publisher", 
      "expireTime": 3600
    }
    ```

**Parameters Detail:**
1.  **`channelName`**: **CRITICAL**. Must follow the format `appointment-{appointmentId}` (e.g., `appointment-675037ae6d325a07b732e73a`). The backend extracts the ID to verify the user (Client/Consultant) is authorized for this appointment.
2.  **`uid`**: User ID. Send `0` to let Agora API assign one, or provide a specific locally generated numeric ID. The backend defaults to `0` if not provided.
3.  **`role`**:
    -   `'publisher'`: For users engaging in the call (Consultant/Client).
    -   `'audience'`: For passive viewers (if applicable).
4.  **`expireTime`**: Token validity in seconds (default 3600).

**Response:**

```json
{
  "status": "success",
  "message": "Token generated successfully",
  "data": {
    "token": "006bc3...",
    "channelName": "appointment-675037ae6...",
    "uid": 0,
    "appId": "bc3..."
  }
}
```

## 3. Mobile Implementation Workflow

Follow these steps in your mobile, React Native, or Flutter code.

### Step 1: Initialize Agora Engine
Initialize the Agora Rtc Engine with your App ID.
*Note: Ensure you request Camera and Microphone permissions from the OS.*

### Step 2: Fetch Token
Call the `POST /api/v1/agora/token` endpoint described above using the `appointmentId` provided by the app's navigation/state.

### Step 3: Join Channel
Use the `joinChannel` method of the SDK.

-   **Token**: `data.token` from the API response.
-   **Channel Name**: `data.channelName` from the API response (e.g., `appointment-123`).
-   **UID**: `data.uid` from the API response (or the one you passed).

```javascript
// Example (Pseudo-code / React Native)
await api.joinChannel(token, channelName, uid, {
  clientRoleType: ClientRole.Broadcaster
});
```

### Step 4: Handle Media Streams
-   **Local User**: Create/Enable local video and audio tracks and publish them.
-   **Remote Users**: Listen for `UserJoined` or `UserPublished` events to render the other participant's video.

## 4. Cloud Recording (Optional)

If the mobile app needs to control recording (usually only the Consultant), use these endpoints.

### Start Recording
**Endpoint**: `POST /api/v1/agora/recording/start`
-   **Body**:
    ```json
    {
      "appointmentId": "...",
      "mode": "mix", 
      "storageConfig": { ... } // Optional custom storage config
    }
    ```
-   **Permissions**: Only 'Consultant' or 'Admin' role can initiate this.

### Stop Recording
**Endpoint**: `POST /api/v1/agora/recording/stop`
-   **Body**:
    ```json
    {
      "appointmentId": "...",
      "mode": "mix"
    }
    ```

### Get Recording Status
**Endpoint**: `GET /api/v1/agora/recording/status/:appointmentId`

## 5. Important Implementation Details

1.  **Channel Naming Convention**: The specific format `appointment-{id}` is enforced by the backend validator (`backend/src/api/v1/controllers/agora.controller.js`). You cannot use arbitrary channel names.
2.  **Security**: The backend validates that the `req.user.id` matches either the `client` or `consultant` field in the Appointment document. Users cannot join appointments they don't belong to.
3.  **Error Handling**:
    -   `403 Forbidden`: User is not a participant in this appointment.
    -   `404 Not Found`: Appointment ID does not exist.
