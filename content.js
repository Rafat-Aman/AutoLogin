// EduTOTP Content Script
// This script runs on web pages to facilitate interaction

console.log("EduTOTP Content Script Loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "autofill") {
        console.log("EduTOTP: Received autofill request with code", request.code);

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

        // 1. Try User Number Fill (if provided)
        if (request.userNumber) {
            const userXPath = '//*[@id="UserName"]';
            const userInput = getElementByXPath(userXPath);

            if (userInput) {
                console.log("EduTOTP: Found User Input, filling...");
                fillInput(userInput, request.userNumber);

                const nextBtnXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/input[2]';
                const nextBtn = getElementByXPath(nextBtnXPath);
                if (nextBtn) {
                    console.log("EduTOTP: Clicking Next Button and starting observer");
                    nextBtn.click();

                    // Poll for next inputs (Password and OTP)
                    let attempts = 0;
                    const interval = setInterval(() => {
                        attempts++;
                        if (attempts > 40) clearInterval(interval); // 10 seconds timeout

                        let filled = false;

                        // Fill Password if provided
                        if (request.password) {
                            const passXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[2]/div[2]/div/input';
                            const passInput = getElementByXPath(passXPath);
                            if (passInput && passInput.value !== request.password) {
                                console.log("EduTOTP: Found Password input, filling...");
                                fillInput(passInput, request.password);
                                filled = true;
                            }
                        }

                        // Fill OTP
                        const specificXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[4]/div[2]/div/input';
                        let otpInput = getElementByXPath(specificXPath) || document.getElementById('otp-input') || document.querySelector('input[name="otp"]');

                        if (otpInput && otpInput.value !== request.code) {
                            console.log("EduTOTP: Found OTP input, filling...");
                            fillInput(otpInput, request.code);

                            // Visual feedback
                            const originalColor = otpInput.style.backgroundColor;
                            otpInput.style.backgroundColor = '#d1fae5';
                            setTimeout(() => otpInput.style.backgroundColor = originalColor, 500);

                            // Attempt submit if we found what we needed
                            const submitBtn = document.getElementById('submit-btn');
                            if (submitBtn) submitBtn.click();

                            filled = true;
                            clearInterval(interval); // Done
                        }
                    }, 250); // check every 250ms
                }

                sendResponse({ status: "success", message: "User Number injected, waiting for next step..." });
                return;
            }
        }

        // 2. Attempt to find the Password and OTP input fields (Direct Fill)
        // If we didn't start the User Number flow (or it wasn't found), try filling directly.

        if (request.password) {
            const passXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[2]/div[2]/div/input';
            const passInput = getElementByXPath(passXPath);
            if (passInput) {
                fillInput(passInput, request.password);
            }
        }

        // We look for specific ID as per requirements, or common names, OR the user specific XPath
        let input = document.getElementById('otp-input');

        if (!input) {
            // Try the user-provided specific XPath
            const specificXPath = '//*[@id="main-container"]/div/div[2]/div/div/div[1]/div[2]/form/div[4]/div[2]/div/input';
            input = getElementByXPath(specificXPath);
        }

        if (input) {
            input.value = request.code;
            // Dispatch input event so frameworks (React, Vue, etc.) detect the change
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Flash the background to indicate success
            const originalColor = input.style.backgroundColor;
            input.style.backgroundColor = '#d1fae5'; // Light green
            setTimeout(() => {
                input.style.backgroundColor = originalColor;
            }, 500);

            // Attempt to find submit button
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                console.log("EduTOTP: Clicking submit button");
                submitBtn.click();
            }

            sendResponse({ status: "success", message: "Code injected" });
        } else {
            console.warn("EduTOTP: Input field not found on this page."); // specific ID or XPath

            // Try a general fallback for the alert message
            // alert("EduTOTP: Could not find element with ID 'otp-input' or the specified XPath."); 
            // Commented out alert to be less intrusive on failure
            sendResponse({ status: "error", message: "Input not found" });
        }
    }
});
