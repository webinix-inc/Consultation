import { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraAPI from '../api/agora.api';

interface UseAgoraVideoCallOptions {
  appointmentId: string;
  appId: string;
  userId?: string | number;
  role?: 'publisher' | 'audience';
}

interface UseAgoraVideoCallReturn {
  localVideoTrack: any;
  localAudioTrack: any;
  remoteUsers: any[];
  isJoined: boolean;
  isRecording: boolean;
  joinChannel: () => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  error: string | null;
  loading: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export function useAgoraVideoCall({
  appointmentId,
  appId,
  userId,
  role = 'publisher',
}: UseAgoraVideoCallOptions): UseAgoraVideoCallReturn {
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<any>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const clientRef = useRef<any>(null);
  const channelNameRef = useRef<string>('');

  useEffect(() => {
    // Initialize Agora client
    clientRef.current = AgoraRTC.createClient({
      mode: 'rtc',
      codec: 'vp8',
    });



    // Handle remote user events
    const handleUserPublished = async (user: any, mediaType: 'audio' | 'video') => {
      await clientRef.current.subscribe(user, mediaType);
      console.log("user", user)
      console.log("mediaType", mediaType)
      if (mediaType === 'video') {
        setRemoteUsers((prev) => {
          const existing = prev.find((u) => u.uid === user.uid);
          if (existing) {
            return prev.map((u) => (u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u));
          }
          return [...prev, { ...user, videoTrack: user.videoTrack }];
        });
      }
      if (mediaType === 'audio') {
        setRemoteUsers((prev) => {
          const existing = prev.find((u) => u.uid === user.uid);
          if (existing) {
            return prev.map((u) => (u.uid === user.uid ? { ...u, audioTrack: user.audioTrack } : u));
          }
          return [...prev, { ...user, audioTrack: user.audioTrack }];
        });
        user.audioTrack?.play();
      }
    };


    const handleUserUnpublished = (user: any, mediaType: 'audio' | 'video') => {
      if (mediaType === 'video') {
        setRemoteUsers((prev) =>
          prev.map((u) => (u.uid === user.uid ? { ...u, videoTrack: null } : u))
        );
      }
      if (mediaType === 'audio') {
        setRemoteUsers((prev) =>
          prev.map((u) => (u.uid === user.uid ? { ...u, audioTrack: null } : u))
        );
      }
    };

    const handleUserLeft = (user: any) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    clientRef.current.on('user-published', handleUserPublished);
    clientRef.current.on('user-unpublished', handleUserUnpublished);
    clientRef.current.on('user-left', handleUserLeft);

    return () => {
      if (clientRef.current) {
        clientRef.current.off('user-published', handleUserPublished);
        clientRef.current.off('user-unpublished', handleUserUnpublished);
        clientRef.current.off('user-left', handleUserLeft);
      }
    };
  }, []);



  const joinChannel = async () => {
    try {
      // Prevent multiple joins
      if (
        clientRef.current &&
        (clientRef.current.connectionState === 'CONNECTED' || clientRef.current.connectionState === 'CONNECTING')
      ) {
        console.warn('Already connected or connecting to channel');
        return;
      }

      setLoading(true);
      setError(null);

      // Generate channel name from appointment ID
      channelNameRef.current = `appointment-${appointmentId}`;


      // Get token from backend
      const { token, uid } = await AgoraAPI.generateToken(
        channelNameRef.current
      );



      // Join channel first
      const res = await clientRef.current.join(appId, channelNameRef.current, token, uid);



      // Create and publish local tracks if publisher
      if (role === 'publisher') {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();

        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        setAudioEnabled(true);
        setVideoEnabled(true);

        // Publish tracks immediately after creation
        await clientRef.current.publish([audioTrack, videoTrack]);
      }

      setIsJoined(true);
    } catch (err: any) {
      // If error is "already in connecting/connected state", just ignore
      if (err.code === 'INVALID_OPERATION' && err.message?.includes('connected')) {
        setIsJoined(true);
        return;
      }

      setError(err.message || 'Failed to join channel');
      console.error('Error joining channel:', err);
    } finally {
      setLoading(false);
    }
  };

  const leaveChannel = async () => {
    try {
      setLoading(true);

      // Stop and close local tracks
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }

      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }

      // Leave channel
      await clientRef.current.leave();

      setIsJoined(false);
      setRemoteUsers([]);
    } catch (err: any) {
      setError(err.message || 'Failed to leave channel');
      console.error('Error leaving channel:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAudio = () => {
    if (localAudioTrack) {
      const newState = !audioEnabled;
      localAudioTrack.setEnabled(newState);
      setAudioEnabled(newState);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrack) {
      const newState = !videoEnabled;
      localVideoTrack.setEnabled(newState);
      setVideoEnabled(newState);
    }
  };

  const startRecording = async () => {
    try {
      setLoading(true);
      await AgoraAPI.startRecording(appointmentId);
      setIsRecording(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = async () => {
    try {
      setLoading(true);
      await AgoraAPI.stopRecording(appointmentId);
      setIsRecording(false);
    } catch (err: any) {
      setError(err.message || 'Failed to stop recording');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
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
    audioEnabled,
    videoEnabled,
  };
}

