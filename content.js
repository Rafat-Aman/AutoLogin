// EduTOTP Content Script
// This script runs on web pages to facilitate interaction

console.log("EduTOTP Content Script Loaded");

// Helper to find element by XPath
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

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main Autonomous Function
async function autoRun() {
    // 1. Get Configuration
    const data = await chrome.storage.local.get(['totpSecret', 'userNumber', 'userPassword', 'actionDelay']);
    const { totpSecret, userNumber, userPassword } = data;
    const delay = parseInt(data.actionDelay) || 1000;

    if (!totpSecret) {
        console.log("EduTOTP: No secret configured, skipping auto-run.");
        return;
    }

    console.log("EduTOTP: checking page state...");

    // 2. Check for User Number Page (Step 1)
    const userXPath = '//*[@id="UserName"]';
    const userInput = getElementByXPath(userXPath);

    if (userInput && userNumber) {
        console.log("EduTOTP: Found User Input field.");
        // Check if empty or fill anyway? Let's fill.
        fillInput(userInput, userNumber);

        const nextBtnXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/input[2]';
        const nextBtn = getElementByXPath(nextBtnXPath);

        if (nextBtn) {
            console.log(`EduTOTP: Clicking Next in ${delay}ms...`);
            await wait(delay);
            nextBtn.click();
        }
        return; // Don't try next steps immediately on same page load if page reload is expected
    }

    // 3. Check for Password/OTP Page (Step 2)
    // We check for OTP input presence
    const otpXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[3]/div[2]/div/input';
    const otpInput = getElementByXPath(otpXPath) || document.getElementById('otp-input');

    if (otpInput) {
        console.log("EduTOTP: Found OTP Input field.");

        // Fill Password
        if (userPassword) {
            const passXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[2]/div[2]/div/input';
            const passInput = getElementByXPath(passXPath);
            if (passInput) {
                fillInput(passInput, userPassword);
            }
        }

        // Generate Code
        try {
            // TOTP object is available because totp.js is loaded before content.js in manifest
            const code = await TOTP.generate(totpSecret);

            // Fill OTP
            fillInput(otpInput, code);
            // Visual feedback
            otpInput.style.backgroundColor = '#d1fae5';

            const submitXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/input[3]';
            const submitBtn = getElementByXPath(submitXPath) || document.getElementById('submit-btn');

            if (submitBtn) {
                console.log(`EduTOTP: Clicking Submit in ${delay}ms...`);
                await wait(delay);
                submitBtn.click();
            }

        } catch (e) {
            console.error("EduTOTP: Error generating code or filling:", e);
        }
    }

    // 4. Check for Landing Page (Advising Navigation)
    if (window.location.href.includes("students/landing")) {
        console.log("EduTOTP: On Landing Page, attempting navigation to Advising...");

        const menuXPath = '//*[@id="sidebar"]/ul/li[4]/a';
        const menuLink = getElementByXPath(menuXPath);

        if (menuLink) {
            // Dispatch events to simulate hover just in case it's needed for visibility
            menuLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            menuLink.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

            // Wait slightly for menu animation if any
            await wait(delay / 2);

            // Try clicking the parent menu if it's a click-to-open style
            menuLink.click();

            await wait(delay / 2);

            const advisingXPath = '//*[@id="sidebar"]/ul/li[4]/ul/li/a';
            const advisingLink = getElementByXPath(advisingXPath);

            if (advisingLink) {
                console.log(`EduTOTP: Clicking Advising link in ${delay}ms...`);
                await wait(delay);
                advisingLink.click();
            } else {
                console.log("EduTOTP: Advising link not found (visible?).");
            }
        }
    }
}

// Global toggle check
// Global toggle check
chrome.storage.local.get(['automationEnabled'], (result) => {
    // Default to TRUE if undefined to match "worked before" behavior
    if (result.automationEnabled !== false) {
        console.log("EduTOTP: Automation enabled.");
        autoRun();
    } else {
        console.log("EduTOTP: Automation disabled, standing by.");
    }
});

// Listener for Popup commands
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start") {
        console.log("EduTOTP: Received START command.");
        autoRun();
        sendResponse({ status: "started" });
    }
    else if (request.action === "stop") {
        console.log("EduTOTP: Received STOP command. Reloading to halt...");
        // Reloading is the most effective way to kill any pending async waits/clicks
        window.location.reload();
        sendResponse({ status: "stopped" });
    }
    return true;
});
