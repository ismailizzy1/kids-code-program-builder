let workspace = null;
let isDarkMode = false;

// Game state
let currentCharacter = '';
let characterPosition = { x: 100, y: 100 };
let gameScore = 0;
let backgroundMusic = null;
let achievements = [];

// Sound effects
const sounds = {
    jump: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'] }),
    collect: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3'] }),
    win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'] }),
    drag: null,
    drop: null
};

// Achievement system
function unlockAchievement(title) {
    if (!achievements.includes(title)) {
        achievements.push(title);
        const achievement = document.createElement('div');
        achievement.className = 'achievement animate__animated animate__slideInRight';
        achievement.innerHTML = ` Achievement Unlocked: ${title}`;
        document.body.appendChild(achievement);
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        setTimeout(() => achievement.remove(), 3000);
    }
}

// Character functions
function chooseCharacter() {
    const characterSelect = document.getElementById('character-select');
    characterSelect.style.display = 'block';
}

function selectCharacter(char) {
    currentCharacter = char;
    document.getElementById('character-select').style.display = 'none';
    unlockAchievement('Character Selected!');
}

// Initialize canvas
window.onload = function() {
    const canvas = document.getElementById('animation-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize Blockly workspace
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        scrollbars: true,
        trashcan: true,
        zoom: {
            controls: true,
            wheel: true,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2
        },
        grid: {
            spacing: 25,
            length: 3,
            colour: '#ccc',
            snap: true
        },
        theme: Blockly.Theme.defineTheme('kidTheme', {
            'base': Blockly.Themes.Classic,
            'componentStyles': {
                'workspaceBackgroundColour': '#f8f9fa',
                'toolboxBackgroundColour': '#fff',
                'toolboxForegroundColour': '#494949',
                'flyoutBackgroundColour': '#fff',
                'flyoutForegroundColour': '#494949',
                'flyoutOpacity': 0.9,
                'scrollbarColour': '#ff8c00',
                'insertionMarkerColour': '#fff',
                'insertionMarkerOpacity': 0.3,
                'scrollbarOpacity': 0.4,
                'cursorColour': '#d0d0d0'
            }
        })
    });

    // Enhanced drag-drop functionality
    Blockly.Extensions.register('drag_drop_extension', function() {
        this.setOnChange(function(event) {
            if (event.type == Blockly.Events.BLOCK_DRAG) {
                if (event.isStart) {
                    playDragSound();
                    showBlockPreview(this);
                } else {
                    hideDragPreview();
                    if (isValidDrop(this)) {
                        playDropSound();
                        showSuccessEffect(this);
                    }
                }
            }
        });
    });

    // Apply the extension to all blocks
    Blockly.Blocks['*'].extensions = ['drag_drop_extension'];

    // Load saved blocks if they exist
    loadBlocks();

    // Start tutorial if first time
    if (!localStorage.getItem('tutorialShown')) {
        startTutorial();
        localStorage.setItem('tutorialShown', 'true');
    }

    // Add workspace change listener for real-time feedback
    workspace.addChangeListener(function(event) {
        if (event.type == Blockly.Events.BLOCK_CHANGE ||
            event.type == Blockly.Events.BLOCK_CREATE ||
            event.type == Blockly.Events.BLOCK_DELETE) {
            
            updateBlockCount();
            checkAchievements();
        }
    });
};

// Custom blocks definitions
Blockly.Blocks['say_hello'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("say hello to")
            .appendField(new Blockly.FieldTextInput("world"), "NAME");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#4CAF50');
        this.setTooltip("Says hello to someone!");
    }
};

Blockly.Blocks['show_message'] = {
    init: function() {
        this.appendValueInput("MESSAGE")
            .setCheck("String")
            .appendField("show message");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#4CAF50');
        this.setTooltip("Shows a message in a popup");
    }
};

Blockly.Blocks['play_sound'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("play sound")
            .appendField(new Blockly.FieldDropdown([
                ["beep", "BEEP"],
                ["victory", "VICTORY"],
                ["error", "ERROR"]
            ]), "SOUND");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#4CAF50');
        this.setTooltip("Plays a sound effect");
    }
};

