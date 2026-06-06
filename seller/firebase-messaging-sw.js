importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyDIAmXtrQCkRVAbQUpjVlS7bp5y0hy0-0o",
  authDomain: "ecommerce-pushnotificati-f30d6.firebaseapp.com",
  projectId: "ecommerce-pushnotificati-f30d6",
  messagingSenderId: "460747941687",
  appId: "1:460747941687:web:e5ce403465a501335adcb2",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Background message:", payload);

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
  });
});
