import React, { useEffect, useRef } from 'react';
import { useAgoraVideoCall } from '../../hooks/useAgoraVideoCall';
import { Button } from '../ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Circle, Square } from 'lucide-react';

interface VideoCallRoomProps {
  appointmentId: string;
  appId: string;
  userId?: string | number;
  role?: 'publisher' | 'audience';
  onLeave?: () => void;
}

export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({
  appointmentId,
  appId,
  userId,
  role = 'publisher',
  onLeave,
}) => {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<{ [uid: number]: HTMLDivElement }>({});

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
    appId,
    userId,
    role,
  });

  // Mount local video
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      localVideoTrack.play(localVideoRef.current);
    }
    return () => {
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
    };
  }, [localVideoTrack]);

  // Mount remote videos
  useEffect(() => {
    remoteUsers.forEach((user) => {
      if (user.videoTrack && remoteVideoRefs.current[user.uid]) {
        user.videoTrack.play(remoteVideoRefs.current[user.uid]);
      }
    });
  }, [remoteUsers]);

  // Auto-join on mount
  useEffect(() => {
    if (!isJoined && !loading) {
      joinChannel();
    }
  }, []);

  const handleLeave = async () => {
    await leaveChannel();
    if (onLeave) {
      onLeave();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {error && (
        <div className="bg-red-500 text-white p-4 text-center">
          {error}
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Local Video */}
        {localVideoTrack && (
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <div
              ref={localVideoRef}
              className="w-full h-full"
            />
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              You {localAudioTrack?.enabled === false && '(Muted)'}
            </div>
          </div>
        )}

        {/* Remote Videos */}
        {remoteUsers.map((user) => (
          <div
            key={user.uid}
            className="relative bg-gray-800 rounded-lg overflow-hidden"
          >
            <div
              ref={(el) => {
                if (el) remoteVideoRefs.current[user.uid] = el;
              }}
              className="w-full h-full"
            />
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              User {user.uid}
            </div>
          </div>
        ))}

        {remoteUsers.length === 0 && !localVideoTrack && (
          <div className="flex items-center justify-center bg-gray-800 rounded-lg">
            <p className="text-gray-400">Waiting for other participants...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-center gap-4">
        {role === 'publisher' && (
          <>
            <Button
              variant={localAudioTrack?.enabled ? 'default' : 'destructive'}
              onClick={toggleAudio}
              disabled={loading || !localAudioTrack}
            >
              {localAudioTrack?.enabled ? <Mic /> : <MicOff />}
            </Button>

            <Button
              variant={localVideoTrack?.enabled ? 'default' : 'destructive'}
              onClick={toggleVideo}
              disabled={loading || !localVideoTrack}
            >
              {localVideoTrack?.enabled ? <Video /> : <VideoOff />}
            </Button>

            <Button
              variant={isRecording ? 'destructive' : 'default'}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
            >
              {isRecording ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Circle className="mr-2 h-4 w-4" />
                  Start Recording
                </>
              )}
            </Button>
          </>
        )}

        <Button
          variant="destructive"
          onClick={handleLeave}
          disabled={loading}
        >
          <PhoneOff className="mr-2 h-4 w-4" />
          Leave Call
        </Button>
      </div>
    </div>
  );
};

