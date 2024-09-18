// ==UserScript==
// @name         Review Queue Rejection Reasons Loader
// @namespace    http://viewpointscreening.com
// @version      1.0
// @description  Loader script that fetches and executes the main Rejection Reasons script from GitHub
// @author       
// @match        https://www.viewpointscreening.com/thereviewqueue*
// @grant        GM_xmlhttpRequest
// @connect      warklantd
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const mainScriptURL = 'https://your-username.github.io/tampermonkey-scripts/rejections.js';

    GM_xmlhttpRequest({
        method: 'GET',
        url: mainScriptURL,
        onload: function(response) {
            if (response.status === 200) {
                try {
                    const script = document.createElement('script');
                    script.textContent = response.responseText;
                    document.body.appendChild(script);
                    console.log('Main script loaded successfully.');
                } catch (e) {
                    console.error('Error injecting main script:', e);
                }
            } else {
                console.error(`Failed to fetch main script. Status: ${response.status}`);
            }
        },
        onerror: function(error) {
            console.error('Error fetching main script:', error);
        }
    });
})();
