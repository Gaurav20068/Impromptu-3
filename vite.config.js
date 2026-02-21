// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCi4l9qsnThXeMFZ1xGholvWHmDJrca01A",
  authDomain: "impromptu-b1aa6.firebaseapp.com",
  projectId: "impromptu-b1aa6",
  storageBucket: "impromptu-b1aa6.firebasestorage.app",
  messagingSenderId: "304404810717",
  appId: "1:304404810717:web:5516f765310b2930f20434",
  measurementId: "G-Q997Y75BR7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
