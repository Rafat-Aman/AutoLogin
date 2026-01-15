document.addEventListener('DOMContentLoaded', () => {
    const secretInput = document.getElementById('secret-input');
    const saveBtn = document.getElementById('save-btn');
    const clearBtn = document.getElementById('clear-btn');
    const autofillBtn = document.getElementById('autofill-btn');
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

    // Load secret from storage
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

    userNumberInput.addEventListener('input', () => {
        const num = userNumberInput.value.trim();
        chrome.storage.local.set({ userNumber: num });
    });

    passwordInput.addEventListener('input', () => {
        const pass = passwordInput.value; // Don't trim password
        chrome.storage.local.set({ userPassword: pass });
    });

    delayInput.addEventListener('input', () => {
        const delay = delayInput.value;
        chrome.storage.local.set({ actionDelay: delay });
    });

    saveBtn.addEventListener('click', () => {
        const secret = secretInput.value.trim().toUpperCase();
        if (!secret) return;
        // Basic validation could go here
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

    autofillBtn.addEventListener('click', async () => {
        const code = otpCodeWith.innerText;
        if (code === "------") return;

        const userNumber = userNumberInput.value.trim();
        const password = passwordInput.value;
        const delay = parseInt(delayInput.value) || 1000;

        // Send message to active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            try {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: "autofill",
                    code: code,
                    userNumber: userNumber,
                    password: password,
                    delay: delay
                });
                console.log("Autofill response:", response);
            } catch (e) {
                console.log("Could not send message, maybe content script not loaded?", e);
                // Fallback: Use scripting API if content script failed or we want to ensure it runs
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (code, userNumber, password, delay) => {
                        const waitBuffer = (ms) => new Promise(resolve => setTimeout(resolve, ms));

                        function getElementByXPath(path) {
                            return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        }

                        // Helper to fill input
                        function fillInput(el, value) {
                            if (!el) return;
                            el.value = value;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }

                        // Main execution function
                        async function execute() {
                            // 1. Try User Number Fill
                            if (userNumber) {
                                const userXPath = '//*[@id="UserName"]';
                                const userInput = getElementByXPath(userXPath);

                                if (userInput) {
                                    fillInput(userInput, userNumber);

                                    await waitBuffer(delay);

                                    const nextBtnXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/input[2]';
                                    const nextBtn = getElementByXPath(nextBtnXPath);
                                    if (nextBtn) nextBtn.click();

                                    // We need to wait for next inputs. 
                                    // Simple poll for fallback script
                                    let attempts = 0;
                                    const interval = setInterval(() => {
                                        attempts++;
                                        if (attempts > 40) clearInterval(interval); // 10-20 seconds max depending on delay? 

                                        // Wait a bit more if needed? setInterval is independent.

                                        const passXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[2]/div[2]/div/input';
                                        const passInput = getElementByXPath(passXPath);
                                        if (passInput && password) {
                                            fillInput(passInput, password);
                                        }

                                        const specificXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[3]/div[2]/div/input';
                                        let otpInput = getElementByXPath(specificXPath) || document.getElementById('otp-input') || document.querySelector('input[name="otp"]');

                                        if (otpInput) {
                                            fillInput(otpInput, code);

                                            // If we filled both (or just OTP if Pass not needed), click submit
                                            // But user only mentioned OTP and Pass filling.
                                            // Assume submit button might be next action
                                            const submitXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/input[3]';
                                            const btn = getElementByXPath(submitXPath) || document.getElementById('submit-btn');

                                            if (btn) {
                                                // Optional: wait before clicking submit?
                                                // Since we are in an interval, we can't await easily without clearing logic.
                                                // Let's just click.
                                                btn.click();
                                            }

                                            clearInterval(interval);
                                        }
                                    }, 500);
                                    return;
                                }
                            }

                            // 2. Direct Fill (if User Number box not found / already on step 2)
                            if (password) {
                                const passXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[2]/div[2]/div/input';
                                const passInput = getElementByXPath(passXPath);
                                fillInput(passInput, password);
                            }

                            let input = document.getElementById('otp-input') || document.querySelector('input[name="otp"]');
                            if (!input) {
                                const specificXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[3]/div[2]/div/input';
                                input = getElementByXPath(specificXPath);
                            }

                            if (input) {
                                fillInput(input, code);
                                console.log("EduTOTP: Injected code via scripting fallback.");

                                await waitBuffer(delay);

                                const submitXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/input[3]';
                                const btn = getElementByXPath(submitXPath) || document.getElementById('submit-btn');
                                if (btn) btn.click();
                            }
                        }

                        execute();
                    },
                    args: [code, userNumber, password, delay]
                });
            }
        }
    });

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
