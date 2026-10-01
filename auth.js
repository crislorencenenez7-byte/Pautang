import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  getIdToken
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const config = window.PAUTANG_FIREBASE_CONFIG;


if (!config || !config.apiKey) {
  throw new Error("Firebase configuration is missing.");
}


const app = initializeApp(config);


/* Firebase services */
export const auth = getAuth(app);
export const db = getFirestore(app);


/* Authentication functions */
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  getIdToken
};


/*
 * Global references
 */
window.PAUTANG_AUTH = auth;
window.PAUTANG_GET_ID_TOKEN = getIdToken;


/*
 * Firebase Auth readiness
 *
 * Other pages can wait until Firebase
 * has restored the current session.
 */
window.PAUTANG_AUTH_READY = new Promise((resolve) => {

  let settled = false;

  onAuthStateChanged(auth, (user) => {

    if (!settled) {

      settled = true;

      resolve(user || null);

    }

  });

});


/*
 * Wait for the currently signed-in user.
 */
window.PAUTANG_WAIT_FOR_USER = async function(timeoutMs = 15000) {

  const start = Date.now();


  while (!window.PAUTANG_AUTH_READY) {

    if (Date.now() - start > timeoutMs) {

      throw new Error(
        "Firebase session is still loading. Please refresh and try again."
      );

    }


    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

  }


  const user = await Promise.race([

    window.PAUTANG_AUTH_READY,

    new Promise((_, reject) => {

      setTimeout(() => {

        reject(
          new Error(
            "Firebase session is still loading. Please refresh and try again."
          )
        );

      }, timeoutMs);

    })

  ]);


  if (!user) {

    throw new Error(
      "Your session expired. Please sign in again."
    );

  }


  return user;

};