Blockly.Blocks['move_sprite'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("move")
            .appendField(new Blockly.FieldDropdown([
                ["right", "RIGHT"],
                ["left", "LEFT"],
                ["up", "UP"],
                ["down", "DOWN"]
            ]), "DIRECTION")
            .appendField("by")
            .appendField(new Blockly.FieldNumber(10, 0, 100), "STEPS")
            .appendField("steps");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FF5722');
        this.setTooltip("Moves a sprite in the specified direction");
    }
};

Blockly.Blocks['move_character'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("move")
            .appendField(new Blockly.FieldDropdown([
                ["right", "RIGHT"],
                ["left", "LEFT"],
                ["up", "UP"],
                ["down", "DOWN"]
            ]), "DIRECTION")
            .appendField("by")
            .appendField(new Blockly.FieldNumber(50, 0, 500), "STEPS")
            .appendField("pixels");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FF4081');
        this.setTooltip("Move the character in a direction");
    }
};

Blockly.Blocks['character_say'] = {
    init: function() {
        this.appendValueInput("MESSAGE")
            .setCheck("String")
            .appendField("make character say");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FF4081');
        this.setTooltip("Make the character say something");
    }
};

Blockly.Blocks['character_dance'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("do the")
            .appendField(new Blockly.FieldDropdown([
                ["happy", "HAPPY"],
                ["cool", "COOL"],
                ["silly", "SILLY"]
            ]), "DANCE")
            .appendField("dance");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FF4081');
        this.setTooltip("Make the character dance");
    }
};

Blockly.Blocks['play_music'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("play")
            .appendField(new Blockly.FieldDropdown([
                ["happy tune", "HAPPY"],
                ["adventure music", "ADVENTURE"],
                ["victory fanfare", "VICTORY"]
            ]), "MUSIC");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#9C27B0');
        this.setTooltip("Play background music");
    }
};

Blockly.Blocks['draw_shape'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("draw")
            .appendField(new Blockly.FieldDropdown([
                ["circle", "CIRCLE"],
                ["square", "SQUARE"],
                ["star", "STAR"],
                ["heart", "HEART"]
            ]), "SHAPE")
            .appendField("size")
            .appendField(new Blockly.FieldNumber(50, 10, 200), "SIZE");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#2196F3');
        this.setTooltip("Draw a shape");
    }
};

Blockly.Blocks['character_jump'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("jump")
            .appendField(new Blockly.FieldDropdown([
                ["small", "SMALL"],
                ["medium", "MEDIUM"],
                ["high", "HIGH"]
            ]), "HEIGHT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FF4081');
        this.setTooltip("Make the character jump");
    }
};

Blockly.Blocks['character_spin'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("spin")
            .appendField(new Blockly.FieldDropdown([
                ["slowly", "SLOW"],
                ["normally", "NORMAL"],
                ["quickly", "FAST"]
            ]), "SPEED");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FF4081');
        this.setTooltip("Make the character spin");
    }
};

Blockly.Blocks['particle_effect'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("create particles")
            .appendField(new Blockly.FieldDropdown([
                ["sparkles", "SPARKLE"],
                ["bubbles", "BUBBLE"],
                ["stars", "STAR"],
                ["hearts", "HEART"]
            ]), "EFFECT");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FF5722');
        this.setTooltip("Add particle effects");
    }
};

Blockly.Blocks['create_melody'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("play melody")
            .appendField(new Blockly.FieldDropdown([
                ["happy", "HAPPY"],
                ["mysterious", "MYSTERY"],
                ["victory", "VICTORY"]
            ]), "MELODY");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#9C27B0');
        this.setTooltip("Play a melody");
    }
};

// JavaScript generators for custom blocks
Blockly.JavaScript['say_hello'] = function(block) {
    const name = block.getFieldValue('NAME');
    return `appendOutput('Hello, ${name}! ');\n`;
};

