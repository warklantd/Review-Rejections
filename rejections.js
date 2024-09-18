// ==UserScript==
// @name         Review Queue - Rejection Reasons
// @namespace    http://viewpointscreening.com
// @version      4.6
// @description  Popup Box with searchable rejection reasons, with fixes and improvements
// @author       Mike! Yay!
// @match        https://www.viewpointscreening.com/thereviewqueue*
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/warklantd/Review-Rejections/main/rejections.js
// @downloadURL  https://raw.githubusercontent.com/warklantd/Review-Rejections/main/rejections.js
// ==/UserScript==

(async function () {
    'use strict';

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8kAJf9wYSgyFSvwOj_Kj9XpuL1gLrEScup-vaj8is-SDBFvGs2CVJqiqinKtBryNWVxuy1NE1MqyD/pub?output=csv';
    const groupCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgSydK8b7RGP0g7r8D9wC1MFQ2_PvDNkOAzrcZ3YubCgOws3rmmA2EEWD-RH_XnfKvUb9YnpbMlbhD/pub?output=csv';

    async function fetchCsvData(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url + '&t=' + new Date().getTime(),
                onload: function (response) {
                    resolve(response.responseText);
                },
                onerror: function (error) {
                    reject(error);
                }
            });
        });
    }

    function parseCsvData(csvData) {
        const lines = csvData.split('\n');
        const options = [];
        for (let i = 1; i < lines.length; i++) { // Start from 1 to skip header
            const cells = [];
            let currentCell = '';
            let isInsideQuote = false;
            const line = lines[i];

            for (let j = 0; j < line.length; j++) {
                const currentChar = line[j];

                if (currentChar === '"') {
                    if (isInsideQuote && j + 1 < line.length && line[j + 1] === '"') {
                        currentCell += '"';
                        j++;
                    } else {
                        isInsideQuote = !isInsideQuote;
                    }
                } else if (currentChar === ',' && !isInsideQuote) {
                    cells.push(currentCell);
                    currentCell = '';
                } else {
                    currentCell += currentChar;
                }
            }

            cells.push(currentCell);

            if (cells.length >= 3) {
                options.push({
                    organization: cells[0].trim(),
                    reason: cells[1].trim(),
                    color: cells[2].trim()
                });
            } else if (cells.length >= 2) {
                options.push({
                    organization: cells[0].trim(),
                    reason: cells[1].trim(),
                    color: '#000000'
                });
            }
        }
        return options;
    }

    async function fetchGroupCsvData(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url + '&t=' + new Date().getTime(),
                onload: function (response) {
                    resolve(response.responseText);
                },
                onerror: function (error) {
                    reject(error);
                }
            });
        });
    }

    function parseGroupCsvData(csvData) {
        const lines = csvData.split('\n');
        const organizationToGroup = {};
        for (let i = 1; i < lines.length; i++) { // Start from 1 to skip header
            const [organization, group] = lines[i].split(',').map(cell => cell.trim());
            if (organization && group) {
                organizationToGroup[organization.toLowerCase()] = group.toLowerCase();
            }
        }
        return organizationToGroup;
    }

    let options = [];
    let organizationToGroup = {};
    let groupDefinitions = {};

    async function reloadData() {
        try {
            const [csvData, groupCsvData] = await Promise.all([
                fetchCsvData(csvUrl),
                fetchGroupCsvData(groupCsvUrl)
            ]);

            options = parseCsvData(csvData);
            organizationToGroup = parseGroupCsvData(groupCsvData);

            groupDefinitions = {};
            for (const [org, group] of Object.entries(organizationToGroup)) {
                if (!groupDefinitions[group]) {
                    groupDefinitions[group] = [];
                }
                groupDefinitions[group].push(org);
            }
        } catch (error) {
            alert('Error fetching data. Please try again later.');
        }
    }

    await reloadData();

    function createSearchableList(textarea, testName = '', organizationName = '') {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '15%'; // Adjusted position
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, 0)'; // Removed vertical translation
        container.style.backgroundColor = 'white';
        container.style.padding = '1rem';
        container.style.border = '1px solid black';
        container.style.zIndex = 1000;
        container.style.overflowY = 'auto';
        container.style.maxHeight = '80vh';
        container.style.width = '80vw';
        container.style.maxWidth = '1200px';
        container.style.boxSizing = 'border-box';

        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.marginBottom = '1rem';
        container.appendChild(headerContainer);

        const orgSearchInput = document.createElement('input');
        orgSearchInput.setAttribute('type', 'text');
        orgSearchInput.setAttribute('placeholder', 'Search Organization...');
        orgSearchInput.style.flex = '1';
        orgSearchInput.style.marginRight = '0.5rem';
        orgSearchInput.style.color = 'black';
        orgSearchInput.style.padding = '0.5rem';
        orgSearchInput.style.border = '1px solid #ccc';
        orgSearchInput.style.borderRadius = '4px';
        orgSearchInput.value = organizationName;

        const searchInput = document.createElement('input');
        searchInput.setAttribute('type', 'text');
        searchInput.setAttribute('placeholder', 'Search Rejection Reason...');
        searchInput.style.flex = '1';
        searchInput.style.marginRight = '0.5rem';
        searchInput.style.color = 'black';
        searchInput.style.padding = '0.5rem';
        searchInput.style.border = '1px solid #ccc';
        searchInput.style.borderRadius = '4px';
        searchInput.value = testName;

        const refreshButton = document.createElement('button');
        refreshButton.innerText = '🔄';
        refreshButton.title = 'Refresh Data';
        refreshButton.style.flex = '0 0 auto';
        refreshButton.style.fontSize = '24px';
        refreshButton.style.cursor = 'pointer';
        refreshButton.style.border = 'none';
        refreshButton.style.background = 'none';
        refreshButton.style.padding = '0';

        headerContainer.appendChild(orgSearchInput);
        headerContainer.appendChild(searchInput);
        headerContainer.appendChild(refreshButton);

        // Removed the default search buttons section

        const optionsContainer = document.createElement('div');
        container.appendChild(optionsContainer);

        async function filterOptions() {
            const orgFilterText = orgSearchInput.value.trim().toLowerCase();
            const searchInputText = searchInput.value.trim().toLowerCase();
            optionsContainer.innerHTML = '';

            let acceptableOrganizations = new Set();

            if (orgFilterText === '') {
                acceptableOrganizations.add('any');
            } else {
                if (organizationToGroup.hasOwnProperty(orgFilterText)) {
                    const groupName = organizationToGroup[orgFilterText];
                    const groupOrgs = groupDefinitions[groupName];
                    groupOrgs.forEach(orgName => acceptableOrganizations.add(orgName.toLowerCase()));
                    acceptableOrganizations.add(groupName.toLowerCase());
                } else if (groupDefinitions.hasOwnProperty(orgFilterText)) {
                    const groupOrgs = groupDefinitions[orgFilterText];
                    groupOrgs.forEach(orgName => acceptableOrganizations.add(orgName.toLowerCase()));
                    acceptableOrganizations.add(orgFilterText.toLowerCase());
                } else {
                    acceptableOrganizations.add(orgFilterText);
                }
            }

            let filteredOptions = [];

            options.forEach((option) => {
                const organizationLower = option.organization.toLowerCase();
                let reasonToDisplay = option.reason;
                let reasonLower = option.reason.toLowerCase();

                // Detect dollar messages with numerical identifiers (e.g., $1 - ...)
                const dollarMessageMatch = option.reason.match(/^\$(\d+)\s*-\s*(.+)$/);
                const isDollarMessage = dollarMessageMatch !== null;
                let dollarOrder = null;

                if (isDollarMessage) {
                    dollarOrder = parseInt(dollarMessageMatch[1], 10); // Extract the number after $
                    const message = dollarMessageMatch[2].trim();
                    // Replace '$<number> -' with 'testName -' excluding the number
                    // Example: '$1 - Please...' becomes 'TestName - Please...'
                    reasonToDisplay = `${testName} - ${message}`;
                    reasonLower = reasonToDisplay.toLowerCase();
                }

                let indexOfDash = reasonToDisplay.indexOf('-');
                let searchKey = '';
                if (indexOfDash !== -1) {
                    searchKey = reasonToDisplay.substring(0, indexOfDash).trim().toLowerCase();
                } else {
                    searchKey = reasonToDisplay.trim().toLowerCase();
                }

                const isAnyOrganization = organizationLower === 'any';

                let orgMatches = isAnyOrganization;

                if (!orgMatches) {
                    orgMatches = acceptableOrganizations.has(organizationLower);
                }

                let reasonMatches = false;

                if (isDollarMessage) {
                    reasonMatches = true;
                } else if (searchInputText === '') {
                    reasonMatches = true;
                } else {
                    reasonMatches = searchKey === searchInputText;
                }

                let shouldDisplay = false;

                if (isDollarMessage) {
                    shouldDisplay = true;
                } else if (orgMatches && reasonMatches) {
                    shouldDisplay = true;
                }

                if (shouldDisplay) {
                    filteredOptions.push({
                        option,
                        reasonToDisplay,
                        isDollarMessage,
                        dollarOrder // Include the dollar order for sorting
                    });
                }
            });

            // Sort filteredOptions by priority:
            // 1. Dollar messages (lower number first)
            // 2. Org/Group-specific
            // 3. Any
            // Then, within each category, sort alphabetically
            filteredOptions.sort((a, b) => {
                // Priority 1: Dollar messages
                if (a.isDollarMessage && b.isDollarMessage) {
                    return a.dollarOrder - b.dollarOrder; // Lower numbers first
                }
                if (a.isDollarMessage && !b.isDollarMessage) return -1;
                if (!a.isDollarMessage && b.isDollarMessage) return 1;

                // Priority 2: Org/Group-specific
                const aAny = a.option.organization.toLowerCase() === 'any';
                const bAny = b.option.organization.toLowerCase() === 'any';

                if (!aAny && bAny) return -1;
                if (aAny && !bAny) return 1;

                // Priority 3: Alphabetical order
                return a.option.reason.localeCompare(b.option.reason);
            });

            let displayIndex = 0;
            filteredOptions.forEach(({ option, reasonToDisplay, isDollarMessage }) => {
                const optionDiv = document.createElement('div');
                optionDiv.style.padding = '5px';
                optionDiv.style.cursor = 'pointer';
                optionDiv.style.whiteSpace = 'pre-wrap';

                const originalBackgroundColor = displayIndex % 2 === 0 ? '#f0f0f0' : '#ffffff';
                optionDiv.style.backgroundColor = originalBackgroundColor;
                optionDiv.style.color = option.color || '#000000';
                optionDiv.style.fontWeight = 'bold'; // Make text bold

                optionDiv.innerText = reasonToDisplay;

                optionDiv.addEventListener('click', () => {
                    let textareaValue = option.reason;
                    if (isDollarMessage) {
                        // Replace '$<number> -' with 'testName -' excluding the number
                        textareaValue = reasonToDisplay;
                    }
                    textarea.value = textareaValue;
                    container.remove();

                    const event = new Event('input', { bubbles: true, cancelable: true });
                    textarea.dispatchEvent(event);
                });

                // Hover effects
                optionDiv.addEventListener('mouseover', () => {
                    optionDiv.style.backgroundColor = '#000000';
                    optionDiv.style.color = '#ffffff';
                });

                optionDiv.addEventListener('mouseout', () => {
                    optionDiv.style.backgroundColor = originalBackgroundColor;
                    optionDiv.style.color = option.color || '#000000';
                });

                optionsContainer.appendChild(optionDiv);
                displayIndex++;
            });
        }

        orgSearchInput.addEventListener('input', filterOptions);
        searchInput.addEventListener('input', filterOptions);

        refreshButton.addEventListener('click', async () => {
            refreshButton.disabled = true;
            refreshButton.innerText = '⏳';
            await reloadData();
            await filterOptions();
            refreshButton.disabled = false;
            refreshButton.innerText = '🔄';
        });

        filterOptions();

        document.body.appendChild(container);

        function closeSearchBox(event) {
            if (event.target !== container && !container.contains(event.target)) {
                container.remove();
                document.removeEventListener('mousedown', closeSearchBox);
            }
        }

        document.addEventListener('mousedown', closeSearchBox);

        searchInput.focus();
    }

    function resizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(textarea.scrollHeight, 80) + 'px';
    }

    document.addEventListener('input', (event) => {
        if (event.target.tagName.toLowerCase() === 'textarea' &&
            event.target.classList.contains('form-control') &&
            (event.target.placeholder === 'Message for Student')) {
            resizeTextarea(event.target);
        }
    }, true);

    document.addEventListener('dblclick', (event) => {
        if (event.target.tagName.toLowerCase() === 'textarea' &&
            event.target.classList.contains('form-control') &&
            (event.target.placeholder === 'Message for Student')) {

            event.preventDefault();

            let currentRow = event.target.closest('tr');
            if (!currentRow) return;

            let mainRow = currentRow.previousElementSibling;
            if (!mainRow) return;

            let testNameCell = mainRow.cells[2];
            if (!testNameCell) return;

            let testNameElement = testNameCell.querySelector('vp');
            let testName = testNameElement ? testNameElement.innerText.trim() : '';

            let organizationCell = mainRow.cells[4];
            if (!organizationCell) return;

            let organizationElement = organizationCell.querySelector('em') || organizationCell.querySelector('vp');
            let organizationName = organizationElement ? organizationElement.innerText.trim() : '';

            createSearchableList(event.target, testName, organizationName);

            event.target.addEventListener('input', () => {
                resizeTextarea(event.target);
            });
        }
    }, true);

    window.addEventListener('load', (event) => {
        const textarea = document.querySelector('textarea.form-control[placeholder="Message for Student"]');
        if (textarea) {
            textarea.style.height = '80px';
            resizeTextarea(textarea);
        }
    });
})();
