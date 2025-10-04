// Game state
let gameState = {
    playerCount: 5,
    imposterCount: 1,
    imposterKnowledge: 'nothing',
    players: [],
    roles: [],
    originalPlayers: [],
    originalRoles: [],
    currentRound: 1,
    currentPlayerIndex: 0,
    gameWord: 'APPEL',
    votes: {},
    gameEnded: false,
    winner: null
};

// Words database
let wordsDatabase = null;

// Error handling utilities
const ErrorHandler = {
    showError: (message, element = null) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        if (element) {
            element.insertBefore(errorDiv, element.firstChild);
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        } else {
            document.body.appendChild(errorDiv);
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.parentNode.removeChild(errorDiv);
                }
            }, 5000);
        }
    },
    
    showSuccess: (message, element = null) => {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        if (element) {
            element.insertBefore(successDiv, element.firstChild);
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 3000);
        } else {
            document.body.appendChild(successDiv);
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.parentNode.removeChild(successDiv);
                }
            }, 3000);
        }
    },
    
    validateGameState: () => {
        try {
            if (!gameState || typeof gameState !== 'object') {
                throw new Error('Invalid game state');
            }
            
            if (gameState.playerCount < 3 || gameState.playerCount > 20) {
                throw new Error('Invalid player count');
            }
            
            if (gameState.imposterCount < 1 || gameState.imposterCount > Math.floor(gameState.playerCount / 2)) {
                throw new Error('Invalid imposter count');
            }
            
            if (!gameState.players || !Array.isArray(gameState.players)) {
                throw new Error('Invalid players array');
            }
            
            if (!gameState.roles || !Array.isArray(gameState.roles)) {
                throw new Error('Invalid roles array');
            }
            
            return true;
        } catch (error) {
            console.error('Game state validation failed:', error);
            ErrorHandler.showError('Game state error. Please restart the game.');
            return false;
        }
    },
    
    safeLocalStorage: {
        get: (key) => {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return null;
            }
        },
        
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Error writing to localStorage:', error);
                ErrorHandler.showError('Failed to save game data');
                return false;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Error removing from localStorage:', error);
                return false;
            }
        }
    }
};

// Global utility functions for better UX
window.toggleHelp = function() {
    const helpContent = document.getElementById('help-content');
    if (helpContent) {
        helpContent.classList.toggle('hidden');
    }
};

window.goBack = function() {
    if (confirm('Weet je zeker dat je terug wilt gaan? Je verliest je huidige instellingen.')) {
        window.history.back();
    }
};

// Auto-save functionality
const AutoSave = {
    indicator: null,
    
    init: function() {
        this.indicator = document.createElement('div');
        this.indicator.className = 'auto-save-indicator';
        this.indicator.textContent = 'Opgeslagen';
        document.body.appendChild(this.indicator);
    },
    
    show: function() {
        if (this.indicator) {
            this.indicator.classList.add('show');
            setTimeout(() => {
                this.indicator.classList.remove('show');
            }, 2000);
        }
    },
    
    save: function() {
        ErrorHandler.safeLocalStorage.set('gameState', gameState);
        this.show();
    }
};

// Keyboard shortcuts
const KeyboardShortcuts = {
    shortcuts: {},
    
    init: function() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;
            
            if (this.shortcuts[`${ctrl ? 'ctrl+' : ''}${key}`]) {
                e.preventDefault();
                this.shortcuts[`${ctrl ? 'ctrl+' : ''}${key}`]();
            }
        });
        
        this.setupShortcuts();
    },
    
    setupShortcuts: function() {
        this.shortcuts['h'] = () => toggleHelp();
        this.shortcuts['escape'] = () => this.closeModals();
        this.shortcuts['ctrl+s'] = () => AutoSave.save();
        this.shortcuts['ctrl+enter'] = () => this.submitForm();
    },
    
    closeModals: function() {
        const modals = document.querySelectorAll('.modal, .confirmation-dialog');
        modals.forEach(modal => {
            if (!modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });
    },
    
    submitForm: function() {
        const submitButtons = document.querySelectorAll('.start-button:not(:disabled)');
        if (submitButtons.length > 0) {
            submitButtons[0].click();
        }
    }
};