Blockly.JavaScript['show_message'] = function(block) {
    const message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    return `Swal.fire({
        title: 'Message',
        text: ${message},
        icon: 'info'
    });\n`;
};

Blockly.JavaScript['play_sound'] = function(block) {
    const sound = block.getFieldValue('SOUND');
    return `playSound('${sound}');\n`;
};

Blockly.JavaScript['move_sprite'] = function(block) {
    const direction = block.getFieldValue('DIRECTION');
    const steps = block.getFieldValue('STEPS');
    return `moveSprite('${direction}', ${steps});\n`;
};

Blockly.JavaScript['move_character'] = function(block) {
    const direction = block.getFieldValue('DIRECTION');
    const steps = block.getFieldValue('STEPS');
    return `moveCharacter('${direction}', ${steps});\n`;
};

Blockly.JavaScript['character_say'] = function(block) {
    const message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    return `characterSay(${message});\n`;
};

Blockly.JavaScript['character_dance'] = function(block) {
    const dance = block.getFieldValue('DANCE');
    return `characterDance('${dance}');\n`;
};

Blockly.JavaScript['play_music'] = function(block) {
    const music = block.getFieldValue('MUSIC');
    return `playBackgroundMusic('${music}');\n`;
};

Blockly.JavaScript['draw_shape'] = function(block) {
    const shape = block.getFieldValue('SHAPE');
    const size = block.getFieldValue('SIZE');
    return `drawShape('${shape}', ${size});\n`;
};

Blockly.JavaScript['character_jump'] = function(block) {
    const height = block.getFieldValue('HEIGHT');
    return `characterJump('${height}');\n`;
};

Blockly.JavaScript['character_spin'] = function(block) {
    const speed = block.getFieldValue('SPEED');
    return `characterSpin('${speed}');\n`;
};

Blockly.JavaScript['particle_effect'] = function(block) {
    const effect = block.getFieldValue('EFFECT');
    return `createParticles('${effect}');\n`;
};

Blockly.JavaScript['create_melody'] = function(block) {
    const melody = block.getFieldValue('MELODY');
    return `playMelody('${melody}');\n`;
};

// Helper functions
function appendOutput(text) {
    const output = document.getElementById('output-content');
    output.innerHTML += text + '<br>';
    output.scrollTop = output.scrollHeight;
}

function clearOutput() {
    document.getElementById('output-content').innerHTML = '';
}

function playSound(soundType) {
    const sounds = {
        'BEEP': 440,
        'VICTORY': 587.33,
        'ERROR': 220
    };

    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.frequency.value = sounds[soundType];
    oscillator.type = 'sine';

    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(1, context.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.5);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);
}

// Function to run the code
function runCode() {
    clearOutput();
    try {
        const code = Blockly.JavaScript.workspaceToCode(workspace);
        // Create a safe function wrapper
        const safeEval = new Function(code);
        safeEval();
    } catch (e) {
        Swal.fire({
            title: 'Oops!',
            text: 'Something went wrong: ' + e.message,
            icon: 'error'
        });
    }
}

// Function to save blocks
function saveBlocks() {
    const xml = Blockly.Xml.workspaceToDom(workspace);
    const xmlText = Blockly.Xml.domToText(xml);
    localStorage.setItem('kidsProgramBlocks', xmlText);
    Swal.fire({
        title: 'Saved!',
        text: 'Your program has been saved! ',
        icon: 'success',
        showConfirmButton: false,
        timer: 1500
    });
}

// Function to load blocks
function loadBlocks() {
    const xmlText = localStorage.getItem('kidsProgramBlocks');
    if (xmlText) {
        workspace.clear();
        const xml = Blockly.Xml.textToDom(xmlText);
        Blockly.Xml.domToWorkspace(xml, workspace);
        Swal.fire({
            title: 'Loaded!',
            text: 'Your program has been loaded! ',
            icon: 'success',
            showConfirmButton: false,
            timer: 1500
        });
    }
}

// Toggle output panel
function toggleOutput() {
    const outputPanel = document.getElementById('output-panel');
    outputPanel.style.display = outputPanel.style.display === 'none' ? 'block' : 'none';
}

