import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDxalA1t2esXeCqILrfL8OHrfhHjSqTiHI',
  authDomain: 'tracenet-cebu.firebaseapp.com',
  projectId: 'tracenet-cebu',
  storageBucket: 'tracenet-cebu.firebasestorage.app',
  messagingSenderId: '544387003898',
  appId: '1:544387003898:web:5b95df0927a669fbc7e043',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
