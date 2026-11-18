# Bloom LAN test APK

APK: `Bloom-LAN-Test.apk`
Package: `com.indiery1235.bloomchatmobile`
SHA-256: `A5CE98C1C3266C605331CEEF44F8EB2A2AC4C0F86FFAED4A3A8C24D25E840BD0`

## Start a two-phone test

1. On this PC, open PowerShell and start the API from this project:

   ```powershell
   cd "C:\Users\sumit\OneDrive\Desktop\bloom chat\BACKEND"
   npm run dev
   ```

   Keep that window running. The API must be reachable at `http://192.168.29.224:5000`.

2. Connect both Android phones to the same Wi-Fi network as this PC. If the PC's Wi-Fi address changes from `192.168.29.224`, this APK needs to be rebuilt with the new address.

3. Transfer `Bloom-LAN-Test.apk` to both phones and install it. Android may ask you to allow installs from the file app. Open Bloom on each phone, create a different account/session, and allow camera and microphone access when prompted.

4. On both phones, start a random match. The first stays on the searching screen until the second joins. Send messages in both directions, then use the voice or video call controls and answer on the other phone. When one person leaves, the other returns to searching. Use **Add** to send a friend request; the recipient accepts it in **Friends > Requests**. The conversation appears in **Chats** only after approval.

5. When testing a call with the Android Emulator, enable **Extended Controls > Microphone > Enable Host Microphone Access**. The `Launch-Bloom-Phone.bat` script also enables it. Allow Bloom's microphone permission on the emulator and Android phone.

Explore shows real members you have not previously matched or become friends with. Chats shows only accepted friends. Contacts added by older APK versions without an acceptance appear as pending requests for one side to approve before returning to Chats.

## Network note

The API is running on this PC. Windows may block inbound connections to TCP port 5000. For phone tests, use a trusted network and allow `node.exe` or TCP port 5000 through Windows Firewall on that network. The server listens on all network interfaces. Check `http://192.168.29.224:5000/health` from a phone browser; it should return `{"status":"ok","service":"bloomchat-api",...}` before opening Bloom.

This is a QA APK signed with the Android debug key. It is configured for this PC's LAN address; it is not a Play Store build. Match waiting, rematching, Explore's exclusion of connected people, friend approval, call signaling, and live chat were verified with API sessions. Voice/video media still needs a real two-phone call to verify camera, microphone, and network conditions; phones on separate networks may also need a deployed HTTPS API and TURN relay.
