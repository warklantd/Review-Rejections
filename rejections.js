// ==UserScript==
// @name         Review Queue - Rejection Reasons
// @namespace    http://viewpointscreening.com
// @version      1.5
// @description  Popup Box with searchable rejection reasons, centrally managed via GitHub
// @author       Mike! Yay!
// @match        https://www.viewpointscreening.com/thereviewqueue*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/warklantd/Review-Rejections/main/rejections.js
// @downloadURL  https://raw.githubusercontent.com/warklantd/Review-Rejections/main/rejections.js
// ==/UserScript==

(async function() {
    'use strict';

    const scriptUrl = 'https://raw.githubusercontent.com/warklantd/Review-Rejections/main/rejections.js';

    function loadScriptFromUrl(url) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                const scriptContent = response.responseText;
                const script = document.createElement('script');
                script.textContent = scriptContent;
                document.body.appendChild(script);
            },
            onerror: function(error) {
                console.error('Error fetching script from ' + url, error);
            }
        });
    }

    loadScriptFromUrl(scriptUrl);

})();
