// ==UserScript==
// @name         RADD Tee Hee!
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description
// @author       Mike! Yay!
// @match        https://www.viewpointscreening.com/VPS_RADD*
// @match        https://www.viewpointscreening.com/RADD*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Function to enable fields
    function enableFields() {
        // Select all table cells with class 'brdr1'
        const tableCells = document.querySelectorAll('td.brdr1');

        tableCells.forEach(cell => {
            // Enable text inputs
            const textInputs = cell.querySelectorAll('input[type="text"]');
            textInputs.forEach(input => {
                // Remove 'disabled' and 'readonly' attributes if they exist
                input.removeAttribute('disabled');
                input.removeAttribute('readonly');

                // Remove classes that indicate disabled state
                const vInput = input.closest('.v-input');
                if (vInput) {
                    vInput.classList.remove('v-input--is-disabled');
                }

                // Enable the label if it has a disabled class
                const label = cell.querySelector('label');
                if (label && label.classList.contains('v-label--is-disabled')) {
                    label.classList.remove('v-label--is-disabled');
                }

                // Optionally, change the input's background or styling if needed
                input.style.backgroundColor = ''; // Reset to default
            });

            // Enable checkbox inputs
            const checkboxes = cell.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                // Remove 'disabled' attribute if it exists
                checkbox.removeAttribute('disabled');

                // Remove classes that indicate disabled state
                const vInput = checkbox.closest('.v-input');
                if (vInput) {
                    vInput.classList.remove('v-input--is-disabled');
                }

                // Optionally, ensure the checkbox is clickable
                checkbox.disabled = false;
            });

            // Enable buttons (e.g., Delete Requirement)
            const buttons = cell.querySelectorAll('button');
            buttons.forEach(button => {
                // Remove 'disabled' attribute if it exists
                button.removeAttribute('disabled');

                // Remove classes that style the button as disabled or in error state
                button.classList.remove('error--text');
                button.classList.remove('disabled'); // If there's a generic disabled class

                // Optionally, adjust button styles
                button.style.pointerEvents = 'auto';
                button.style.opacity = '1';
            });
        });
    }

    // Initial run to enable fields on page load
    enableFields();

    // Set up a MutationObserver to watch for dynamic changes in the DOM
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => {
            enableFields();
        });
    });

    // Start observing the body for changes in child elements and subtree
    observer.observe(document.body, { childList: true, subtree: true });

})();
