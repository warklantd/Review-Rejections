// ==UserScript==
// @name         Review Queue - Dropdown Options (Titer/Test)
// @namespace    http://viewpointscreening.com
// @version      3.1
// @description  Popout box with searchable dropdown options.
// @author       Mike! Yay!
// @match        https://www.viewpointscreening.com/thereviewqueue*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(async function () {
    'use strict';

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQdETIUWg9uXJp5By2xp_I8qLze1SmoF5AjZHMmZ7Uvn6HX_PvB5dynzoqgZsj0dDX-w7iOIWQxSLpu/pub?output=csv';

    async function fetchCsvData(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
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
        const options = [];
        const lines = csvData.split('\n');
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells = parseCsvLine(line);

            if (cells.length >= 2) {
                options.push({
                    text: cells[0].trim(),
                    tests: [cells[1].trim()]
                });
            }
        }
        return options;
    }

    function parseCsvLine(line) {
        const result = [];
        let inQuotes = false;
        let field = '';
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                result.push(field);
                field = '';
            } else {
                field += c;
            }
        }
        result.push(field);
        return result;
    }

    function normalizeTestName(name) {
        return name.toLowerCase().replace(/[\s,().&-]/g, '');
    }

    const csvData = await fetchCsvData(csvUrl);
    const options = parseCsvData(csvData);

    function removeDuplicates(options) {
        const seen = new Set();
        return options.filter(option => {
            const key = option.text;
            if (seen.has(key)) {
                return false;
            } else {
                seen.add(key);
                return true;
            }
        });
    }

    function createPopoutBox(input, testName) {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.backgroundColor = 'white';
        container.style.padding = '1rem';
        container.style.border = '1px solid black';
        container.style.zIndex = 1000;
        container.style.overflowY = 'scroll';
        container.style.maxHeight = '70vh';
        container.style.width = '300px';
        container.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        container.style.borderRadius = '8px';

        const topContainer = document.createElement('div');
        topContainer.style.display = 'flex';
        topContainer.style.marginBottom = '1rem';

        const searchInput = document.createElement('input');
        searchInput.setAttribute('type', 'text');
        searchInput.setAttribute('placeholder', 'Search...');
        searchInput.style.flex = '1';
        searchInput.style.marginRight = '5px';
        searchInput.style.padding = '5px';
        searchInput.style.border = '1px solid #ccc';
        searchInput.style.borderRadius = '4px';

        const allButton = document.createElement('button');
        allButton.textContent = 'All';
        allButton.style.padding = '5px 10px';
        allButton.style.fontSize = '12px';
        allButton.style.cursor = 'pointer';
        allButton.style.borderRadius = '4px';
        allButton.style.backgroundColor = '#000000';
        allButton.style.color = 'white';
        allButton.style.border = 'none';

        topContainer.appendChild(searchInput);
        topContainer.appendChild(allButton);
        container.appendChild(topContainer);

        const optionsContainer = document.createElement('div');
        container.appendChild(optionsContainer);

        let filteredOptions;
        const normalizedTestName = normalizeTestName(testName);

        filteredOptions = options.filter(option => {
            return option.tests.some(test => normalizeTestName(test) === normalizedTestName);
        });

        filteredOptions = removeDuplicates(filteredOptions);

        // Sort the filteredOptions alphabetically
        filteredOptions.sort((a, b) => a.text.localeCompare(b.text));

        let currentSelectedIndex = -1;
        let displayedOptionDivs = [];

        function updateOptionHighlight() {
            displayedOptionDivs.forEach((div, index) => {
                if (index === currentSelectedIndex) {
                    div.style.backgroundColor = '#000000';
                    div.style.color = '#ffffff';
                    div.scrollIntoView({ block: 'nearest' });
                } else {
                    div.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
                    div.style.color = 'black';
                }
            });
        }

        function filterOptions() {
            const filterWords = searchInput.value.toLowerCase().split(' ').filter(word => word.trim() !== '');
            optionsContainer.innerHTML = '';
            currentSelectedIndex = -1;
            displayedOptionDivs = [];

            filteredOptions.forEach((option, index) => {
                const optionTextLower = option.text.toLowerCase();
                const containsAllWords = filterWords.every(word => optionTextLower.includes(word));
                if (containsAllWords) {
                    const optionDiv = document.createElement('div');
                    optionDiv.style.padding = '5px';
                    optionDiv.style.cursor = 'pointer';
                    optionDiv.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
                    optionDiv.style.whiteSpace = 'pre-wrap';
                    optionDiv.style.color = 'black';
                    optionDiv.style.borderBottom = '1px solid #eee';

                    optionDiv.innerText = option.text;

                    optionDiv.addEventListener('click', () => {
                        input.value = option.text;
                        container.remove();

                        const event = new Event('input', { bubbles: true, cancelable: true });
                        input.dispatchEvent(event);

                        input.focus();
                    });

                    optionDiv.addEventListener('mouseover', () => {
                        currentSelectedIndex = displayedOptionDivs.indexOf(optionDiv);
                        updateOptionHighlight();
                    });

                    optionDiv.addEventListener('mouseout', () => {
                        currentSelectedIndex = -1;
                        updateOptionHighlight();
                    });

                    optionsContainer.appendChild(optionDiv);
                    displayedOptionDivs.push(optionDiv);
                }
            });
        }

        searchInput.addEventListener('input', filterOptions);

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentSelectedIndex < displayedOptionDivs.length - 1) {
                    currentSelectedIndex++;
                    updateOptionHighlight();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentSelectedIndex > 0) {
                    currentSelectedIndex--;
                    updateOptionHighlight();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentSelectedIndex >= 0 && currentSelectedIndex < displayedOptionDivs.length) {
                    displayedOptionDivs[currentSelectedIndex].click();
                }
            }
        });

        allButton.addEventListener('click', () => {
            filteredOptions = removeDuplicates(options);

            // Sort the filteredOptions alphabetically
            filteredOptions.sort((a, b) => a.text.localeCompare(b.text));

            searchInput.value = '';
            filterOptions();
        });

        filterOptions();

        document.body.appendChild(container);

        function closePopoutBox(event) {
            if (event.target !== container && !container.contains(event.target)) {
                container.remove();
                document.removeEventListener('mousedown', closePopoutBox);

                input.focus();
            }
        }

        document.addEventListener('mousedown', closePopoutBox);

        searchInput.focus();
    }

    document.addEventListener('dblclick', (event) => {
        if (event.target.tagName.toLowerCase() === 'input' &&
            event.target.classList.contains('form-control') &&
            (event.target.placeholder === 'Message' || event.target.placeholder === 'Manufacturer')) {

            event.preventDefault();

            let currentRow = event.target.closest('tr');
            if (!currentRow) return;

            let mainRow = currentRow.previousElementSibling;
            if (!mainRow) return;

            let testNameCell = mainRow.cells[2];
            if (!testNameCell) return;

            let testNameElement = testNameCell.querySelector('vp');
            let testName = testNameElement ? testNameElement.innerText : '';

            if (!testName) {
                alert('Test name not found.');
                return;
            }

            createPopoutBox(event.target, testName);
        }
    }, true);
})();
