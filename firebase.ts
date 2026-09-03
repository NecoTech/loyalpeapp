import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBnUV2_7RQP-MWiQEmM_BUeAb4FA-pxpgg",
    authDomain: "434a-2607-fea8-e0a7-d100-510c-1125-8aae-3f5a.ngrok-free.app",
    projectId: "oderapp-e0042",
    storageBucket: "oderapp-e0042.firebasestorage.app",
    messagingSenderId: "920227000930",
    appId: "1:920227000930:web:950bc3a4dc0a08a56b173b",
    measurementId: "G-F0P2ZPHP2D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