// Confirmation dialog system
const ConfirmationDialog = {
    show: function(message, onConfirm, onCancel = null) {
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.innerHTML = `
            <div class="confirmation-content">
                <h3>Bevestiging</h3>
                <p>${message}</p>
                <div class="confirmation-buttons">
                    <button class="confirm-button" onclick="ConfirmationDialog.confirm()">Ja</button>
                    <button class="cancel-button" onclick="ConfirmationDialog.cancel()">Nee</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        this.dialog = dialog;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    },
    
    confirm: function() {
        if (this.onConfirm) {
            this.onConfirm();
        }
        this.close();
    },
    
    cancel: function() {
        if (this.onCancel) {
            this.onCancel();
        }
        this.close();
    },
    
    close: function() {
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
            this.onConfirm = null;
            this.onCancel = null;
        }
    }
};

// Enhanced input validation
const InputValidator = {
    validate: function(input, rules) {
        const value = input.value.trim();
        let isValid = true;
        let message = '';
        
        for (const rule of rules) {
            if (!rule.test(value)) {
                isValid = false;
                message = rule.message;
                break;
            }
        }
        
        this.showValidation(input, isValid, message);
        return isValid;
    },
    
    showValidation: function(input, isValid, message) {
        input.classList.remove('input-error', 'input-success');
        
        if (isValid) {
            input.classList.add('input-success');
        } else {
            input.classList.add('input-error');
            if (message) {
                ErrorHandler.showError(message, input.parentNode);
            }
        }
    },
    
    rules: {
        required: {
            test: (value) => value.length > 0,
            message: 'Dit veld is verplicht'
        },
        minLength: (min) => ({
            test: (value) => value.length >= min,
            message: `Minimaal ${min} karakters`
        }),
        maxLength: (max) => ({
            test: (value) => value.length <= max,
            message: `Maximaal ${max} karakters`
        }),
        range: (min, max) => ({
            test: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= min && num <= max;
            },
            message: `Waarde moet tussen ${min} en ${max} zijn`
        })
    }
};

// Test file existence
async function testFileExistence() {
    const requiredFiles = [
        'player-names.html',
        'loading.html',
        'role-reveal.html',
        'game-rounds.html',
        'voting.html',
        'vote-result.html',
        'game-result.html',
        'woorden.json'
    ];
    
    console.log('Testing file existence...');
    
    for (const file of requiredFiles) {
        try {
            const response = await fetch(file, { method: 'HEAD' });
            console.log(`${file}: ${response.ok ? '✅ EXISTS' : '❌ NOT FOUND'} (${response.status})`);
        } catch (error) {
            console.log(`${file}: ❌ ERROR - ${error.message}`);
        }
    }
}

// Load words database
async function loadWordsDatabase() {
    try {
        const response = await fetch('woorden.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        wordsDatabase = await response.json();
        
        // Validate words database structure
        if (!wordsDatabase || typeof wordsDatabase !== 'object') {
            throw new Error('Invalid words database structure');
        }
        
        if (!wordsDatabase.niets || !Array.isArray(wordsDatabase.niets)) {
            wordsDatabase.niets = [];
        }
        
        if (!wordsDatabase.heel_klein_beetje || !Array.isArray(wordsDatabase.heel_klein_beetje)) {
            wordsDatabase.heel_klein_beetje = ['APPEL', 'BOEK', 'HUIS', 'AUTO', 'BED'];
        }
        
        if (!wordsDatabase.een_beetje || !Array.isArray(wordsDatabase.een_beetje)) {
            wordsDatabase.een_beetje = ['APPEL', 'BOEK', 'HUIS', 'AUTO', 'BED'];
        }
        
    } catch (error) {
        console.error('Error loading words database:', error);
        ErrorHandler.showError('Failed to load words database. Using fallback words.');
        
        // Fallback to default words
        wordsDatabase = {
            niets: [],
            heel_klein_beetje: ['APPEL', 'BOEK', 'HUIS', 'AUTO', 'BED', 'DEUR', 'TAS', 'STOEL', 'TAFEL', 'FIETS'],
            een_beetje: ['APPEL', 'BOEK', 'HUIS', 'AUTO', 'BED', 'DEUR', 'TAS', 'STOEL', 'TAFEL', 'FIETS', 'HOND', 'KAT', 'BLOEM', 'BOOM', 'WATER', 'MELK', 'BROOD', 'KAAS', 'VLEES', 'VIS']
        };
    }
}

// Get random word based on imposter knowledge level
function getRandomWord(knowledgeLevel) {
    if (!wordsDatabase) {
        return 'APPEL'; // Fallback
    }
    
    let wordList = [];
    switch(knowledgeLevel) {
        case 'nothing':
            wordList = wordsDatabase.niets;
            break;
        case 'little':
            wordList = wordsDatabase.heel_klein_beetje;
            break;
        case 'some':
            wordList = wordsDatabase.een_beetje;
            break;
    }
    
    if (wordList.length === 0) {
        // If no words available for this level, use fallback words
        wordList = ['APPEL', 'BOEK', 'HUIS', 'AUTO', 'BED'];
    }
    
    return wordList[Math.floor(Math.random() * wordList.length)];
}

// Initialize the game based on current page
function initializeGame() {
    console.log('🚀 initializeGame called');
    console.log('Current URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    
    try {
        console.log('✅ Starting initialization...');
        
        // Show loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="spinner"></div>
            <p style="color: var(--text-primary); font-family: 'Rajdhani', sans-serif; font-size: 1.2rem; margin-top: 20px;">Loading...</p>
        `;
        document.body.appendChild(loadingOverlay);
        console.log('✅ Loading overlay created');
        
        // Load words database
        console.log('📚 Loading words database...');
        loadWordsDatabase().then(() => {
            console.log('✅ Words database loaded');
            continueInitialization();
        }).catch(error => {
            console.error('❌ Failed to load words database:', error);
            continueInitialization();
        });
        
    } catch (error) {
        console.error('💥 Error in initializeGame:', error);
        ErrorHandler.showError('Critical error occurred. Please refresh the page.');
    }
}

