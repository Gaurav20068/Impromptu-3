import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Impromptu-3/', 
  plugins: [react()],
  define: {
    __firebase_config: JSON.stringify({
      apiKey: "PASTE_YOUR_API_KEY_HERE",
      authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
      projectId: "PASTE_YOUR_PROJECT_ID_HERE",
      storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
      messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
      appId: "PASTE_YOUR_APP_ID_HERE"
    }),
    __app_id: JSON.stringify('impromptu-v1')
  }
})
