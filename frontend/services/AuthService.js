// frontend/services/AuthService.js
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

export async function signUp(email, password) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCred.user;

  // You don’t need to store the token — apiRequest will fetch it live
  return { uid: user.uid, email: user.email };
}

export async function login(email, password) {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const user = userCred.user;
  return { uid: user.uid, email: user.email };
}

export async function logout() {
  await signOut(auth);
}