// Share project
function shareProject() {
    const xml = Blockly.Xml.workspaceToDom(workspace);
    const xmlText = Blockly.Xml.domToText(xml);
    const encoded = encodeURIComponent(xmlText);

    Swal.fire({
        title: 'Share Your Project',
        html: `Copy this link to share your project:<br>
        <input type="text" id="share-link" value="${window.location.href}#code=${encoded}" 
        readonly style="width: 100%; margin-top: 10px; padding: 5px;">`,
        icon: 'info',
        confirmButtonText: 'Copy Link',
    }).then((result) => {
        if (result.isConfirmed) {
            const linkInput = document.getElementById('share-link');
            linkInput.select();
            document.execCommand('copy');
            Swal.fire('Copied!', 'Share link has been copied to clipboard!', 'success');
        }
    });
}

// Tutorial function
function startTutorial() {
    Swal.mixin({
        confirmButtonText: 'Next &rarr;',
        showCancelButton: true,
        progressSteps: ['1', '2', '3', '4']
    }).queue([
        {
            title: 'Welcome to Kids Code Builder! ',
            text: 'Let\'s learn how to create amazing programs!',
            icon: 'info'
        },
        {
            title: 'Building Blocks ',
            text: 'Drag blocks from the left panel and connect them to create your program.',
            icon: 'info'
        },
        {
            title: 'Run Your Program ',
            text: 'Click the "Run Program" button to see your creation in action!',
            icon: 'info'
        },
        {
            title: 'Save Your Work ',
            text: 'Don\'t forget to save your program using the "Save" button!',
            icon: 'info'
        }
    ]);
}

// Theme toggle
function toggleTheme() {
    isDarkMode = !isDarkMode;
    const root = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle').querySelector('i');

    if (isDarkMode) {
        root.style.setProperty('--background-color', '#2c3e50');
        root.style.setProperty('--text-color', '#ecf0f1');
        themeToggle.className = 'fas fa-sun';
        workspace.setTheme(Blockly.Theme.defineTheme('darkTheme', {
            'base': Blockly.Themes.Classic,
            'componentStyles': {
                'workspaceBackgroundColour': '#34495e',
                'toolboxBackgroundColour': '#2c3e50',
                'toolboxForegroundColour': '#ecf0f1',
                'flyoutBackgroundColour': '#2c3e50',
                'flyoutForegroundColour': '#ecf0f1',
                'flyoutOpacity': 0.9,
                'scrollbarColour': '#ff8c00',
                'insertionMarkerColour': '#fff',
                'insertionMarkerOpacity': 0.3,
                'scrollbarOpacity': 0.4,
                'cursorColour': '#d0d0d0'
            }
        }));
    } else {
        root.style.setProperty('--background-color', '#f8f9fa');
        root.style.setProperty('--text-color', '#2c3e50');
        themeToggle.className = 'fas fa-moon';
        workspace.setTheme(Blockly.Theme.defineTheme('kidTheme', {
            'base': Blockly.Themes.Classic,
            'componentStyles': {
                'workspaceBackgroundColour': '#f8f9fa',
                'toolboxBackgroundColour': '#fff',
                'toolboxForegroundColour': '#494949',
                'flyoutBackgroundColour': '#fff',
                'flyoutForegroundColour': '#494949',
                'flyoutOpacity': 0.9,
                'scrollbarColour': '#ff8c00',
                'insertionMarkerColour': '#fff',
                'insertionMarkerOpacity': 0.3,
                'scrollbarOpacity': 0.4,
                'cursorColour': '#d0d0d0'
            }
        }));
    }
}

// Character movement and animation
function moveCharacter(direction, steps) {
    const character = document.querySelector('.character-preview') || createCharacter();
    const currentPos = {
        x: parseInt(character.style.left) || 100,
        y: parseInt(character.style.top) || 100
    };

    switch(direction) {
        case 'RIGHT':
            character.style.left = (currentPos.x + steps) + 'px';
            break;
        case 'LEFT':
            character.style.left = (currentPos.x - steps) + 'px';
            break;
        case 'UP':
            character.style.top = (currentPos.y - steps) + 'px';
            break;
        case 'DOWN':
            character.style.top = (currentPos.y + steps) + 'px';
            break;
    }

    sounds.jump.play();
    character.style.transform = 'scale(1.2)';
    setTimeout(() => character.style.transform = 'scale(1)', 200);
}

