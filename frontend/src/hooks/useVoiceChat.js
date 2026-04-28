import { useState, useEffect, useRef, useCallback } from 'react';
import { createWebsocketClient } from '../services/websocket';
import { getUsername } from '../services/auth';

const useVoiceChat = (voiceChannelId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const username = getUsername();

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setLocalStream(null);
    setScreenStream(null);
    setRemoteStreams({});
    setParticipants([]);
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (clientRef.current) {
      // Send leave signal
      clientRef.current.publish({
        destination: '/app/voice.signal',
        body: JSON.stringify({ type: 'leave', channelId: voiceChannelId, senderId: username })
      });
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    setIsConnected(false);
  }, [voiceChannelId, username]);

  const createPeer = useCallback((targetId, isInitiator) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:64.181.206.113:3478' },
        { 
          urls: 'turn:64.181.206.113:3478', 
          username: 'harmony', 
          credential: 'harmony123' 
        }
      ]
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, screenStreamRef.current);
      });
    }

    peer.onnegotiationneeded = async () => {
      if (isInitiator && clientRef.current) {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          clientRef.current.publish({
            destination: '/app/voice.signal',
            body: JSON.stringify({
              type: 'offer',
              channelId: voiceChannelId,
              senderId: username,
              targetId: targetId,
              payload: peer.localDescription
            })
          });
        } catch (err) {
          console.error('Negotiation error', err);
        }
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && clientRef.current) {
        clientRef.current.publish({
          destination: '/app/voice.signal',
          body: JSON.stringify({
            type: 'candidate',
            channelId: voiceChannelId,
            senderId: username,
            targetId: targetId,
            payload: event.candidate
          })
        });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetId]: event.streams[0] }));
      setParticipants(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[targetId];
          return newStreams;
        });
        setParticipants(prev => prev.filter(p => p !== targetId));
      }
    };

    peersRef.current[targetId] = peer;
    return peer;
  }, [voiceChannelId, username]);

  const joinChannel = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const client = createWebsocketClient(
        () => {
          setIsConnected(true);
          subscriptionRef.current = client.subscribe(`/topic/voice/${voiceChannelId}`, async (msg) => {
            const signal = JSON.parse(msg.body);
            if (signal.senderId === username) return; // ignore self

            if (signal.type === 'join') {
              // A new user joined, add them to participants
              setParticipants(prev => prev.includes(signal.senderId) ? prev : [...prev, signal.senderId]);
              
              // Send them an offer
              const peer = createPeer(signal.senderId, true);
              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);
              client.publish({
                destination: '/app/voice.signal',
                body: JSON.stringify({
                  type: 'offer',
                  channelId: voiceChannelId,
                  senderId: username,
                  targetId: signal.senderId,
                  payload: peer.localDescription
                })
              });
            } else if (signal.type === 'offer' && signal.targetId === username) {
              setParticipants(prev => prev.includes(signal.senderId) ? prev : [...prev, signal.senderId]);
              const peer = createPeer(signal.senderId, false);
              await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              client.publish({
                destination: '/app/voice.signal',
                body: JSON.stringify({
                  type: 'answer',
                  channelId: voiceChannelId,
                  senderId: username,
                  targetId: signal.senderId,
                  payload: peer.localDescription
                })
              });
            } else if (signal.type === 'answer' && signal.targetId === username) {
              const peer = peersRef.current[signal.senderId];
              if (peer) {
                await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
              }
            } else if (signal.type === 'candidate' && signal.targetId === username) {
              const peer = peersRef.current[signal.senderId];
              if (peer) {
                await peer.addIceCandidate(new RTCIceCandidate(signal.payload));
              }
            } else if (signal.type === 'leave') {
              if (peersRef.current[signal.senderId]) {
                peersRef.current[signal.senderId].close();
                delete peersRef.current[signal.senderId];
              }
              setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[signal.senderId];
                return newStreams;
              });
              setParticipants(prev => prev.filter(p => p !== signal.senderId));
            }
          });

          // Announce presence
          client.publish({
            destination: '/app/voice.signal',
            body: JSON.stringify({ type: 'join', channelId: voiceChannelId, senderId: username })
          });
        },
        () => setIsConnected(false),
        (err) => console.error('Voice WS Error', err)
      );

      clientRef.current = client;
      client.activate();

    } catch (err) {
      console.error('Failed to get local audio stream', err);
    }
  }, [voiceChannelId, username, createPeer]);

  const leaveChannel = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (isConnected) {
      setParticipants(prev => prev.includes(username) ? prev : [username, ...prev]);
    } else {
      setParticipants(prev => prev.filter(p => p !== username));
    }
  }, [isConnected, username]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
  }, [cleanup]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 15 }
        },
        audio: true
      });
      screenStreamRef.current = stream;
      setScreenStream(stream);

      Object.values(peersRef.current).forEach((peer) => {
        stream.getTracks().forEach(track => {
          peer.addTrack(track, stream);
        });
        if (peer.onnegotiationneeded) peer.onnegotiationneeded();
      });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Failed to start screen share', err);
    }
  }, [voiceChannelId, username]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
  }, []);

  return { isConnected, localStream, screenStream, remoteStreams, participants, joinChannel, leaveChannel, startScreenShare, stopScreenShare };
};

export default useVoiceChat;
