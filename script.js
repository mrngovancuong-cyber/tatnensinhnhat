import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@medipe/tasks-vision@0.10.9/vision_bundle.mjs";

// --- DOM ELEMENTS ---
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");
const gameInfoElement = document.getElementById("game-info");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const finalMessageElement = document.getElementById("final-message");
const finalScoreElement = document.getElementById("final-score");

// --- IMAGE ASSETS ---
const hatImage = new Image();
hatImage.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png';
hatImage.crossOrigin = "Anonymous";
const candleImages = [new Image(), new Image()];
candleImages[0].src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/candleb1.png';
candleImages[0].crossOrigin = "Anonymous";
candleImages[1].src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/candelb2.png';
candleImages[1].crossOrigin = "Anonymous";

// --- GAME STATE & AI ---
let faceLandmarker;
let lastFaceResult = null;
let gameActive = false;
let score = 0;
let timeLeft = 60;
let gameInterval, candleInterval;
let candles = [];

// ==========================================================
// INITIALIZATION
// ==========================================================
async function initialize() {
    loadingElement.innerText = "Đang tải mô hình AI...";
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@medipe/tasks-vision@0.10.9/wasm");

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `https://storage.googleapis.com/medipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, delegate: "CPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        // ==========================================================
        // THAY ĐỔI QUAN TRỌNG: YÊU CẦU AI "DỄ TÍNH" HƠN
        // ==========================================================
        minFaceDetectionConfidence: 0.5,
    });
    
    const imagePromises = [hatImage.decode(), ...candleImages.map(img => img.decode())];
    await Promise.all(imagePromises);
    console.log("SUCCESS: AI model and all images are ready!");

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => {
        loadingElement.classList.add("hidden");
        startButton.disabled = false;
        window.requestAnimationFrame(gameLoop);
    });
}
initialize().catch(err => {
    console.error("Initialization failed:", err);
    loadingElement.innerText = "Lỗi! Vui lòng tải lại trang.";
});

// ==========================================================
// GAME LOOP
// ==========================================================
let lastVideoTime = -1;
function gameLoop() {
    if (video.readyState < 2) {
        window.requestAnimationFrame(gameLoop);
        return;
    }

    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        faceLandmarker.detectForVideo(video, performance.now(), (result) => {
            lastFaceResult = result;
            // Dòng chẩn đoán: In kết quả ra để xem
            // console.log(result.faceLandmarks); 
        });
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (lastFaceResult && lastFaceResult.faceLandmarks.length > 0) {
        const landmarks = lastFaceResult.faceLandmarks[0];
        const { faceBox, isBlowing } = analyzeFace(landmarks);
        
        drawHat(faceBox);
        drawFaceBox(faceBox, isBlowing);
        
        if (gameActive) {
            handleCollisions(faceBox, isBlowing);
        }
    }
    
    drawCandles();
    window.requestAnimationFrame(gameLoop);
}

// ==========================================================
// ANALYSIS AND DRAWING FUNCTIONS
// ==========================================================
function analyzeFace(landmarks) {
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const point of landmarks) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }
    
    const faceBox = {
        x: minX * canvasElement.width,
        y: minY * canvasElement.height,
        width: (maxX - minX) * canvasElement.width,
        height: (maxY - minY) * canvasElement.height
    };

    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    const mouthOpenRatio = Math.abs(topLip.y - bottomLip.y);
    const BLOW_THRESHOLD = 0.035; 
    const isBlowing = mouthOpenRatio > BLOW_THRESHOLD;

    return { faceBox, isBlowing };
}

function drawHat(faceBox) {
    const flippedX = canvasElement.width - faceBox.x - faceBox.width;
    const hatWidth = faceBox.width * 1.5;
    const hatHeight = hatImage.height * (hatWidth / hatImage.width);
    const hatX = flippedX - (hatWidth - faceBox.width) / 2;
    const hatY = faceBox.y - hatHeight * 0.9;
    canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
}

function drawFaceBox(faceBox, isBlowing) {
    const flippedX = canvasElement.width - faceBox.x - faceBox.width;
    canvasCtx.strokeStyle = isBlowing ? '#FF4500' : '#00FF00';
    canvasCtx.lineWidth = 4;
    canvasCtx.strokeRect(flippedX, faceBox.y, faceBox.width, faceBox.height);
}

function drawCandles() {
    candles.forEach(candle => {
        canvasCtx.drawImage(candle.image, candle.x, candle.y, candle.width, candle.height);
    });
}

// ==========================================================
// GAME LOGIC
// ==========================================================
function handleCollisions(faceBox, isBlowing) {
    candles.forEach((candle, index) => {
        if (isColliding(faceBox, candle) && isBlowing) {
            candles.splice(index, 1);
            score++;
            scoreElement.innerText = score;
        }
    });
}

function isColliding(rect1, rect2) {
    const padding = 20;
    return (
        rect1.x < rect2.x + rect2.width + padding &&
        rect1.x + rect1.width > rect2.x - padding &&
        rect1.y < rect2.y + rect2.height + padding &&
        rect1.y + rect1.height > rect2.y - padding
    );
}

function spawnCandle() {
    if (candles.length > 2) {
        candles.shift();
    }
    const size = 80;
    const x = Math.random() * (canvasElement.width - size - 100) + 50;
    const y = Math.random() * (canvasElement.height - size - 100) + 50;
    const randomImage = candleImages[Math.floor(Math.random() * candleImages.length)];
    candles.push({ x, y, width: size, height: size, image: randomImage });
}

// ==========================================================
// GAME STATE MANAGEMENT
// ==========================================================
function startGame() {
    score = 0; timeLeft = 60; candles = [];
    scoreElement.innerText = score; timerElement.innerText = timeLeft;
    gameActive = true;
    startButton.style.display = 'none';
    finalMessageElement.classList.add('hidden');
    gameInfoElement.style.display = 'flex';
    video.play();
    gameInterval = setInterval(() => {
        timeLeft--;
        timerElement.innerText = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
    candleInterval = setInterval(() => {
        if (gameActive) spawnCandle();
    }, 2000);
}

function endGame() {
    gameActive = false;
    clearInterval(gameInterval);
    clearInterval(candleInterval);
    finalScoreElement.innerText = score;
    finalMessageElement.classList.remove('hidden');
    startButton.style.display = 'block';
    candles = [];
}

startButton.addEventListener("click", startGame);