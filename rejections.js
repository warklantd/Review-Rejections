// ==UserScript==
// @name         Review Queue - Rejection Reasons 4.9 / 9/20/2024
// @namespace    http://viewpointscreening.com
// @version      4.9
// @description  Popup Box with searchable rejection reasons
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
        container.style.backgroundColor = 'white';
        container.style.padding = '1rem';
        container.style.border = '1px solid black';
        container.style.zIndex = 1000;
        container.style.overflow = 'hidden';
        container.style.boxSizing = 'border-box';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';

        const savedSettings = JSON.parse(localStorage.getItem('rejection_reasons_popup_settings') || '{}');
        container.style.top = savedSettings.top || '15%';
        container.style.left = savedSettings.left || '50%';
        container.style.transform = savedSettings.top && savedSettings.left ? 'none' : 'translate(-50%, 0)';
        container.style.width = savedSettings.width || '80vw';
        container.style.height = savedSettings.height || '80vh';

        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.marginBottom = '1rem';
        headerContainer.style.cursor = 'move';
        headerContainer.style.userSelect = 'none';
        headerContainer.style.flexShrink = '0';
        headerContainer.style.width = '100%';

        const title = document.createElement('span');
        title.innerText = 'MWH';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        title.style.marginRight = 'auto';
        title.style.color = 'white';
        headerContainer.appendChild(title);

        const closeButton = document.createElement('button');
        closeButton.innerText = '✖';
        closeButton.title = 'Close';
        closeButton.style.marginLeft = 'auto';
        closeButton.style.cursor = 'pointer';
        closeButton.style.border = 'none';
        closeButton.style.background = 'none';
        closeButton.style.fontSize = '16px';
        closeButton.style.padding = '0 5px';
        closeButton.style.lineHeight = '1';

        closeButton.addEventListener('click', () => {
            container.remove();
            document.removeEventListener('mousedown', closeSearchBox);
        });

        headerContainer.appendChild(closeButton);

        const searchInputsContainer = document.createElement('div');
        searchInputsContainer.style.display = 'flex';
        searchInputsContainer.style.marginTop = '0.5rem';
        searchInputsContainer.style.flexWrap = 'wrap';
        searchInputsContainer.style.width = '100%';

        const orgSearchInput = document.createElement('input');
        orgSearchInput.setAttribute('type', 'text');
        orgSearchInput.setAttribute('placeholder', 'Search Organization...');
        orgSearchInput.style.flex = '1 1 200px';
        orgSearchInput.style.marginRight = '0.5rem';
        orgSearchInput.style.marginBottom = '0.5rem';
        orgSearchInput.style.color = 'black';
        orgSearchInput.style.padding = '0.5rem';
        orgSearchInput.style.border = '1px solid #ccc';
        orgSearchInput.style.borderRadius = '4px';
        orgSearchInput.value = organizationName;

        const reasonSearchInput = document.createElement('input');
        reasonSearchInput.setAttribute('type', 'text');
        reasonSearchInput.setAttribute('placeholder', 'Search Rejection Reason...');
        reasonSearchInput.style.flex = '1 1 200px';
        reasonSearchInput.style.marginRight = '0.5rem';
        reasonSearchInput.style.marginBottom = '0.5rem';
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
        refreshButton.style.marginBottom = '0.5rem';

        searchInputsContainer.appendChild(orgSearchInput);
        searchInputsContainer.appendChild(reasonSearchInput);
        searchInputsContainer.appendChild(refreshButton);

        headerContainer.appendChild(searchInputsContainer);
        container.appendChild(headerContainer);

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
        optionsContainer.style.flex = '1';
        optionsContainer.style.overflowY = 'auto';
        container.appendChild(optionsContainer);

        const resizeHandle = document.createElement('div');
        resizeHandle.style.width = '20px';
        resizeHandle.style.height = '20px';
        resizeHandle.style.background = 'transparent';
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.right = '0';
        resizeHandle.style.bottom = '0';
        resizeHandle.style.cursor = 'nwse-resize';
        resizeHandle.style.padding = '0';
        container.appendChild(resizeHandle);

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

            function createOptionDiv({ option, reasonToDisplay, isDollarMessage, dollarOrder }, isFavorite) {
                const optionDiv = document.createElement('div');
                optionDiv.style.padding = '5px';
                optionDiv.style.cursor = 'pointer';
                optionDiv.style.whiteSpace = 'pre-wrap';
                optionDiv.style.display = 'flex';
                optionDiv.style.alignItems = 'center';

                const originalBackgroundColor = displayIndex % 2 === 0 ? '#f9f9f9' : '#e9e9e9';
                optionDiv.style.backgroundColor = originalBackgroundColor;
                optionDiv.style.color = option.color || '#000000';
                optionDiv.style.fontWeight = 'bold';
                optionDiv.style.borderRadius = '4px';
                optionDiv.style.marginBottom = '2px';

                const reasonText = document.createElement('span');
                reasonText.innerText = reasonToDisplay;
                reasonText.style.flex = '1';

                optionDiv.appendChild(reasonText);

                optionDiv.addEventListener('click', () => {
                    let textareaValue = option.reason;
                    if (isDollarMessage) {
                        textareaValue = reasonToDisplay;
                    }
                    textarea.value = textareaValue;
                    container.remove();
                    document.removeEventListener('mousedown', closeSearchBox);

                    const event = new Event('input', { bubbles: true, cancelable: true });
                    textarea.dispatchEvent(event);
                });

                optionDiv.addEventListener('mouseover', () => {
                    optionDiv.style.backgroundColor = '#007BFF';
                    optionDiv.style.color = '#ffffff';
                });

                optionDiv.addEventListener('mouseout', () => {
                    optionDiv.style.backgroundColor = originalBackgroundColor;
                    optionDiv.style.color = option.color || '#000000';
                });

                if (!isDollarMessage) {
                    const starIcon = document.createElement('span');
                    starIcon.innerText = isFavorite ? '❤️' : '♡';
                    starIcon.style.marginRight = '8px';
                    starIcon.style.color = 'red';
                    starIcon.style.cursor = 'pointer';
                    starIcon.style.fontSize = '20px';
                    starIcon.style.flexShrink = '0';

                    starIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (isFavorite) {
                            starIcon.innerText = '💔';
                            setTimeout(() => {
                                favorites[currentTestName] = favorites[currentTestName].filter(favOption => !(favOption.organization === option.organization && favOption.reason === option.reason));
                                saveFavorites();
                                filterOptions();
                            }, 2000);
                        } else {
                            if (!favorites[currentTestName]) favorites[currentTestName] = [];
                            favorites[currentTestName].push(option);
                            saveFavorites();
                            filterOptions();
                        }
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
                const favoriteHeader = document.createElement('div');
                favoriteHeader.innerText = 'Favorites';
                favoriteHeader.style.fontWeight = 'bold';
                favoriteHeader.style.marginTop = '10px';
                favoriteHeader.style.marginBottom = '5px';
                optionsContainer.appendChild(favoriteHeader);

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

        makeDraggable(container, headerContainer);

        makeResizable(container, resizeHandle);

        function savePopupSettings() {
            const rect = container.getBoundingClientRect();
            const settings = {
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`
            };
            localStorage.setItem('rejection_reasons_popup_settings', JSON.stringify(settings));
        }

        let isDragging = false;
        let isResizing = false;

        function makeDraggable(element, handle) {
            handle.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                isDragging = true;
                const rect = element.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;

                function onMouseMove(eMove) {
                    if (!isDragging) return;
                    let newLeft = eMove.clientX - offsetX;
                    let newTop = eMove.clientY - offsetY;

                    const vpWidth = window.innerWidth;
                    const vpHeight = window.innerHeight;
                    const elemWidth = rect.width;
                    const elemHeight = rect.height;

                    newLeft = Math.max(0, Math.min(newLeft, vpWidth - elemWidth));
                    newTop = Math.max(0, Math.min(newTop, vpHeight - elemHeight));

                    element.style.left = `${newLeft}px`;
                    element.style.top = `${newTop}px`;
                    element.style.transform = 'none';
                }

                function onMouseUp() {
                    if (isDragging) {
                        isDragging = false;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        savePopupSettings();
                    }
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            handle.addEventListener('touchstart', (e) => {
                isDragging = true;
                const touch = e.touches[0];
                const rect = element.getBoundingClientRect();
                const offsetX = touch.clientX - rect.left;
                const offsetY = touch.clientY - rect.top;

                function onTouchMove(eMove) {
                    if (!isDragging) return;
                    const touchMove = eMove.touches[0];
                    let newLeft = touchMove.clientX - offsetX;
                    let newTop = touchMove.clientY - offsetY;

                    const vpWidth = window.innerWidth;
                    const vpHeight = window.innerHeight;
                    const elemWidth = rect.width;
                    const elemHeight = rect.height;

                    newLeft = Math.max(0, Math.min(newLeft, vpWidth - elemWidth));
                    newTop = Math.max(0, Math.min(newTop, vpHeight - elemHeight));

                    element.style.left = `${newLeft}px`;
                    element.style.top = `${newTop}px`;
                    element.style.transform = 'none';
                }

                function onTouchEnd() {
                    if (isDragging) {
                        isDragging = false;
                        document.removeEventListener('touchmove', onTouchMove);
                        document.removeEventListener('touchend', onTouchEnd);
                        savePopupSettings();
                    }
                }

                document.addEventListener('touchmove', onTouchMove);
                document.addEventListener('touchend', onTouchEnd);
            });
        }

        function makeResizable(element, handle) {
            handle.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                isResizing = true;
                const rect = element.getBoundingClientRect();
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = rect.width;
                const startHeight = rect.height;

                function onMouseMove(eMove) {
                    if (!isResizing) return;
                    let newWidth = startWidth + (eMove.clientX - startX);
                    let newHeight = startHeight + (eMove.clientY - startY);

                    newWidth = Math.max(300, newWidth);
                    newHeight = Math.max(200, newHeight);
                    newWidth = Math.min(window.innerWidth - rect.left - 20, newWidth);
                    newHeight = Math.min(window.innerHeight - rect.top - 20, newHeight);

                    element.style.width = `${newWidth}px`;
                    element.style.height = `${newHeight}px`;
                }

                function onMouseUp() {
                    if (isResizing) {
                        isResizing = false;
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        savePopupSettings();
                    }
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });


            handle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                isResizing = true;
                const touch = e.touches[0];
                const rect = element.getBoundingClientRect();
                const startX = touch.clientX;
                const startY = touch.clientY;
                const startWidth = rect.width;
                const startHeight = rect.height;

                function onTouchMove(eMove) {
                    if (!isResizing) return;
                    const touchMove = eMove.touches[0];
                    let newWidth = startWidth + (touchMove.clientX - startX);
                    let newHeight = startHeight + (touchMove.clientY - startY);


                    newWidth = Math.max(300, newWidth);
                    newHeight = Math.max(200, newHeight);
                    newWidth = Math.min(window.innerWidth - rect.left - 20, newWidth);
                    newHeight = Math.min(window.innerHeight - rect.top - 20, newHeight);

                    element.style.width = `${newWidth}px`;
                    element.style.height = `${newHeight}px`;
                }

                function onTouchEnd() {
                    if (isResizing) {
                        isResizing = false;
                        document.removeEventListener('touchmove', onTouchMove);
                        document.removeEventListener('touchend', onTouchEnd);
                        savePopupSettings();
                    }
                }

                document.addEventListener('touchmove', onTouchMove);
                document.addEventListener('touchend', onTouchEnd);
            });
        }


        function closeSearchBox(event) {
            if (!container.contains(event.target) && event.target !== container) {
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
