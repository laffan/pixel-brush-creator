let canvas, ctx, previewCanvas, previewCtx;
let pixelSize = 40;
let zoomMin = 2; 
let zoomMax = 20; 
let zoomStart = 4;
let zoomLevel = zoomStart;
let previewColors = {
    black: '#000000',
    white: '#ffffff'
};

let pixelData = [];
let previewData = [];
let canvasSize = { width: 6, height: 6 };

let isDrawing = false;
let isDragging = false;
let startPixel = null;
let currentPixel = null;
let dragStartColor = null;

let holdTimer;
const holdDuration = 1000; // 1 second hold time
let isHoldingForLine = false;



document.addEventListener('DOMContentLoaded', init);

function init() {
    canvas = document.getElementById('pixelCanvas');
    ctx = canvas.getContext('2d');
    previewCanvas = document.getElementById('previewCanvas');
    previewCtx = previewCanvas.getContext('2d');

    canvas.style.touchAction = 'none';


    initializePixelData();
    setupEventListeners();
    resizeCanvas();
    drawCanvas();
    updatePreview();
    document.getElementById('zoomSlider').min = zoomMin;
    document.getElementById('zoomSlider').max = zoomMax;
    document.getElementById('zoomSlider').value = zoomStart;
    updateScaleDisplay();
}

function initializePixelData() {
    pixelData = Array(canvasSize.height).fill().map(() => Array(canvasSize.width).fill(0));
    previewData = Array(canvasSize.height).fill().map(() => Array(canvasSize.width).fill(0));
}

function setupSizeControls() {
    const stepButtons = document.querySelectorAll('.step-btn');
    stepButtons.forEach(button => {
        button.addEventListener('click', handleStepButtonClick);
    });
}

function handleStepButtonClick(e) {
    const input = document.getElementById(e.target.dataset.input);
    const action = e.target.dataset.action;
    const currentValue = parseInt(input.value);
    const step = parseInt(input.step);
    const min = parseInt(input.min);
    const max = parseInt(input.max);

    let newValue;
    if (action === 'increment') {
        newValue = Math.min(currentValue + step, max);
    } else {
        newValue = Math.max(currentValue - step, min);
    }

    input.value = newValue;
    updateCanvasSize();
}


function setupEventListeners() {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', cancelDrawing);


  // New touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });


      setupSizeControls();

    document.getElementById('canvasWidth').addEventListener('change', updateCanvasSize);
    document.getElementById('canvasHeight').addEventListener('change', updateCanvasSize);




    document.getElementById('zoomSlider').addEventListener('input', handleZoomChange);

    document.getElementById('uploadBtn').addEventListener('click', triggerFileInput);
    document.getElementById('downloadBtn').addEventListener('click', downloadCanvas);
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    document.getElementById('invertBtn').addEventListener('click', invertCanvas);

    document.getElementById('blackColorPicker').addEventListener('change', updatePreviewColors);
    document.getElementById('whiteColorPicker').addEventListener('change', updatePreviewColors);

    window.addEventListener('resize', resizeCanvas);
}


function resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate the size of the central tile (1/2 of the smaller dimension)
    const centralTileSize = Math.floor(Math.min(containerWidth, containerHeight) / 2);
    
    // Calculate the pixel size based on the central tile and canvas size
    pixelSize = Math.floor(centralTileSize / Math.max(canvasSize.width, canvasSize.height));
    
    // Calculate the actual size of the central tile
    const tileWidth = canvasSize.width * pixelSize;
    const tileHeight = canvasSize.height * pixelSize;
    
    // Set the canvas size to cover the entire container
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // Store the repeatable area information for later use
    canvas.repeatableArea = {
        width: tileWidth,
        height: tileHeight,
        x: (containerWidth - tileWidth) / 2,
        y: (containerHeight - tileHeight) / 2,
        halfWidth: tileWidth / 2,
        halfHeight: tileHeight / 2
    };

    drawCanvas();
    updatePreview();
}