async function continueInitialization() {
    try {
        // Load game state if available
        console.log('💾 Loading game state...');
        const savedState = ErrorHandler.safeLocalStorage.get('gameState');
        if (savedState) {
            gameState = { ...gameState, ...savedState };
            console.log('✅ Game state loaded:', gameState);
        } else {
            console.log('ℹ️ No saved game state found');
        }
        
        // Validate game state
        console.log('🔍 Validating game state...');
        if (!ErrorHandler.validateGameState()) {
            console.log('⚠️ Invalid game state detected, resetting...');
            ErrorHandler.showError('Invalid game state detected. Resetting to default settings.');
            gameState = {
                playerCount: 5,
                imposterCount: 1,
                imposterKnowledge: 'nothing',
                players: [],
                roles: [],
                originalPlayers: [],
                originalRoles: [],
                currentRound: 1,
                currentPlayerIndex: 0,
                gameWord: 'APPEL',
                votes: {},
                gameEnded: false,
                winner: null
            };
        }
        console.log('✅ Game state validated');
        
        // Remove loading overlay
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        console.log('✅ Loading overlay removed');
        
        // Initialize UX systems
        console.log('🎨 Initializing UX systems...');
        AutoSave.init();
        KeyboardShortcuts.init();
        console.log('✅ UX systems initialized');
        
        // Initialize page
        const currentPage = window.location.pathname.split('/').pop();
        console.log('📄 Current page:', currentPage);
        
        switch(currentPage) {
            case 'index.html':
            case '':
                console.log('🏠 Initializing index page...');
                initIndexPage();
                break;
            case 'player-names.html':
                console.log('👥 Initializing player names page...');
                initPlayerNamesPage();
                break;
            case 'loading.html':
                console.log('⏳ Initializing loading page...');
                initLoadingPage();
                break;
            case 'role-reveal.html':
                console.log('🎭 Initializing role reveal page...');
                initRoleRevealPage();
                break;
            case 'game-rounds.html':
                console.log('🎮 Initializing game rounds page...');
                initGameRoundsPage();
                break;
            case 'voting.html':
                console.log('🗳️ Initializing voting page...');
                initVotingPage();
                break;
            case 'vote-result.html':
                console.log('📊 Initializing vote result page...');
                initVoteResultPage();
                break;
            case 'game-result.html':
                console.log('🏆 Initializing game result page...');
                initGameResultPage();
                break;
            default:
                console.log('❓ Unknown page:', currentPage);
                ErrorHandler.showError('Unknown page. Redirecting to home.');
                window.location.href = 'index.html';
        }
        
        console.log('🎉 Initialization completed successfully!');
        
    } catch (error) {
        console.error('💥 Error in continueInitialization:', error);
        ErrorHandler.showError('Critical error occurred. Please refresh the page.');
    }
}

// Multiple initialization methods for Cloudflare compatibility
document.addEventListener('DOMContentLoaded', initializeGame);

// Fallback for when DOMContentLoaded doesn't fire
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded...');
} else {
    console.log('Document already loaded, initializing immediately...');
    setTimeout(initializeGame, 100);
}

// Additional fallback
window.addEventListener('load', function() {
    if (!window.gameInitialized) {
        console.log('DOMContentLoaded fallback triggered');
        initializeGame();
    }
});

