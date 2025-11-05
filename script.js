// Import các thư viện cần thiết từ MediaPipe
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/vision_bundle.mjs";

// --- LẤY CÁC PHẦN TỬ DOM ---
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");

// UI Game
const gameInfoElement = document.getElementById("game-info");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const finalMessageElement = document.getElementById("final-message");
const finalScoreElement = document.getElementById("final-score");

// --- TẢI HÌNH ẢNH ---
const hatImage = new Image();
hatImage.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png';
hatImage.crossOrigin = "Anonymous";

// ==========================================================
// THAY ĐỔI: TẢI CẢ 2 HÌNH NẾN VÀO MỘT MẢNG
// ==========================================================
const candleImages = [];
const candleImage1 = new Image();
candleImage1.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/candleb1.png';
candleImage1.crossOrigin = "Anonymous";
const candleImage2 = new Image();
candleImage2.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/candelb2.png';
candleImage2.crossOrigin = "Anonymous";
candleImages.push(candleImage1, candleImage2);
// ==========================================================

// --- BIẾN TRẠNG THÁI GAME ---
let faceLandmarker, drawingUtils;
let lastFaceResult = null;
let gameActive = false;
let score = 0;
let timeLeft = 60;
let gameInterval, candleInterval;
let candles = [];

// KHỞI TẠO MÔ HÌNH AI FACE LANDMARKER
async function initializeAI() {
    loadingElement.innerText = "Đang tải mô hình AI nhận diện...";
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
    drawingUtils = new DrawingUtils(canvasCtx);

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, delegate: "CPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
    });
    
    // THAY ĐỔI: Đợi tất cả các ảnh được tải xong
    const imagePromises = [hatImage.decode()];
    candleImages.forEach(img => imagePromises.push(img.decode()));
    await Promise.all(imagePromises);

    console.log("SUCCESS: AI model and all images are ready!");
}

// HÀM CHÍNH KHỞI ĐỘNG MỌI THỨ
async function main() {
    try {
        await initializeAI();
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.addEventListener("loadeddata", () => {
            loadingElement.classList.add("hidden");
            startButton.disabled = false;
            window.requestAnimationFrame(gameLoop);
        });
    } catch (error) {
        console.error("LỖI KHỞI ĐỘNG:", error);
        loadingElement.innerText = "Lỗi! Vui lòng tải lại trang và cấp quyền camera.";
    }
}

main();

// VÒNG LẶP GAME CHÍNH
let lastVideoTime = -1;
function gameLoop() {
    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        faceLandmarker.detectForVideo(video, performance.now(), (result) => {
            lastFaceResult = result;
        });
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    if (gameActive) {
        handleBlowInteraction();
    }
    drawEverything();
    
    window.requestAnimationFrame(gameLoop);
}

// CÁC HÀM LOGIC VÀ VẼ
function drawEverything() {
    if (lastFaceResult && lastFaceResult.faceLandmarks.length > 0) {
        drawHat(lastFaceResult.faceLandmarks[0]);
    }
    // THAY ĐỔI: Vẽ đúng hình ảnh cho mỗi ngọn nến
    candles.forEach(candle => {
        canvasCtx.drawImage(candle.image, candle.x, candle.y, candle.width, candle.height);
    });
}

function drawHat(landmarks) {
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const point of landmarks) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    }
    const faceWidth = (maxX - minX) * canvasElement.width;
    const faceCenterX = (minX + (maxX - minX) / 2) * canvasElement.width;
    const hatWidth = faceWidth * 1.5;
    const hatHeight = hatImage.height * (hatWidth / hatImage.width);
    const hatX = canvasElement.width - faceCenterX - (hatWidth / 2);
    const hatY = minY * canvasElement.height - hatHeight * 0.9;
    canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
}

// LOGIC THỔI NẾN
function handleBlowInteraction() {
    if (!lastFaceResult || lastFaceResult.faceLandmarks.length === 0) return;
    
    const landmarks = lastFaceResult.faceLandmarks[0];
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const point of landmarks) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    }
    const faceBox = {
        x: canvasElement.width - (maxX * canvasElement.width),
        y: minY * canvasElement.height,
        width: (maxX - minX) * canvasElement.width,
        height: (maxY - minY) * canvasElement.height
    };
    
    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    const mouthOpenRatio = Math.abs(topLip.y - bottomLip.y);
    const BLOW_THRESHOLD = 0.04; 
    const isBlowing = mouthOpenRatio > BLOW_THRESHOLD;
    
    candles.forEach((candle, index) => {
        if (isColliding(faceBox, candle) && isBlowing) {
            candles.splice(index, 1);
            score++;
            scoreElement.innerText = score;
        }
    });
}

function isColliding(rect1, rect2) {
    const padding = 30;
    return (
        rect1.x < rect2.x + rect2.width + padding &&
        rect1.x + rect1.width > rect2.x - padding &&
        rect1.y < rect2.y + rect2.height + padding &&
        rect1.y + rect1.height > rect2.y - padding
    );
}

// CÁC HÀM QUẢN LÝ TRẠNG THÁI GAME
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
    }, 1200);
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

function spawnCandle() {
    if (candles.length > 5) candles.shift();
    const size = 80;
    const x = Math.random() * (canvasElement.width - size - 100) + 50;
    const y = Math.random() * (canvasElement.height - size - 100) + 50;
    
    // ==========================================================
    // THAY ĐỔI: CHỌN MỘT HÌNH NẾN NGẪU NHIÊN
    // ==========================================================
    const randomImage = candleImages[Math.floor(Math.random() * candleImages.length)];
    candles.push({ x, y, width: size, height: size, image: randomImage });
}

startButton.addEventListener("click", startGame);