function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const { width, height, x, y } = canvas.repeatableArea;
    
    // Define the areas to draw (central tile and surrounding tiles)
    const areas = [
        { x: x - width, y: y - height },
        { x: x, y: y - height },
        { x: x + width, y: y - height },
        { x: x - width, y: y },
        { x: x, y: y },
        { x: x + width, y: y },
        { x: x - width, y: y + height },
        { x: x, y: y + height },
        { x: x + width, y: y + height }
    ];

    areas.forEach(area => {
        for (let py = 0; py < canvasSize.height; py++) {
            for (let px = 0; px < canvasSize.width; px++) {
                const pixelX = area.x + (px * pixelSize);
                const pixelY = area.y + (py * pixelSize);
                
                if (pixelX >= 0 && pixelX < canvas.width && pixelY >= 0 && pixelY < canvas.height) {
                    ctx.fillStyle = pixelData[py][px] ? '#000000' : '#ffffff';
                    ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
                    
                    ctx.strokeStyle = '#cccccc';
                    ctx.strokeRect(pixelX, pixelY, pixelSize, pixelSize);
                }
            }
        }
    });
    
    // Draw the 2px black border around the central tile
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
}

function drawPixel(x, y) {
    ctx.fillStyle = pixelData[y][x] ? '#000000' : '#ffffff';
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    
    if (previewData[y][x]) {
        ctx.fillStyle = pixelData[y][x] ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
    
    ctx.strokeStyle = '#cccccc';
    ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getPixelCoords(e);
    startPixel = coords;
    currentPixel = coords;
    dragStartColor = pixelData[coords.y][coords.x];

    // Start the hold timer
    holdTimer = setTimeout(() => {
        isHoldingForLine = true;
        // Clear any existing preview data
        clearPreviewData();
        // Start showing the line preview
        updateDragPreview();
    }, holdDuration);

    // Immediately toggle the first pixel
    togglePixel(coords.x, coords.y);
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    startDrawing(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleMouseMove(mouseEvent);
}

function handleTouchEnd(e) {
    e.preventDefault();
    stopDrawing();
}


function handleMouseMove(e) {
    if (!isDrawing) return;

    const coords = getPixelCoords(e);
    
    if (coords.x !== currentPixel.x || coords.y !== currentPixel.y) {
        currentPixel = coords;

        if (isHoldingForLine) {
            // Update the line preview
            updateDragPreview();
        } else {
            // Paint individual pixels
            togglePixel(coords.x, coords.y);
        }
    }
}



function invertCanvas() {
    for (let y = 0; y < canvasSize.height; y++) {
        for (let x = 0; x < canvasSize.width; x++) {
            pixelData[y][x] = 1 - pixelData[y][x];
        }
    }
    drawCanvas();
    updatePreview();
}


function stopDrawing() {
    clearTimeout(holdTimer);

    if (isHoldingForLine) {
        applyDragPreview();
    }

    isDrawing = false;
    isHoldingForLine = false;
    startPixel = null;
    currentPixel = null;
    dragStartColor = null;
    clearPreviewData();
    drawCanvas();
    updatePreview();
}


function cancelDrawing() {
    clearTimeout(holdTimer);
    isDrawing = false;
    isHoldingForLine = false;
    startPixel = null;
    currentPixel = null;
    dragStartColor = null;
    clearPreviewData();
    drawCanvas();
    updatePreview();
}

function getPixelCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const { width, height, x: areaX, y: areaY } = canvas.repeatableArea;
    
    const mouseX = e.clientX - rect.left - areaX;
    const mouseY = e.clientY - rect.top - areaY;
    
    // Calculate the position relative to the central tile
    const relativeX = (mouseX + width) % width;
    const relativeY = (mouseY + height) % height;
    
    // Convert to pixel coordinates
    const pixelX = Math.floor(relativeX / pixelSize);
    const pixelY = Math.floor(relativeY / pixelSize);
    
    return { x: pixelX, y: pixelY };
}

function updateDragPreview() {
    clearPreviewData();
    const x0 = startPixel.x, y0 = startPixel.y;
    const x1 = currentPixel.x, y1 = currentPixel.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    let x = x0, y = y0;
    while (true) {
        setPreviewPixel(x, y);
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
    drawCanvas();
}


function setPreviewPixel(x, y) {
    if (x < 0 || x >= canvasSize.width || y < 0 || y >= canvasSize.height) return;
    previewData[y][x] = 1;
}

function clearPreviewData() {
    previewData = Array(canvasSize.height).fill().map(() => Array(canvasSize.width).fill(0));
}

function applyDragPreview() {
    const newColor = 1 - dragStartColor;
    for (let y = 0; y < canvasSize.height; y++) {
        for (let x = 0; x < canvasSize.width; x++) {
            if (previewData[y][x]) {
                pixelData[y][x] = newColor;
            }
        }
    }
}

function togglePixel(x, y) {
    if (x < 0 || x >= canvasSize.width || y < 0 || y >= canvasSize.height) return;

    pixelData[y][x] = 1 - pixelData[y][x];
    drawCanvas();
}

function updateCanvasSize() {
    const newWidth = parseInt(document.getElementById('canvasWidth').value);
    const newHeight = parseInt(document.getElementById('canvasHeight').value);

    if (newWidth >= 1 && newWidth <= 15 && newHeight >= 1 && newHeight <= 15) {
        const blackPixels = getBlackPixels();
        const oldCenter = {
            x: Math.floor(canvasSize.width / 2),
            y: Math.floor(canvasSize.height / 2)
        };

        const relativePositions = blackPixels.map(pixel => ({
            x: pixel.x - oldCenter.x,
            y: pixel.y - oldCenter.y
        }));

        canvasSize.width = newWidth;
        canvasSize.height = newHeight;
        initializePixelData();

        const newCenter = {
            x: Math.floor(canvasSize.width / 2),
            y: Math.floor(canvasSize.height / 2)
        };

        relativePositions.forEach(relPos => {
            const newX = newCenter.x + relPos.x;
            const newY = newCenter.y + relPos.y;
            if (newX >= 0 && newX < canvasSize.width && newY >= 0 && newY < canvasSize.height) {
                pixelData[newY][newX] = 1;
            }
        });

        resizeCanvas();
        drawCanvas();
        updatePreview();
    }
}

function getBlackPixels() {
    const blackPixels = [];
    for (let y = 0; y < canvasSize.height; y++) {
        for (let x = 0; x < canvasSize.width; x++) {
            if (pixelData[y][x] === 1) {
                blackPixels.push({ x, y });
            }
        }
    }
    return blackPixels;
}

function handleZoomChange(e) {
    zoomLevel = parseInt(e.target.value);
    updateScaleDisplay();
    updatePreview();
}

function updateScaleDisplay() {
    document.getElementById('scaleDisplay').textContent = `1:${zoomLevel}`;
}

function updatePreviewColors(e) {
    if (e.target.id === 'blackColorPicker') {
        previewColors.black = e.target.value;
    } else {
        previewColors.white = e.target.value;
    }
    updatePreview();
}

function updatePreview() {
    const previewContainer = document.getElementById('previewContainer');
    const containerWidth = previewContainer.clientWidth;
    const containerHeight = previewContainer.clientHeight;

    const scaledWidth = Math.floor(canvasSize.width * zoomLevel);
    const scaledHeight = Math.floor(canvasSize.height * zoomLevel);

    previewCanvas.width = containerWidth;
    previewCanvas.height = containerHeight;

    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = scaledWidth;
    patternCanvas.height = scaledHeight;
    const patternCtx = patternCanvas.getContext('2d');
    patternCtx.imageSmoothingEnabled = false;

    for (let y = 0; y < canvasSize.height; y++) {
        for (let x = 0; x < canvasSize.width; x++) {
            patternCtx.fillStyle = pixelData[y][x] ? previewColors.black : previewColors.white;
            patternCtx.fillRect(
                x * zoomLevel, 
                y * zoomLevel, 
                zoomLevel, 
                zoomLevel
            );
        }
    }

    const pattern = previewCtx.createPattern(patternCanvas, 'repeat');
    previewCtx.fillStyle = pattern;
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
}

function triggerFileInput() {
    document.getElementById('fileInput').click();
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                if (img.width <= 15 && img.height <= 15) {
                    canvasSize.width = img.width;
                    canvasSize.height = img.height;
                    initializePixelData();
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(img, 0, 0);

                    for (let y = 0; y < canvasSize.height; y++) {
                        for (let x = 0; x < canvasSize.width; x++) {
                            const imageData = tempCtx.getImageData(x, y, 1, 1);
                            pixelData[y][x] = imageData.data[0] < 128 ? 1 : 0;
                        }
                    }

                    resizeCanvas();
                    drawCanvas();
                    updatePreview();
                    document.getElementById('canvasWidth').value = canvasSize.width;
                    document.getElementById('canvasHeight').value = canvasSize.height;
                } else {
                    alert('Image dimensions must be 15x15 or smaller.');
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function downloadCanvas() {
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = canvasSize.width;
    downloadCanvas.height = canvasSize.height;
    const downloadCtx = downloadCanvas.getContext('2d');

    for (let y = 0; y < canvasSize.height; y++) {
        for (let x = 0; x < canvasSize.width; x++) {
            downloadCtx.fillStyle = pixelData[y][x] ? '#000000' : '#ffffff';
            downloadCtx.fillRect(x, y, 1, 1);
        }
    }

    const link = document.createElement('a');
    link.download = 'pixel-brush.png';
    link.href = downloadCanvas.toDataURL();
    link.click();
}