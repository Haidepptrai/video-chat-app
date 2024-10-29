import React, { useEffect, useRef, useState } from "react";

interface Message {
  action: string;
  data?: any;
  roomId: string;
  userID: number;
  targetUserID?: number;
  senderUserID?: number;
  clients?: number[];
}

const generateUniqueId = (): string => {
  return crypto.randomUUID();
};

interface HostMeetingSectionProps {
  handleLeave: () => void;
}

const HostMeetingSection: React.FC<HostMeetingSectionProps> = ({
  handleLeave,
}) => {
  const [userID, setUserID] = useState<number | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<number, MediaStream>
  >({});

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  let localStream: MediaStream | null = null;
  const peerConnections: Record<number, RTCPeerConnection> = {};
  let socket: WebSocket | null = null;
  const [roomId, setRoomId] = useState<string>("");
  const messageQueue: string[] = [];

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      setUserID(parseInt(userId));
      setRoomId(generateUniqueId());
    }
  }, []);

  useEffect(() => {
    if (userID !== null) {
      initializeWebSocket();
    }

    return () => {
      if (socket) socket.close();
      Object.values(peerConnections).forEach((pc) => pc.close());
    };
  }, [userID]);

  const initializeWebSocket = () => {
    socket = new WebSocket(
      "wss://x6mfeq38bg.execute-api.us-east-1.amazonaws.com/production/"
    );

    socket.onopen = () => {
      console.log("WebSocket connection opened");

      sendMessage({
        action: "join",
        roomId: roomId,
        userID: userID as number,
      });

      while (messageQueue.length > 0) {
        if (socket) {
          socket.send(messageQueue.shift() as string);
        }
      }
    };

    socket.onmessage = async (message) => {
      let msg: Message;
      try {
        msg = JSON.parse(message.data);
      } catch (e) {
        console.error("Failed to parse message as JSON:", message.data);
        return;
      }
      const { action, data, senderUserID } = msg;

      if (senderUserID === userID) return;

      switch (action) {
        case "joined":
          await ensureLocalStream();
          msg.clients?.forEach(async (existingUserID) => {
            if (existingUserID !== userID && !peerConnections[existingUserID]) {
              await initializePeerConnection(existingUserID, true);
            }
          });
          break;
        case "new-peer":
          if (senderUserID !== undefined) {
            await initializePeerConnection(senderUserID, false);
          }
          break;
        case "offer":
          await handleOffer(data, senderUserID as number);
          break;
        case "answer":
          await handleAnswer(data, senderUserID as number);
          break;
        case "candidate":
          await handleCandidate(data, senderUserID as number);
          break;
        default:
          console.warn("Unknown action:", action);
          break;
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };
  };

  const ensureLocalStream = async () => {
    if (!localStream) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        console.log("Local stream obtained");
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    }
  };

  const initializePeerConnection = async (
    remoteUserID: number,
    isInitiator: boolean
  ) => {
    await ensureLocalStream();

    const pc = new RTCPeerConnection(peerConnectionConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          action: "candidate",
          data: event.candidate,
          roomId: roomId,
          userID: userID as number,
          targetUserID: remoteUserID,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prevStreams) => ({
          ...prevStreams,
          [remoteUserID]: event.streams[0],
        }));
      }
    };

    // Detect connection issues and remove disconnected peers
    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "closed"
      ) {
        console.log(`User ${remoteUserID} disconnected or unreachable`);
        removeRemoteStream(remoteUserID);
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        console.log(`User ${remoteUserID} connection state failed`);
        removeRemoteStream(remoteUserID);
      }
    };

    localStream
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStream as MediaStream));
    peerConnections[remoteUserID] = pc;

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendMessage({
          action: "offer",
          data: offer,
          roomId: roomId,
          userID: userID as number,
          targetUserID: remoteUserID,
        });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    }
  };

  const removeRemoteStream = (remoteUserID: number) => {
    // Close and delete peer connection
    peerConnections[remoteUserID]?.close();
    delete peerConnections[remoteUserID];

    // Remove from remoteStreams state
    setRemoteStreams((prevStreams) => {
      const updatedStreams = { ...prevStreams };
      delete updatedStreams[remoteUserID];
      return updatedStreams;
    });
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    senderUserID: number
  ) => {
    const pc = peerConnections[senderUserID];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage({
          action: "answer",
          data: answer,
          roomId: roomId,
          userID: userID as number,
          targetUserID: senderUserID,
        });
      } catch (error) {
        console.error("Error handling offer from:", senderUserID, error);
      }
    }
  };

  const handleAnswer = async (
    answer: RTCSessionDescriptionInit,
    senderUserID: number
  ) => {
    const pc = peerConnections[senderUserID];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("Error handling answer from:", senderUserID, error);
      }
    }
  };

  const handleCandidate = async (
    candidate: RTCIceCandidateInit,
    senderUserID: number
  ) => {
    const pc = peerConnections[senderUserID];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate from:", senderUserID, error);
      }
    }
  };

  const sendMessage = (message: Message) => {
    const fullMessage = { ...message, userID };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(fullMessage));
    } else {
      console.log("Queueing message:", fullMessage);
      messageQueue.push(JSON.stringify(fullMessage));
    }
  };

  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <div>
      <div className="flex justify-between gap-6">
        <input
          type="text"
          value={roomId}
          readOnly
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter text to copy"
        />
        <button
          onClick={handleCopy}
          className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center">
          {userID && <h3>You</h3>}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-64 h-48"
          />
        </div>
        <div className="flex gap-4">
          {Object.keys(remoteStreams).map((remoteID) => (
            <div className="text-center w-fit" key={remoteID}>
              <video
                ref={(video) => {
                  if (video && remoteStreams[parseInt(remoteID)]) {
                    video.srcObject = remoteStreams[parseInt(remoteID)];
                  }
                }}
                autoPlay
                playsInline
                className="w-64 h-48"
              />
              <span>Remote Video from User Id {remoteID}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end mt-10">
        <button
          className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          onClick={handleLeave}
        >
          Leave Meeting
        </button>
      </div>
    </div>
  );
};

export default HostMeetingSection;
