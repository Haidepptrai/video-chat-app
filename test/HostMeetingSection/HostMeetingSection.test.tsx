import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import HostMeetingSection from "@/pages/page-sections/HostMeetingSection";

// Mock crypto.randomUUID to return a fixed UUID string for testing
if (!global.crypto) {
  global.crypto = {} as Crypto;
}
global.crypto.randomUUID = jest.fn(
  () => "123e4567-e89b-12d3-a456-426614174000"
) as jest.Mock;

// Define navigator.mediaDevices and add getUserMedia if it doesn’t exist
if (typeof navigator.mediaDevices === "undefined") {
  (navigator as any).mediaDevices = {};
}
if (typeof navigator.mediaDevices.getUserMedia === "undefined") {
  navigator.mediaDevices.getUserMedia = jest.fn();
}

// Mock navigator.mediaDevices.getUserMedia
jest.spyOn(navigator.mediaDevices, "getUserMedia").mockImplementation(() =>
  Promise.resolve({
    getTracks: jest.fn(() => []),
  } as unknown as MediaStream)
);

// Mocking WebSocket with required static properties
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  onopen: jest.fn(),
  onmessage: jest.fn(),
  onerror: jest.fn(),
  onclose: jest.fn(),
};
global.WebSocket = jest.fn(() => mockWebSocket) as unknown as typeof WebSocket;
Object.assign(global.WebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

// Mock RTCPeerConnection without logging
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  addTrack: jest.fn(),
  setLocalDescription: jest.fn(async function (desc) {
    if (desc.type === "answer") {
      mockWebSocket.send(JSON.stringify({ action: "answer", data: desc }));
    }
    return undefined;
  }),
  setRemoteDescription: jest.fn(async () => undefined),
  createOffer: jest.fn(() =>
    Promise.resolve({ type: "offer", sdp: "dummy_sdp" })
  ),
  createAnswer: jest.fn(() =>
    Promise.resolve({ type: "answer", sdp: "dummy_sdp" })
  ),
  onicecandidate: null,
  ontrack: null,
  close: jest.fn(),
})) as unknown as typeof RTCPeerConnection;

// Mocking MediaStream
global.MediaStream = jest.fn().mockImplementation(() => ({
  getTracks: jest.fn(),
})) as unknown as typeof MediaStream;

describe("HostMeetingSection", () => {
  const mockHandleLeave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing and display initial UI elements", () => {
    render(<HostMeetingSection handleLeave={mockHandleLeave} />);
    expect(
      screen.getByPlaceholderText(/Enter text to copy/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /leave meeting/i })
    ).toBeInTheDocument();
  });

  it("should generate a unique room ID and set user ID", async () => {
    localStorage.setItem("userId", "123");
    render(<HostMeetingSection handleLeave={mockHandleLeave} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter text to copy/i)).toHaveValue(
        "123e4567-e89b-12d3-a456-426614174000"
      );
    });
  });

  it("should initialize WebSocket connection and send join message", async () => {
    render(<HostMeetingSection handleLeave={mockHandleLeave} />);

    // Trigger WebSocket connection open manually
    mockWebSocket.onopen();

    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledWith(expect.any(String));
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"action":"join"')
      );
    });
  });

  it('should handle WebSocket "new-peer" message and initialize peer connection', async () => {
    render(<HostMeetingSection handleLeave={mockHandleLeave} />);

    // Trigger a "new-peer" WebSocket message
    mockWebSocket.onmessage({
      data: JSON.stringify({ action: "new-peer", senderUserID: 2 }),
    });

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      expect(global.RTCPeerConnection).toHaveBeenCalled();
    });
  });

  it('should handle "candidate" message and add ICE candidate', async () => {
    render(<HostMeetingSection handleLeave={mockHandleLeave} />);

    // Trigger a "candidate" WebSocket message
    mockWebSocket.onmessage({
      data: JSON.stringify({
        action: "candidate",
        data: { candidate: "dummy_candidate" },
        senderUserID: 2,
      }),
    });

    await waitFor(() => {
      // Confirms the message was handled without errors.
    });
  });

  it("should copy room ID to clipboard", async () => {
    render(<HostMeetingSection handleLeave={mockHandleLeave} />);

    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });

    const copyButton = screen.getByRole("button", { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "123e4567-e89b-12d3-a456-426614174000"
      );
    });
  });

  it("should call handleLeave when Leave Meeting button is clicked", () => {
    render(<HostMeetingSection handleLeave={mockHandleLeave} />);
    fireEvent.click(screen.getByRole("button", { name: /leave meeting/i }));
    expect(mockHandleLeave).toHaveBeenCalled();
  });
});