function createCharacter() {
    const character = document.createElement('div');
    character.className = 'character-preview';
    character.style.left = '100px';
    character.style.top = '100px';
    character.style.fontSize = '50px';
    character.textContent = currentCharacter;
    document.body.appendChild(character);
    return character;
}

function characterSay(message) {
    Swal.fire({
        title: currentCharacter,
        text: message,
        background: '#fff',
        showConfirmButton: false,
        timer: 2000,
        customClass: {
            popup: 'animate__animated animate__bounceIn'
        }
    });
}

function characterDance(danceType) {
    const character = document.querySelector('.character-preview') || createCharacter();
    const dances = {
        'HAPPY': 'animate__bounce',
        'COOL': 'animate__shakeY',
        'SILLY': 'animate__wobble'
    };

    character.classList.add('animate__animated', dances[danceType]);
    sounds.collect.play();

    setTimeout(() => {
        character.classList.remove('animate__animated', dances[danceType]);
    }, 1000);
}

function playBackgroundMusic(musicType) {
    if (backgroundMusic) {
        backgroundMusic.stop();
    }

    const musicUrls = {
        'HAPPY': 'https://assets.mixkit.co/active_storage/sfx/123/123-preview.mp3',
        'ADVENTURE': 'https://assets.mixkit.co/active_storage/sfx/456/456-preview.mp3',
        'VICTORY': 'https://assets.mixkit.co/active_storage/sfx/789/789-preview.mp3'
    };

    backgroundMusic = new Howl({
        src: [musicUrls[musicType]],
        loop: true
    });

    backgroundMusic.play();
}

function drawShape(shape, size) {
    const canvas = document.getElementById('animation-canvas');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();

    switch(shape) {
        case 'CIRCLE':
            ctx.arc(centerX, centerY, size, 0, 2 * Math.PI);
            break;
        case 'SQUARE':
            ctx.rect(centerX - size/2, centerY - size/2, size, size);
            break;
        case 'STAR':
            drawStar(ctx, centerX, centerY, 5, size, size/2);
            break;
        case 'HEART':
            drawHeart(ctx, centerX, centerY, size);
            break;
    }

    ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16);
    ctx.fill();
    sounds.collect.play();
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for(let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

function drawHeart(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size/4);
    ctx.bezierCurveTo(cx + size/2, cy - size/2, 
                      cx + size/2, cy + size/4, 
                      cx, cy + size/2);
    ctx.bezierCurveTo(cx - size/2, cy + size/4, 
                      cx - size/2, cy - size/2, 
                      cx, cy - size/4);
}

// Drag and drop helper functions
function playDragSound() {
    sounds.drag = new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'],
        volume: 0.3
    });
    sounds.drag.play();
}

function playDropSound() {
    sounds.drop = new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'],
        volume: 0.3
    });
    sounds.drop.play();
}

function showBlockPreview(block) {
    const workspace = block.workspace;
    const metrics = workspace.getMetrics();
    const scale = workspace.scale;
    
    const preview = document.createElement('div');
    preview.className = 'block-preview animate__animated animate__pulse';
    preview.style.position = 'absolute';
    preview.style.pointerEvents = 'none';
    preview.style.opacity = '0.7';
    preview.style.zIndex = '100';
    document.body.appendChild(preview);
}

function hideDragPreview() {
    const preview = document.querySelector('.block-preview');
    if (preview) {
        preview.remove();
    }
}

function showSuccessEffect(block) {
    const blockSvg = block.getSvgRoot();
    const rect = blockSvg.getBoundingClientRect();
    
    confetti({
        particleCount: 50,
        spread: 30,
        origin: {
            x: rect.left / window.innerWidth,
            y: rect.top / window.innerHeight
        }
    });
}

