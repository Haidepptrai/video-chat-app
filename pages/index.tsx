import { useState } from "react";
import MeetingButton from "./components/ChooseOptionButton";
import HostMeetingSection from "./page-sections/HostMeetingSection";
import JoinMeetingSection from "./page-sections/JoinMeetingSection";

export default function ChatPage() {
  const [isHosting, setIsHosting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = (state: boolean) => {
    setIsHosting(state); // Show HostMeetingSection
  };

  const handleJoinRoom = (state: boolean) => {
    setIsJoining(state); // Show JoinMeetingSection
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-[80%] p-5">
        <h1 className="text-3xl font-bold text-center mb-4">
          Video/Audio Chat
        </h1>

        {isHosting ? (
          <HostMeetingSection handleLeave={() => handleCreateRoom(false)} />
        ) : isJoining ? (
          <JoinMeetingSection handleLeave={() => handleJoinRoom(false)} />
        ) : (
          <div className="flex flex-col items-center">
            <MeetingButton
              label="Create Room"
              color="bg-blue-500 text-white"
              onClick={() => handleCreateRoom(true)}
            />

            <div className="mt-4">
              <MeetingButton
                label="Join Room"
                color="bg-green-500 text-white"
                onClick={() => handleJoinRoom(true)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