function initIndexPage() {
    const customPlayerCount = document.getElementById('customPlayerCount');
    const imposterCount = document.getElementById('imposterCount');
    const startButton = document.getElementById('startGame');
    
    console.log('Initializing index page');
    console.log('Elements found:', {
        customPlayerCount: !!customPlayerCount,
        imposterCount: !!imposterCount,
        startButton: !!startButton
    });
    
    if (!startButton) {
        console.error('Start button not found!');
        ErrorHandler.showError('Start button not found. Please refresh the page.');
        return;
    }

    // Handle player count input with validation
    if (customPlayerCount) {
        customPlayerCount.addEventListener('input', function() {
            const value = parseInt(this.value);
            const isValid = InputValidator.validate(this, [
                InputValidator.rules.required,
                InputValidator.rules.range(3, 20)
            ]);
            
            if (isValid) {
                gameState.playerCount = value;
                updateImposterMax();
                AutoSave.save();
            }
        });
    }

    // Update imposter max based on player count
    function updateImposterMax() {
        if (!imposterCount) return;
        
        const maxImposters = Math.floor(gameState.playerCount / 2);
        imposterCount.max = maxImposters;
        if (parseInt(imposterCount.value) > maxImposters) {
            imposterCount.value = maxImposters;
        }
    }

    if (imposterCount) {
        imposterCount.addEventListener('input', function() {
            const value = parseInt(this.value);
            const maxImposters = Math.floor(gameState.playerCount / 2);
            const isValid = InputValidator.validate(this, [
                InputValidator.rules.required,
                InputValidator.rules.range(1, maxImposters)
            ]);
            
            if (isValid) {
                gameState.imposterCount = value;
                AutoSave.save();
            }
        });
    }

    // Start game button
    console.log('Adding click listener to start button');
    
    // Remove any existing listeners first
    startButton.onclick = null;
    
    startButton.addEventListener('click', function(event) {
        console.log('Start game button clicked');
        console.log('Event:', event);
        console.log('Current gameState:', gameState);
        
        try {
            // Validate input
            if (gameState.playerCount < 3 || gameState.playerCount > 20) {
                console.log('Invalid player count:', gameState.playerCount);
                ErrorHandler.showError('Aantal spelers moet tussen 3 en 20 zijn.', document.querySelector('.game-settings'));
                return;
            }
            
            if (gameState.imposterCount < 1 || gameState.imposterCount > Math.floor(gameState.playerCount / 2)) {
                console.log('Invalid imposter count:', gameState.imposterCount);
                ErrorHandler.showError('Aantal imposters moet tussen 1 en de helft van het aantal spelers zijn.', document.querySelector('.game-settings'));
                return;
            }
            
            // Get imposter knowledge
            const knowledgeSelect = document.getElementById('imposterKnowledge');
            if (!knowledgeSelect) {
                console.log('Knowledge select not found');
                ErrorHandler.showError('Imposter knowledge selector not found.', document.querySelector('.game-settings'));
                return;
            }
            
            gameState.imposterKnowledge = knowledgeSelect.value;
            console.log('Imposter knowledge set to:', gameState.imposterKnowledge);
            
            // Generate random word for this game
            gameState.gameWord = getRandomWord(gameState.imposterKnowledge);
            console.log('Generated word:', gameState.gameWord);
            
            // Save game state
            console.log('Saving game state...');
            if (!ErrorHandler.safeLocalStorage.set('gameState', gameState)) {
                console.log('Failed to save game state');
                ErrorHandler.showError('Failed to save game settings.', document.querySelector('.game-settings'));
                return;
            }
            
            console.log('Game state saved successfully');
            console.log('Navigating to player-names.html...');
            
            // Navigate to next page with server-side redirect detection
            console.log('Attempting navigation to player-names.html');
            console.log('Current URL:', window.location.href);
            
            // Store current URL to detect redirects
            const originalUrl = window.location.href;
            
            try {
                // Try direct navigation first
                window.location.href = './player-names.html';
                
                // Monitor for redirects
                let redirectCheckCount = 0;
                const maxRedirectChecks = 10;
                
                const checkForRedirect = () => {
                    redirectCheckCount++;
                    console.log(`Redirect check ${redirectCheckCount}/${maxRedirectChecks}`);
                    console.log('Current URL:', window.location.href);
                    
                    if (window.location.href === originalUrl || window.location.href.includes('index')) {
                        console.log('🚨 REDIRECT DETECTED! Server is redirecting back to index');
                        
                        if (redirectCheckCount < maxRedirectChecks) {
                            setTimeout(checkForRedirect, 500);
                        } else {
                            console.log('❌ Redirect loop detected. Trying alternative approach...');
                            handleRedirectLoop();
                        }
                    } else if (window.location.href.includes('player-names')) {
                        console.log('✅ Successfully navigated to player-names.html');
                    } else {
                        console.log('⚠️ Navigated to unexpected page:', window.location.href);
                        setTimeout(checkForRedirect, 500);
                    }
                };
                
                // Start monitoring for redirects
                setTimeout(checkForRedirect, 100);
                
            } catch (navError) {
                console.error('Navigation error:', navError);
                ErrorHandler.showError('Navigation failed. Please check if all files are uploaded correctly.');
            }
            
            function handleRedirectLoop() {
                console.log('Handling redirect loop...');
                
                // Try different approaches
                const approaches = [
                    () => {
                        console.log('Trying absolute URL...');
                        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
                        window.location.href = baseUrl + 'player-names.html';
                    },
                    () => {
                        console.log('Trying without ./ prefix...');
                        window.location.href = 'player-names.html';
                    },
                    () => {
                        console.log('Trying with full path...');
                        const pathParts = window.location.pathname.split('/');
                        pathParts[pathParts.length - 1] = 'player-names.html';
                        window.location.href = pathParts.join('/');
                    },
                    () => {
                        console.log('Trying form submission...');
                        const form = document.createElement('form');
                        form.method = 'GET';
                        form.action = 'player-names.html';
                        document.body.appendChild(form);
                        form.submit();
                    }
                ];
                
                let approachIndex = 0;
                const tryNextApproach = () => {
                    if (approachIndex < approaches.length) {
                        console.log(`Trying approach ${approachIndex + 1}...`);
                        approaches[approachIndex]();
                        approachIndex++;
                        setTimeout(tryNextApproach, 2000);
                    } else {
                        console.log('❌ All navigation approaches failed');
                        ErrorHandler.showError('Server redirect detected. Please check server configuration or try refreshing the page.');
                    }
                };
                
                tryNextApproach();
            }
            
        } catch (error) {
            console.error('Error starting game:', error);
            ErrorHandler.showError('Error starting game. Please try again.', document.querySelector('.game-settings'));
        }
    });

    updateImposterMax();
    
    // Test if button is clickable
    console.log('Button disabled?', startButton.disabled);
    console.log('Button style:', window.getComputedStyle(startButton));
    
    // Test if all required files exist
    testFileExistence();
    
    // Add a simple test click to verify the button works
    console.log('Adding test click listener...');
    startButton.addEventListener('click', function() {
        console.log('TEST: Button click detected!');
    }, { once: true });
    
    // Also try with a different event listener approach
    console.log('Setting onclick handler...');
    startButton.onclick = function(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('ONCLICK: Button clicked via onclick!');
        console.log('Event:', event);
        console.log('Current gameState:', gameState);
        
        // Call the main function directly
        handleStartGame();
    };
    
    // Test if button is actually clickable
    console.log('Button element:', startButton);
    console.log('Button tagName:', startButton.tagName);
    console.log('Button type:', startButton.type);
    console.log('Button disabled:', startButton.disabled);
    console.log('Button style pointer-events:', window.getComputedStyle(startButton).pointerEvents);
    console.log('Button style display:', window.getComputedStyle(startButton).display);
    console.log('Button style visibility:', window.getComputedStyle(startButton).visibility);
    
    
    function handleStartGame() {
        console.log('handleStartGame called');
        console.log('Current gameState:', gameState);
        
        try {
            // Validate input
            if (gameState.playerCount < 3 || gameState.playerCount > 20) {
                console.log('Invalid player count:', gameState.playerCount);
                ErrorHandler.showError('Aantal spelers moet tussen 3 en 20 zijn.', document.querySelector('.game-settings'));
                return;
            }
            
            if (gameState.imposterCount < 1 || gameState.imposterCount > Math.floor(gameState.playerCount / 2)) {
                console.log('Invalid imposter count:', gameState.imposterCount);
                ErrorHandler.showError('Aantal imposters moet tussen 1 en de helft van het aantal spelers zijn.', document.querySelector('.game-settings'));
                return;
            }
            
            // Get imposter knowledge
            const knowledgeSelect = document.getElementById('imposterKnowledge');
            if (!knowledgeSelect) {
                console.log('Knowledge select not found');
                ErrorHandler.showError('Imposter knowledge selector not found.', document.querySelector('.game-settings'));
                return;
            }
            
            gameState.imposterKnowledge = knowledgeSelect.value;
            console.log('Imposter knowledge set to:', gameState.imposterKnowledge);
            
            // Generate random word for this game
            gameState.gameWord = getRandomWord(gameState.imposterKnowledge);
            console.log('Generated word:', gameState.gameWord);
            
            // Save game state
            console.log('Saving game state...');
            if (!ErrorHandler.safeLocalStorage.set('gameState', gameState)) {
                console.log('Failed to save game state');
                ErrorHandler.showError('Failed to save game settings.', document.querySelector('.game-settings'));
                return;
            }
            
            console.log('Game state saved successfully');
            console.log('Navigating to player-names.html...');
            
            // Navigate to next page with server-side redirect detection
            console.log('Attempting navigation to player-names.html');
            console.log('Current URL:', window.location.href);
            
            // Store current URL to detect redirects
            const originalUrl = window.location.href;
            
            try {
                // Try direct navigation first
                window.location.href = './player-names.html';
                
                // Monitor for redirects
                let redirectCheckCount = 0;
                const maxRedirectChecks = 10;
                
                const checkForRedirect = () => {
                    redirectCheckCount++;
                    console.log(`Redirect check ${redirectCheckCount}/${maxRedirectChecks}`);
                    console.log('Current URL:', window.location.href);
                    
                    if (window.location.href === originalUrl || window.location.href.includes('index')) {
                        console.log('🚨 REDIRECT DETECTED! Server is redirecting back to index');
                        
                        if (redirectCheckCount < maxRedirectChecks) {
                            setTimeout(checkForRedirect, 500);
                        } else {
                            console.log('❌ Redirect loop detected. Trying alternative approach...');
                            handleRedirectLoop();
                        }
                    } else if (window.location.href.includes('player-names')) {
                        console.log('✅ Successfully navigated to player-names.html');
                    } else {
                        console.log('⚠️ Navigated to unexpected page:', window.location.href);
                        setTimeout(checkForRedirect, 500);
                    }
                };
                
                // Start monitoring for redirects
                setTimeout(checkForRedirect, 100);
                
            } catch (navError) {
                console.error('Navigation error:', navError);
                ErrorHandler.showError('Navigation failed. Please check if all files are uploaded correctly.');
            }
            
            function handleRedirectLoop() {
                console.log('Handling redirect loop...');
                
                // Try different approaches
                const approaches = [
                    () => {
                        console.log('Trying absolute URL...');
                        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
                        window.location.href = baseUrl + 'player-names.html';
                    },
                    () => {
                        console.log('Trying without ./ prefix...');
                        window.location.href = 'player-names.html';
                    },
                    () => {
                        console.log('Trying with full path...');
                        const pathParts = window.location.pathname.split('/');
                        pathParts[pathParts.length - 1] = 'player-names.html';
                        window.location.href = pathParts.join('/');
                    },
                    () => {
                        console.log('Trying form submission...');
                        const form = document.createElement('form');
                        form.method = 'GET';
                        form.action = 'player-names.html';
                        document.body.appendChild(form);
                        form.submit();
                    }
                ];
                
                let approachIndex = 0;
                const tryNextApproach = () => {
                    if (approachIndex < approaches.length) {
                        console.log(`Trying approach ${approachIndex + 1}...`);
                        approaches[approachIndex]();
                        approachIndex++;
                        setTimeout(tryNextApproach, 2000);
                    } else {
                        console.log('❌ All navigation approaches failed');
                        ErrorHandler.showError('Server redirect detected. Please check server configuration or try refreshing the page.');
                    }
                };
                
                tryNextApproach();
            }
            
        } catch (error) {
            console.error('Error starting game:', error);
            ErrorHandler.showError('Error starting game. Please try again.', document.querySelector('.game-settings'));
        }
    }
}

