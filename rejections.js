// ==UserScript==
// @name         Review Queue - Rejection Reasons
// @namespace    http://viewpointscreening.com
// @version      4.9
// @description  Popup Box with searchable rejection reasons, with fixes and improvements
// @author       Mike! Yay!
// @match        https://www.viewpointscreening.com/thereviewqueue*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(async function () {
    'use strict';

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8kAJf9wYSgyFSvwOj_Kj9XpuL1gLrEScup-vaj8is-SDBFvGs2CVJqiqinKtBryNWVxuy1NE1MqyD/pub?output=csv';
    const groupCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgSydK8b7RGP0g7r8D9wC1MFQ2_PvDNkOAzrcZ3YubCgOws3rmmA2EEWD-RH_XnfKvUb9YnpbMlbhD/pub?output=csv';

    let favorites = JSON.parse(localStorage.getItem('rejection_reasons_favorites') || '{}');

    function saveFavorites() {
        localStorage.setItem('rejection_reasons_favorites', JSON.stringify(favorites));
    }

    function isOptionInFavorites(option, testName) {
        const testFavorites = favorites[testName] || [];
        return testFavorites.some(favOption => favOption.organization === option.organization && favOption.reason === option.reason);
    }

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
        for (let i = 1; i < lines.length; i++) {
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
        for (let i = 1; i < lines.length; i++) {
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
        container.style.top = '15%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, 0)';
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

        const reasonSearchInput = document.createElement('input');
        reasonSearchInput.setAttribute('type', 'text');
        reasonSearchInput.setAttribute('placeholder', 'Search Rejection Reason...');
        reasonSearchInput.style.flex = '1';
        reasonSearchInput.style.marginRight = '0.5rem';
        reasonSearchInput.style.color = 'black';
        reasonSearchInput.style.padding = '0.5rem';
        reasonSearchInput.style.border = '1px solid #ccc';
        reasonSearchInput.style.borderRadius = '4px';
        reasonSearchInput.value = testName;

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
        headerContainer.appendChild(reasonSearchInput);
        headerContainer.appendChild(refreshButton);

        const messageSearchInput = document.createElement('input');
        messageSearchInput.setAttribute('type', 'text');
        messageSearchInput.setAttribute('placeholder', 'Search Rejection Message...');
        messageSearchInput.style.width = '100%';
        messageSearchInput.style.marginBottom = '0.5rem';
        messageSearchInput.style.color = 'black';
        messageSearchInput.style.padding = '0.5rem';
        messageSearchInput.style.border = '1px solid #ccc';
        messageSearchInput.style.borderRadius = '4px';
        messageSearchInput.value = '';

        container.appendChild(messageSearchInput);

        const optionsContainer = document.createElement('div');
        container.appendChild(optionsContainer);

        async function filterOptions() {
            const orgFilterText = orgSearchInput.value.trim().toLowerCase();
            const reasonFilterText = reasonSearchInput.value.trim().toLowerCase();
            const messageFilterText = messageSearchInput.value.trim().toLowerCase();
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

                const dollarMessageMatch = option.reason.match(/^\$(\d+)\s*-\s*(.+)$/);
                const isDollarMessage = dollarMessageMatch !== null;
                let dollarOrder = null;

                if (isDollarMessage) {
                    dollarOrder = parseInt(dollarMessageMatch[1], 10);
                    const message = dollarMessageMatch[2].trim();
                    reasonToDisplay = `${testName} - ${message}`;
                    reasonLower = reasonToDisplay.toLowerCase();
                }

                const indexOfDash = reasonToDisplay.indexOf(' - ');
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
                let messageMatches = false;

                if (isDollarMessage) {
                    reasonMatches = true;
                } else if (reasonFilterText === '') {
                    reasonMatches = true;
                } else {
                    reasonMatches = searchKey.includes(reasonFilterText);
                }

                if (messageFilterText === '') {
                    messageMatches = true;
                } else {
                    messageMatches = reasonToDisplay.toLowerCase().includes(messageFilterText);
                }

                let shouldDisplay = false;

                if (isDollarMessage) {
                    shouldDisplay = orgMatches && reasonMatches && messageMatches;
                } else if (orgMatches && reasonMatches && messageMatches) {
                    shouldDisplay = true;
                }

                if (shouldDisplay) {
                    filteredOptions.push({
                        option,
                        reasonToDisplay,
                        isDollarMessage,
                        dollarOrder
                    });
                }
            });

            filteredOptions.sort((a, b) => {
                if (a.isDollarMessage && b.isDollarMessage) {
                    return a.dollarOrder - b.dollarOrder;
                }
                if (a.isDollarMessage && !b.isDollarMessage) return -1;
                if (!a.isDollarMessage && b.isDollarMessage) return 1;

                const aAny = a.option.organization.toLowerCase() === 'any';
                const bAny = b.option.organization.toLowerCase() === 'any';

                if (!aAny && bAny) return -1;
                if (aAny && !bAny) return 1;

                return a.option.reason.localeCompare(b.option.reason);
            });

            const currentTestName = reasonSearchInput.value.trim();

            let testFavorites = favorites[currentTestName] || [];

            let dollarOptions = [];
            let favoriteOptions = [];
            let otherOptions = [];

            filteredOptions.forEach(({ option, reasonToDisplay, isDollarMessage, dollarOrder }) => {
                if (isDollarMessage) {
                    dollarOptions.push({ option, reasonToDisplay, isDollarMessage, dollarOrder });
                } else if (isOptionInFavorites(option, currentTestName)) {
                    favoriteOptions.push({ option, reasonToDisplay, isDollarMessage });
                } else {
                    otherOptions.push({ option, reasonToDisplay, isDollarMessage });
                }
            });

            let displayIndex = 0;

            function createOptionDiv({ option, reasonToDisplay, isDollarMessage }, isFavorite) {
                const optionDiv = document.createElement('div');
                optionDiv.style.padding = '5px';
                optionDiv.style.cursor = 'pointer';
                optionDiv.style.whiteSpace = 'pre-wrap';

                const originalBackgroundColor = displayIndex % 2 === 0 ? '#f0f0f0' : '#ffffff';
                optionDiv.style.backgroundColor = originalBackgroundColor;
                optionDiv.style.color = option.color || '#000000';
                optionDiv.style.fontWeight = 'bold';

                optionDiv.innerText = reasonToDisplay;

                optionDiv.addEventListener('click', () => {
                    let textareaValue = option.reason;
                    if (isDollarMessage) {
                        textareaValue = reasonToDisplay;
                    }
                    textarea.value = textareaValue;
                    container.remove();

                    const event = new Event('input', { bubbles: true, cancelable: true });
                    textarea.dispatchEvent(event);
                });

                optionDiv.addEventListener('mouseover', () => {
                    optionDiv.style.backgroundColor = '#000000';
                    optionDiv.style.color = '#ffffff';
                });

                optionDiv.addEventListener('mouseout', () => {
                    optionDiv.style.backgroundColor = originalBackgroundColor;
                    optionDiv.style.color = option.color || '#000000';
                });

                if (!isDollarMessage) {
                    const starIcon = document.createElement('span');
                    starIcon.innerText = isFavorite ? ' ❤️️ ' : ' ♡ ';
                    starIcon.style.marginRight = '8px';
                    starIcon.style.color = 'red';
                    starIcon.style.cursor = 'pointer';
                    starIcon.style.fontSize = '24px';

                    starIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (isFavorite) {
                            favorites[currentTestName] = favorites[currentTestName].filter(favOption => !(favOption.organization === option.organization && favOption.reason === option.reason));
                        } else {
                            if (!favorites[currentTestName]) favorites[currentTestName] = [];
                            favorites[currentTestName].push(option);
                        }
                        saveFavorites();
                        filterOptions();
                    });

                    optionDiv.prepend(starIcon);
                }

                optionsContainer.appendChild(optionDiv);
                displayIndex++;
            }

            dollarOptions.forEach(optionObj => {
                createOptionDiv(optionObj, false);
            });

            if (favoriteOptions.length > 0) {
                favoriteOptions.forEach(optionObj => {
                    createOptionDiv(optionObj, true);
                });
            }

            otherOptions.forEach(optionObj => {
                createOptionDiv(optionObj, false);
            });
        }

        orgSearchInput.addEventListener('input', filterOptions);
        reasonSearchInput.addEventListener('input', filterOptions);
        messageSearchInput.addEventListener('input', filterOptions);

        function debounce(func, delay) {
            let debounceTimer;
            return function () {
                const context = this;
                const args = arguments;
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => func.apply(context, args), delay);
            }
        }

        orgSearchInput.removeEventListener('input', filterOptions);
        reasonSearchInput.removeEventListener('input', filterOptions);
        messageSearchInput.removeEventListener('input', filterOptions);
        orgSearchInput.addEventListener('input', debounce(filterOptions, 300));
        reasonSearchInput.addEventListener('input', debounce(filterOptions, 300));
        messageSearchInput.addEventListener('input', debounce(filterOptions, 300));

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

        messageSearchInput.focus();
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
