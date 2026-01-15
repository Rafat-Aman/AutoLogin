document.addEventListener('DOMContentLoaded', () => {
    const secretInput = document.getElementById('secret-input');
    const saveBtn = document.getElementById('save-btn');
    const clearBtn = document.getElementById('clear-btn');

    // New Buttons
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');

    const otpCodeWith = document.getElementById('otp-code');
    const timerBar = document.getElementById('timer-bar');
    const timerText = document.getElementById('timer-text');
    const userNumberInput = document.getElementById('user-number-input');
    const passwordInput = document.getElementById('password-input');
    const delayInput = document.getElementById('delay-input');

    const setupSection = document.getElementById('setup-section');
    const otpSection = document.getElementById('otp-section');

    let currentSecret = null;
    let timerInterval = null;

    // Load setup from storage
    chrome.storage.local.get(['totpSecret', 'userNumber', 'userPassword', 'actionDelay'], (result) => {
        if (result.totpSecret) {
            currentSecret = result.totpSecret;
            showOtpSection();
        } else {
            showSetupSection();
        }
        if (result.userNumber) {
            userNumberInput.value = result.userNumber;
        }
        if (result.userPassword) {
            passwordInput.value = result.userPassword;
        }
        if (result.actionDelay) {
            delayInput.value = result.actionDelay;
        }
    });

    // Input Listeners
    userNumberInput.addEventListener('input', () => {
        chrome.storage.local.set({ userNumber: userNumberInput.value.trim() });
    });

    passwordInput.addEventListener('input', () => {
        chrome.storage.local.set({ userPassword: passwordInput.value });
    });

    delayInput.addEventListener('input', () => {
        chrome.storage.local.set({ actionDelay: delayInput.value });
    });

    // Button Listeners
    saveBtn.addEventListener('click', () => {
        const secret = secretInput.value.trim().toUpperCase();
        if (!secret) return;
        chrome.storage.local.set({ totpSecret: secret }, () => {
            currentSecret = secret;
            showOtpSection();
        });
    });

    clearBtn.addEventListener('click', () => {
        chrome.storage.local.remove('totpSecret', () => {
            currentSecret = null;
            showSetupSection();
        });
    });

    // Start Automation
    startBtn.addEventListener('click', async () => {
        // Enable flag
        chrome.storage.local.set({ automationEnabled: true });

        // UI Feedback
        const originalText = startBtn.innerText;
        startBtn.innerText = "Started!";
        setTimeout(() => startBtn.innerText = originalText, 1000);

        // Send message to current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: "start" }).catch((e) => {
                console.log("Could not send start message (content script may not be ready):", e);
            });
        }
    });

    // Stop Automation
    stopBtn.addEventListener('click', async () => {
        // Disable flag
        chrome.storage.local.set({ automationEnabled: false });

        // UI Feedback
        const originalText = stopBtn.innerText;
        stopBtn.innerText = "Stopped!";
        setTimeout(() => stopBtn.innerText = originalText, 1000);

        // Send message to current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: "stop" }).catch((e) => {
                console.log("Could not send stop message:", e);
            });
        }
    });


    // UI Helpers
    function showSetupSection() {
        setupSection.classList.remove('hidden');
        otpSection.classList.add('hidden');
        stopTimer();
    }

    function showOtpSection() {
        setupSection.classList.add('hidden');
        otpSection.classList.remove('hidden');
        startTimer();
        updateOtp();
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        updateOtp(); // Initial call
        timerInterval = setInterval(updateOtp, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    }

    async function updateOtp() {
        if (!currentSecret) return;

        // Use the TOTP global from totp.js
        const code = await TOTP.generate(currentSecret);
        const remaining = TOTP.getRemainingContext();

        otpCodeWith.innerText = code;
        timerText.innerText = `${remaining}s`;

        // Update bar width (30s = 100%)
        const percent = (remaining / 30) * 100;
        timerBar.style.width = `${percent}%`;

        // Color indication when running low
        if (remaining <= 5) {
            timerBar.style.background = '#ef4444'; // Red
        } else {
            timerBar.style.background = '#4f46e5'; // Primary
        }
    }
});
