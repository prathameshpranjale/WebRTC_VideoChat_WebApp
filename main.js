import './style.css';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, getDoc, onSnapshot, updateDoc, deleteDoc,setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBLTbK6IBb1yYTeLZbIx4VIKoB9RZGYcJY",
  authDomain: "practice-ad78f.firebaseapp.com",
  databaseURL: "https://practice-ad78f-default-rtdb.firebaseio.com",
  projectId: "practice-ad78f",
  storageBucket: "practice-ad78f.firebasestorage.app",
  messagingSenderId: "261416380652",
  appId: "1:261416380652:web:7651e827a281a6aa6b5dc9",
  measurementId: "G-1PBQG0T3K5"
};
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ],
  iceCandidatePoolSize: 10
};
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

// Set up media sources
webcamButton.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();

    // Add local tracks to peer connection
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    pc.ontrack = event => {
      event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
    };

    webcamVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
    callButton.disabled = false;
    answerButton.disabled = false;
    webcamButton.disabled = true;
  } catch (error) {
    console.error("Error accessing media devices:", error);
  }
};

callButton.onclick = async () => {
  const callDoc = doc(collection(firestore, 'calls')); // Reference a new document
  const offerCandidates = collection(callDoc, 'offerCandidates');
  const answerCandidates = collection(callDoc, 'answerCandidates');

  try {
    // Set an empty initial document to ensure it exists
    await setDoc(callDoc, {});

    callInput.value = callDoc.id;

    pc.onicecandidate = event => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    // Update the document with the offer data
    await updateDoc(callDoc, { offer });

    // Listen for remote answer
    onSnapshot(callDoc, snapshot => {
      const data = snapshot.data();
      if (data?.answer && !pc.currentRemoteDescription) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });

    // Listen for remote ICE candidates
    onSnapshot(answerCandidates, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });

    hangupButton.disabled = false;
  } catch (error) {
    console.error("Error creating offer:", error);
  }
};

// Answer a call
answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = doc(firestore, 'calls', callId);
  const answerCandidates = collection(callDoc, 'answerCandidates');
  const offerCandidates = collection(callDoc, 'offerCandidates');

  try {
    const callData = (await getDoc(callDoc)).data();
    if (!callData?.offer) {
      console.log("No offer found in the document");
      return;
    }

    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    await updateDoc(callDoc, { answer: answerDescription });

    // Listen for ICE candidates from the caller
    onSnapshot(offerCandidates, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate).catch(error => console.error("Error adding ICE candidate:", error));
        }
      });
    });
  } catch (error) {
    console.error("Error answering call:", error);
  }
};

// Hang up and clean up
hangupButton.onclick = async () => {
  try {
    // Stop all tracks and close the peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    pc.close();

    // Reset states and UI
    localStream = null;
    remoteStream = null;
    callInput.value = '';
    webcamButton.disabled = false;
    callButton.disabled = true;
    answerButton.disabled = true;
    hangupButton.disabled = true;

    console.log("Call ended and resources cleaned up.");

    // Delete the call document and subcollections in Firestore
    const callId = callInput.value;
    if (callId) {
      const callDoc = doc(firestore, 'calls', callId);

      // Delete subcollections: offerCandidates and answerCandidates
      const offerCandidates = collection(callDoc, 'offerCandidates');
      const answerCandidates = collection(callDoc, 'answerCandidates');

      // Delete each candidate document in the subcollections
      const offerSnapshots = await getDocs(offerCandidates);
      const answerSnapshots = await getDocs(answerCandidates);

      offerSnapshots.forEach(async (doc) => await deleteDoc(doc.ref));
      answerSnapshots.forEach(async (doc) => await deleteDoc(doc.ref));

      // Finally, delete the call document itself
      await deleteDoc(callDoc);

      console.log("Call document and subcollections deleted.");
    }
  } catch (error) {
    console.error("Error during hangup cleanup:", error);
  }
};

// Log connection state changes for debugging
pc.onconnectionstatechange = () => {
  console.log("Connection state change:", pc.connectionState);
  if (pc.connectionState === "connected") {
    console.log("Peers connected successfully.");
  }
};

// Handle ICE candidate errors
pc.onicecandidateerror = event => {
  console.error("ICE Candidate Error:", event);
};