// Direct function approach - bypasses all event listener issues
function startGameDirect() {
    console.log('startGameDirect called');
    
    try {
        // Get values directly from DOM
        const playerCount = parseInt(document.getElementById('customPlayerCount').value) || 5;
        const imposterCount = parseInt(document.getElementById('imposterCount').value) || 1;
        const imposterKnowledge = document.getElementById('imposterKnowledge').value || 'nothing';
        
        console.log('Values:', { playerCount, imposterCount, imposterKnowledge });
        
        // Validate
        if (playerCount < 3 || playerCount > 20) {
            alert('Aantal spelers moet tussen 3 en 20 zijn.');
            return;
        }
        
        if (imposterCount < 1 || imposterCount > Math.floor(playerCount / 2)) {
            alert('Aantal imposters moet tussen 1 en de helft van het aantal spelers zijn.');
            return;
        }
        
        // Create game state
        const gameStateData = {
            playerCount: playerCount,
            imposterCount: imposterCount,
            imposterKnowledge: imposterKnowledge,
            players: [],
            roles: [],
            originalPlayers: [],
            originalRoles: [],
            currentRound: 1,
            currentPlayerIndex: 0,
            gameWord: getRandomWord(imposterKnowledge),
            votes: {},
            gameEnded: false,
            winner: null
        };
        
        console.log('Game state created:', gameStateData);
        
        // Save to localStorage
        localStorage.setItem('gameState', JSON.stringify(gameStateData));
        console.log('Game state saved to localStorage');
        
        // Navigate using form submission (more reliable on Cloudflare)
        console.log('Navigating to player-names.html using form submission');
        
        // Create and submit a form
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = 'player-names.html';
        form.style.display = 'none';
        document.body.appendChild(form);
        form.submit();
        
    } catch (error) {
        console.error('Error in startGameDirect:', error);
        alert('Er is een fout opgetreden. Probeer het opnieuw.');
    }
}

