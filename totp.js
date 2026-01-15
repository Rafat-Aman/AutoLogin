// TOTP Implementation using Web Crypto API
// RFC 6238 (TOTP) and RFC 4226 (HOTP)

// Attach to window to ensure visibility in other content scripts
window.TOTP = {
  // RFC 4648 Base32 alphabet
  base32Chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",

  // Decode Base32 string to Uint8Array
  base32ToBuf: function (str) {
    str = str.toUpperCase().replace(/=+$/, "");
    let binary = "";
    for (let i = 0; i < str.length; i++) {
      const val = this.base32Chars.indexOf(str[i]);
      if (val === -1) throw new Error("Invalid Base32 character");
      binary += val.toString(2).padStart(5, "0");
    }
    const len = Math.floor(binary.length / 8);
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buf[i] = parseInt(binary.slice(i * 8, (i + 1) * 8), 2);
    }
    return buf;
  },

  // Convert number to 8-byte big-endian Uint8Array
  intToBuf: function (num) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    // JS numbers are 64-bit float. We care about the lower 64 bits for counter.
    // For normal TOTP times, the high 32 bits are 0.
    view.setUint32(4, num, false); // Set lower 32 bits, big-endian
    view.setUint32(0, 0, false);   // Set upper 32 bits to 0
    return new Uint8Array(buf);
  },

  // Generate HMAC-SHA1
  hmacSha1: async function (key, data) {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: { name: "SHA-1" } },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    return new Uint8Array(signature);
  },

  // Generate TOTP code
  generate: async function (secretBase32) {
    try {
      const keyBytes = this.base32ToBuf(secretBase32);
      const epoch = Math.floor(Date.now() / 1000);
      const timeStep = 30; // 30 seconds
      const counter = Math.floor(epoch / timeStep);
      const counterBytes = this.intToBuf(counter);

      const hmac = await this.hmacSha1(keyBytes, counterBytes);

      // Dynamic Truncation
      const offset = hmac[hmac.length - 1] & 0xf;
      const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const otp = binary % 1000000;
      return otp.toString().padStart(6, "0");
    } catch (e) {
      console.error("TOTP Generation Error:", e);
      return "ERROR";
    }
  },

  // Calculate seconds remaining in current window
  getRemainingContext: function () {
    const epoch = Math.floor(Date.now() / 1000);
    return 30 - (epoch % 30);
  }
};