// New animation functions
function characterJump(height) {
    const character = document.querySelector('.character-preview') || createCharacter();
    const jumpHeights = {
        'SMALL': 50,
        'MEDIUM': 100,
        'HIGH': 200
    };
    
    const jumpHeight = jumpHeights[height];
    character.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    character.style.transform = `translateY(-${jumpHeight}px) scale(1.1)`;
    
    sounds.jump.play();
    
    setTimeout(() => {
        character.style.transform = 'translateY(0) scale(1)';
    }, 500);
}

function characterSpin(speed) {
    const character = document.querySelector('.character-preview') || createCharacter();
    const speeds = {
        'SLOW': 2,
        'NORMAL': 1,
        'FAST': 0.5
    };
    
    const duration = speeds[speed];
    character.style.transition = `transform ${duration}s ease-in-out`;
    character.style.transform = 'rotate(360deg)';
    
    sounds.collect.play();
    
    setTimeout(() => {
        character.style.transform = 'rotate(0deg)';
    }, duration * 1000);
}

function createParticles(effectType) {
    const colors = {
        'SPARKLE': ['#FFD700', '#FFA500', '#FF4500'],
        'BUBBLE': ['#87CEEB', '#00BFFF', '#1E90FF'],
        'STAR': ['#FFD700', '#FFC0CB', '#DDA0DD'],
        'HEART': ['#FF69B4', '#FF1493', '#DC143C']
    };
    
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors[effectType],
        shapes: effectType === 'HEART' ? ['heart'] : ['circle', 'square']
    });
    
    sounds.collect.play();
}

function playMelody(melodyType) {
    const melodies = {
        'HAPPY': [
            { note: 'C4', duration: 0.5 },
            { note: 'E4', duration: 0.5 },
            { note: 'G4', duration: 0.5 },
            { note: 'C5', duration: 1 }
        ],
        'MYSTERY': [
            { note: 'G3', duration: 0.5 },
            { note: 'B3', duration: 0.5 },
            { note: 'D4', duration: 0.5 },
            { note: 'F#4', duration: 1 }
        ],
        'VICTORY': [
            { note: 'C4', duration: 0.25 },
            { note: 'E4', duration: 0.25 },
            { note: 'G4', duration: 0.25 },
            { note: 'C5', duration: 0.5 },
            { note: 'G4', duration: 0.25 },
            { note: 'C5', duration: 1 }
        ]
    };
    
    const melody = melodies[melodyType];
    let time = 0;
    
    melody.forEach(note => {
        setTimeout(() => {
            playNote(note.note, note.duration);
        }, time * 1000);
        time += note.duration;
    });
}

function playNote(note, duration) {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    
    oscillator.connect(gain);
    gain.connect(context.destination);
    
    const frequencies = {
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63,
        'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
        'B4': 493.88, 'C5': 523.25
    };
    
    oscillator.frequency.value = frequencies[note];
    oscillator.type = 'sine';
    
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + duration);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
}

// Update block count and show stats
function updateBlockCount() {
    const blocks = workspace.getAllBlocks();
    const stats = {
        total: blocks.length,
        categories: {}
    };
    
    blocks.forEach(block => {
        const category = block.getCategory();
        stats.categories[category] = (stats.categories[category] || 0) + 1;
    });
    
    // Update UI with stats if needed
}

// Check for achievements based on block usage
function checkAchievements() {
    const blocks = workspace.getAllBlocks();
    
    // Check for first program
    if (blocks.length >= 3 && !achievements.includes('First Program')) {
        unlockAchievement('First Program');
    }
    
    // Check for using multiple categories
    const categories = new Set(blocks.map(block => block.getCategory()));
    if (categories.size >= 3 && !achievements.includes('Category Master')) {
        unlockAchievement('Category Master');
    }
    
    // Check for complex program
    if (blocks.length >= 10 && !achievements.includes('Code Wizard')) {
        unlockAchievement('Code Wizard');
    }
}