// Make function globally available
window.startGameDirect = startGameDirect;

function initPlayerNamesPage() {
    const gameStateData = localStorage.getItem('gameState');
    if (gameStateData) {
        gameState = JSON.parse(gameStateData);
    }

    const playerInputs = document.getElementById('playerInputs');
    const startButton = document.getElementById('startGameWithNames');

    // Create input fields for each player
    for (let i = 0; i < gameState.playerCount; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'player-input';
        
        const label = document.createElement('label');
        label.textContent = `Speler ${i + 1}:`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Naam van speler ${i + 1}`;
        input.required = true;
        
        input.addEventListener('input', function() {
            // Validate individual input
            InputValidator.validate(this, [
                InputValidator.rules.required,
                InputValidator.rules.minLength(1),
                InputValidator.rules.maxLength(20)
            ]);
            
            checkAllNamesFilled();
            AutoSave.save();
        });
        
        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        playerInputs.appendChild(inputGroup);
    }

    function checkAllNamesFilled() {
        const inputs = playerInputs.querySelectorAll('input');
        let allFilled = true;
        
        gameState.players = [];
        inputs.forEach(input => {
            if (input.value.trim() === '') {
                allFilled = false;
            } else {
                gameState.players.push(input.value.trim());
            }
        });
        
        startButton.disabled = !allFilled;
    }

    startButton.addEventListener('click', function() {
        localStorage.setItem('gameState', JSON.stringify(gameState));
        window.location.href = 'loading.html';
    });
}

function initLoadingPage() {
    const gameStateData = localStorage.getItem('gameState');
    if (gameStateData) {
        gameState = JSON.parse(gameStateData);
    }

    const countdown = document.getElementById('countdown');
    let timeLeft = 5;

    // Assign roles randomly
    assignRoles();

    const timer = setInterval(function() {
        timeLeft--;
        countdown.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            localStorage.setItem('gameState', JSON.stringify(gameState));
            window.location.href = 'role-reveal.html';
        }
    }, 1000);
}

function assignRoles() {
    // Create array with imposter and crewmate roles
    gameState.roles = [];
    
    // Add imposters
    for (let i = 0; i < gameState.imposterCount; i++) {
        gameState.roles.push('imposter');
    }
    
    // Add crewmates
    for (let i = 0; i < gameState.playerCount - gameState.imposterCount; i++) {
        gameState.roles.push('crewmate');
    }
    
    // Shuffle roles randomly
    for (let i = gameState.roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.roles[i], gameState.roles[j]] = [gameState.roles[j], gameState.roles[i]];
    }
    
    // Store original state for end game display
    gameState.originalPlayers = [...gameState.players];
    gameState.originalRoles = [...gameState.roles];
    
    // Word is already assigned when starting the game
}

function initRoleRevealPage() {
    const gameStateData = localStorage.getItem('gameState');
    if (gameStateData) {
        gameState = JSON.parse(gameStateData);
    }

    const playerList = document.getElementById('playerList');
    const roleModal = document.getElementById('roleModal');
    const roleText = document.getElementById('roleText');
    const startRounds = document.getElementById('startRounds');

    // Create player cards
    gameState.players.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.textContent = player;
        card.addEventListener('click', function() {
            showRole(player, index);
        });
        playerList.appendChild(card);
    });

    function showRole(playerName, playerIndex) {
        const role = gameState.roles[playerIndex];
        let message = '';
        let roleClass = '';
        
        if (role === 'imposter') {
            message = `Jij bent de imposter, je weet het woord niet`;
            roleClass = 'imposter-role';
        } else {
            message = `Jij bent niet de imposter. Dit is het woord: ${gameState.gameWord}`;
            roleClass = 'crewmate-role';
        }
        
        roleText.innerHTML = `
            <div class="role-content ${roleClass}">
                <div class="close-button" onclick="closeRoleModal()">&times;</div>
                <div class="role-icon">${role === 'imposter' ? '🔴' : '🟢'}</div>
                <div class="role-message">${message}</div>
                <div class="role-hint">Klik op het kruisje of wacht 10 seconden</div>
            </div>
        `;
        roleModal.classList.remove('hidden');
        
        // Auto-hide modal after 10 seconds
        setTimeout(function() {
            closeRoleModal();
        }, 10000);
    }
    
    // Global function to close role modal
    window.closeRoleModal = function() {
        const roleModal = document.getElementById('roleModal');
        if (roleModal) {
            roleModal.classList.add('hidden');
        }
    }

    startRounds.addEventListener('click', function() {
        localStorage.setItem('gameState', JSON.stringify(gameState));
        window.location.href = 'game-rounds.html';
    });

    // Enable start rounds button after 10 seconds
    setTimeout(function() {
        startRounds.disabled = false;
        ErrorHandler.showSuccess('Je kunt nu de rondes starten!', document.querySelector('.role-reveal-content'));
    }, 10000);
}

function initGameRoundsPage() {
    const gameStateData = localStorage.getItem('gameState');
    if (gameStateData) {
        gameState = JSON.parse(gameStateData);
    }

    const currentPlayerName = document.getElementById('currentPlayerName');
    const currentRound = document.getElementById('currentRound');
    const currentPlayerIndex = document.getElementById('currentPlayerIndex');
    const totalPlayers = document.getElementById('totalPlayers');
    const nextPlayer = document.getElementById('nextPlayer');
    const startVoting = document.getElementById('startVoting');

    totalPlayers.textContent = gameState.playerCount;
    updateCurrentPlayer();

    function updateCurrentPlayer() {
        currentPlayerName.textContent = gameState.players[gameState.currentPlayerIndex];
        currentPlayerIndex.textContent = gameState.currentPlayerIndex + 1;
        currentRound.textContent = gameState.currentRound;
    }

    nextPlayer.addEventListener('click', function() {
        gameState.currentPlayerIndex++;
        
        if (gameState.currentPlayerIndex >= gameState.playerCount) {
            gameState.currentPlayerIndex = 0;
            gameState.currentRound++;
        }
        
        updateCurrentPlayer();
        localStorage.setItem('gameState', JSON.stringify(gameState));
    });

    startVoting.addEventListener('click', function() {
        localStorage.setItem('gameState', JSON.stringify(gameState));
        window.location.href = 'voting.html';
    });
}

function initVotingPage() {
    const gameStateData = localStorage.getItem('gameState');
    if (gameStateData) {
        gameState = JSON.parse(gameStateData);
    }

    const votingOptions = document.getElementById('votingOptions');
    const submitVote = document.getElementById('submitVote');
    let selectedPlayer = null;

    // Create voting options
    gameState.players.forEach((player, index) => {
        const option = document.createElement('div');
        option.className = 'voting-option';
        option.textContent = player;
        option.addEventListener('click', function() {
            // Remove previous selection
            votingOptions.querySelectorAll('.voting-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Select this option
            this.classList.add('selected');
            selectedPlayer = player;
            submitVote.disabled = false;
        });
        votingOptions.appendChild(option);
    });

    submitVote.addEventListener('click', function() {
        if (selectedPlayer) {
            // Find the index of the voted player
            const votedPlayerIndex = gameState.players.indexOf(selectedPlayer);
            const isCorrect = gameState.roles[votedPlayerIndex] === 'imposter';
            
            gameState.voteResult = {
                votedPlayer: selectedPlayer,
                isCorrect: isCorrect
            };
            
            if (isCorrect) {
                // Remove the imposter from the game
                gameState.players.splice(votedPlayerIndex, 1);
                gameState.roles.splice(votedPlayerIndex, 1);
                gameState.imposterCount--;
                
                console.log('Imposter eliminated. Remaining imposters:', gameState.imposterCount);
                
                // Check win conditions
                if (gameState.imposterCount === 0) {
                    gameState.gameEnded = true;
                    gameState.winner = 'crewmates';
                } else if (gameState.imposterCount >= gameState.players.length - gameState.imposterCount) {
                    gameState.gameEnded = true;
                    gameState.winner = 'imposters';
                }
            } else {
                // Remove a crewmate from the game
                gameState.players.splice(votedPlayerIndex, 1);
                gameState.roles.splice(votedPlayerIndex, 1);
                
                console.log('Crewmate eliminated. Remaining imposters:', gameState.imposterCount);
                
                // Check win conditions
                if (gameState.imposterCount >= gameState.players.length - gameState.imposterCount) {
                    gameState.gameEnded = true;
                    gameState.winner = 'imposters';
                }
            }
            
            localStorage.setItem('gameState', JSON.stringify(gameState));
            
            if (gameState.gameEnded) {
                window.location.href = 'game-result.html';
            } else {
                // Show vote result first
                window.location.href = 'vote-result.html';
            }
        }
    });
}

function initVoteResultPage() {
    const gameStateData = localStorage.getItem('gameState');
    if (gameStateData) {
        gameState = JSON.parse(gameStateData);
    }

    const voteResultMessage = document.getElementById('voteResultMessage');
    const gameStatus = document.getElementById('gameStatus');
    const continueGame = document.getElementById('continueGame');

    // Show vote result
    if (gameState.voteResult) {
        // Find the role of the voted player from original data
        let votedPlayerRole = 'onbekend';
        if (gameState.originalPlayers && gameState.originalRoles) {
            const originalIndex = gameState.originalPlayers.indexOf(gameState.voteResult.votedPlayer);
            if (originalIndex !== -1) {
                votedPlayerRole = gameState.originalRoles[originalIndex] === 'imposter' ? 'imposter' : 'crewmate';
            }
        }

        if (gameState.voteResult.isCorrect) {
            voteResultMessage.innerHTML = `<div class="vote-result correct">
                <h2>Correct!</h2>
                <p>${gameState.voteResult.votedPlayer} was inderdaad een <strong>imposter</strong>!</p>
            </div>`;
        } else {
            if (votedPlayerRole === 'crewmate') {
                voteResultMessage.innerHTML = `<div class="vote-result incorrect">
                    <h2>Fout!</h2>
                    <p>${gameState.voteResult.votedPlayer} was een <strong>crewmate</strong>.</p>
                    <p><strong>De imposter zit er nog in!</strong></p>
                </div>`;
            } else {
                voteResultMessage.innerHTML = `<div class="vote-result incorrect">
                    <h2>Fout!</h2>
                    <p>${gameState.voteResult.votedPlayer} was een <strong>imposter</strong>, maar er zitten nog meer imposters in het spel!</p>
                </div>`;
            }
        }
    }

    // Show game status
    const remainingPlayers = gameState.players.length;
    
    // Count actual imposters in remaining players
    const actualImposters = gameState.roles.filter(role => role === 'imposter').length;
    const remainingCrewmates = gameState.roles.filter(role => role === 'crewmate').length;
    
    console.log('Debug - remainingPlayers:', remainingPlayers);
    console.log('Debug - gameState.imposterCount:', gameState.imposterCount);
    console.log('Debug - actualImposters:', actualImposters);
    console.log('Debug - remainingCrewmates:', remainingCrewmates);
    console.log('Debug - gameState.roles:', gameState.roles);

    gameStatus.innerHTML = `
        <div class="game-status">
            <h3>Spel Status</h3>
            <p>Nog in het spel: <strong>${remainingPlayers}</strong> spelers</p>
            <p>Imposters: <strong>${actualImposters}</strong></p>
            <p>Crewmates: <strong>${remainingCrewmates}</strong></p>
            <p>Ronde: <strong>${gameState.currentRound}</strong></p>
        </div>
    `;

    continueGame.addEventListener('click', function() {
        // Continue to next round
        gameState.currentRound++;
        gameState.currentPlayerIndex = 0;
        localStorage.setItem('gameState', JSON.stringify(gameState));
        window.location.href = 'game-rounds.html';
    });
}

function initGameResultPage() {
    const gameStateData = localStorage.getItem('gameState');
    if (gameStateData) {
        gameState = JSON.parse(gameStateData);
    }

    const resultMessage = document.getElementById('resultMessage');
    const playerRoles = document.getElementById('playerRoles');
    const playAgain = document.getElementById('playAgain');

    // Show game result
    if (gameState.winner === 'crewmates') {
        resultMessage.textContent = 'Gefeliciteerd! De crewmates hebben gewonnen!';
        resultMessage.className = 'win';
    } else if (gameState.winner === 'imposters') {
        resultMessage.textContent = 'De imposters hebben gewonnen!';
        resultMessage.className = 'lose';
    }
    
    // Show last vote result if available
    if (gameState.voteResult) {
        const voteInfo = document.createElement('div');
        voteInfo.style.marginTop = '20px';
        voteInfo.style.fontSize = '16px';
        
        // Find the role of the voted player from original data
        let votedPlayerRole = 'onbekend';
        if (gameState.originalPlayers && gameState.originalRoles) {
            const originalIndex = gameState.originalPlayers.indexOf(gameState.voteResult.votedPlayer);
            if (originalIndex !== -1) {
                votedPlayerRole = gameState.originalRoles[originalIndex] === 'imposter' ? 'imposter' : 'crewmate';
            }
        }
        
        if (gameState.voteResult.isCorrect) {
            voteInfo.innerHTML = `Laatste stem: <strong>Correct!</strong> ${gameState.voteResult.votedPlayer} was inderdaad een <strong>imposter</strong>.`;
            voteInfo.style.color = '#2e7d32';
        } else {
            if (votedPlayerRole === 'crewmate') {
                voteInfo.innerHTML = `Laatste stem: <strong>Fout!</strong> ${gameState.voteResult.votedPlayer} was een <strong>crewmate</strong>. De imposter zit er nog in!`;
            } else {
                voteInfo.innerHTML = `Laatste stem: <strong>Fout!</strong> ${gameState.voteResult.votedPlayer} was een <strong>imposter</strong>, maar er zitten nog meer imposters in het spel!`;
            }
            voteInfo.style.color = '#c62828';
        }
        
        resultMessage.parentNode.insertBefore(voteInfo, resultMessage.nextSibling);
    }

    // Show all original player roles (including eliminated players)
    if (gameState.originalPlayers && gameState.originalPlayers.length > 0) {
        gameState.originalPlayers.forEach((player, index) => {
            const roleDiv = document.createElement('div');
            roleDiv.className = `player-role ${gameState.originalRoles[index]}`;
            roleDiv.textContent = `${player}: ${gameState.originalRoles[index] === 'imposter' ? 'Imposter' : 'Crewmate'}`;
            playerRoles.appendChild(roleDiv);
        });
    } else {
        // Fallback to current players if original data not available
        gameState.players.forEach((player, index) => {
            const roleDiv = document.createElement('div');
            roleDiv.className = `player-role ${gameState.roles[index]}`;
            roleDiv.textContent = `${player}: ${gameState.roles[index] === 'imposter' ? 'Imposter' : 'Crewmate'}`;
            playerRoles.appendChild(roleDiv);
        });
    }

    const playAgainButton = document.getElementById('playAgainButton');
    const playAgainOptions = document.getElementById('playAgainOptions');
    const playAgainSamePlayers = document.getElementById('playAgainSamePlayers');
    const playAgainNew = document.getElementById('playAgainNew');

    playAgainButton.addEventListener('click', function() {
        // Show the options
        playAgainOptions.classList.remove('hidden');
        // Hide the main button
        playAgainButton.style.display = 'none';
    });

    playAgainSamePlayers.addEventListener('click', function() {
        // Keep same players and settings but reset game state
        const newGameState = {
            playerCount: gameState.playerCount,
            imposterCount: gameState.imposterCount,
            imposterKnowledge: gameState.imposterKnowledge,
            players: [...gameState.originalPlayers],
            roles: [],
            originalPlayers: [...gameState.originalPlayers],
            originalRoles: [],
            currentRound: 1,
            currentPlayerIndex: 0,
            gameWord: getRandomWord(gameState.imposterKnowledge),
            votes: {},
            gameEnded: false,
            winner: null
        };
        localStorage.setItem('gameState', JSON.stringify(newGameState));
        window.location.href = 'loading.html';
    });

    playAgainNew.addEventListener('click', function() {
        ConfirmationDialog.show(
            'Weet je zeker dat je een nieuw spel wilt starten? Alle huidige instellingen worden verwijderd.',
            function() {
                ErrorHandler.safeLocalStorage.remove('gameState');
                window.location.href = 'index.html';
            }
        );
    });
}
