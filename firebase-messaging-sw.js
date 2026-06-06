importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyDWG_iActm-R7r7g_SGRGVhYLOs6Fznhyc",
  authDomain: "ecommerce-a95d1.firebaseapp.com",
  projectId: "ecommerce-a95d1",
  messagingSenderId: "1055002599238",
  appId: "1:1055002599238:web:a887c33b526b8c2faf4f47",
  measurementId: "G-ZHS0VWTQ72"
});

// Initialize Messaging
const messaging = firebase.messaging();

try {

  // Handle Background Notifications
  messaging.onBackgroundMessage((payload) => {

    console.log(
      "[firebase-messaging-sw.js] Background message received:",
      payload
    );

    try {

      // Notification Content
      const title =
        payload?.data?.title ||
        payload?.notification?.title ||
        "New Notification";

      const body =
        payload?.data?.body ||
        payload?.notification?.body ||
        "You have a new message.";

      // Click URL
      const clickUrl =
        payload?.data?.url ||
        "https://ecommerce-rosy-iota.vercel.app/";

      // Notification Options
      const options = {

        body: body,

        icon:
          "https://cdn-icons-png.flaticon.com/512/2838/2838912.png",

        badge:
          "https://cdn-icons-png.flaticon.com/512/2838/2838912.png",

        image:
          payload?.data?.image || undefined,

        vibrate: [200, 100, 200],

        requireInteraction: true,

        renotify: true,

        silent: false,

        timestamp: Date.now(),

        tag:
          payload?.data?.tag ||
          "notification-" + Date.now(),

        data: {
          url: clickUrl
        },

        actions: [
          {
            action: "open",
            title: "Open"
          },
          {
            action: "close",
            title: "Dismiss"
          }
        ]

      };

      // Show Notification
      self.registration.showNotification(
        title,
        options
      );

    } catch (innerError) {

      console.error(
        "[firebase-messaging-sw.js] Error displaying notification:",
        innerError
      );

    }

  });

  // Notification Click Event
  self.addEventListener(
    "notificationclick",
    function (event) {

      console.log(
        "[firebase-messaging-sw.js] Notification clicked:",
        event
      );

      event.notification.close();

      // Dismiss Button
      if (event.action === "close") {
        return;
      }

      // Target URL
      const targetUrl =
        event.notification.data.url;

      event.waitUntil(

        clients.matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then((clientList) => {

          // Focus Existing Window
          for (const client of clientList) {

            if (
              client.url.includes(
                "ecommerce-rosy-iota.vercel.app"
              ) &&
              "focus" in client
            ) {

              client.navigate(targetUrl);

              return client.focus();

            }

          }

          // Open New Window
          if (clients.openWindow) {
            return clients.openWindow(targetUrl);
          }

        })

      );

    }
  );

} catch (error) {

  console.error(
    "[firebase-messaging-sw.js] Setup Error:",
    error
  );

}

}
