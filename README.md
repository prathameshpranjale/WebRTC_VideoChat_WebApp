# WebRTC Video Chat Application

A simple, peer-to-peer video chat application using **WebRTC** and **Firebase Firestore**. This project allows two users to initiate, answer, and hang up video calls directly in the browser.

## Features

- **Start Video Call**: Users can initiate a video call with a unique ID.
- **Join a Video Call**: Another user can join the call using the unique ID.
- **Hang Up**: Either user can end the call, stopping streams and cleaning up session data.

## Technologies Used

- **WebRTC**: For establishing peer-to-peer video and audio connections.
- **Firebase Firestore**: For signaling, storing, and retrieving call offers and answers.

## Getting Started

### Prerequisites

- [Node.js and npm](https://nodejs.org/) installed
- A Firebase project set up with Firestore enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/webrtc-video-chat.git
