# EduTOTP Verification Extension & Demo

This is an educational Chrome Extension that demonstrates how Time-based One-Time Passwords (TOTP) work (RFC 6238). It includes a manual TOTP generator and an autofill feature for test websites.

## 📂 Project Structure

- `manifest.json`: Configuration for the Chrome Extension (Manifest V3).
- `popup.html` & `popup.js`: The user interface for the extension popup.
- `totp.js`: A vanilla JavaScript implementation of TOTP (HMAC-SHA1) using the Web Crypto API.
- `content.js`: Script that runs on web pages to handle autofill requests.
- `demo.html`: A standalone HTML page acting as a "test server" to verify keys.

## 🚀 How to Load the Extension

1. **Open Chrome** and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `totp-educational-extension` folder (this folder).
5. The extension "Educational TOTP Extension" should appear in your list.
6. **Important**: Find the extension in the list, click "Details", and toggle on **Allow access to file URLs** (this is needed for the extension to work on the local `demo.html` file).

## 🧪 How to Test

1. **Open the Demo Page**:
   - Double-click `demo.html` in this folder to open it in Chrome.
   - Or drag `demo.html` into a Chrome tab.

2. **Copy the Secret**:
   - On the demo page, click the secret code box (`JBSWY3DPEHPK3PXP`) to copy it.

3. **Configure the Extension**:
   - Click the extension icon in the Chrome toolbar.
   - Paste the secret into the "Enter TOTP Secret" field.
   - Click **Save Secret**.
   - You should see a live 6-digit code generating.

4. **Verify Manual Entry**:
   - Type the code from the extension into the demo page input.
   - Click "Verify Login" on the page.

5. **Test Autofill**:
   - Refresh the demo page if needed.
   - Open the extension popup.
   - Click **Autofill OTP**.
   - The code should automatically appear in the input field, and the button should be clicked automatically.
   - You should see a "SUCCESS! 2FA Verified" message on the page.

## ⚠️ Note

This project is for **educational purposes only**.
- It uses `localStorage` for secret storage (not encrypted).
- It is designed to work with the provided demo page or simple test forms.
- Do not use for real sensitive accounts.
