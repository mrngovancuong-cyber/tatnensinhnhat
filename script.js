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

// --- BIẾN TOÀN CỤC ---
let gameActive = false;
let score = 0;
let timeLeft = 60;
let gameInterval, candleInterval;
let candles = [];
let faceapiLoaded = false;
let imagesLoaded = false;
let detections = [];

const hatImage = new Image();
const candleImages = [new Image(), new Image()];

// ==========================================================
// BƯỚC 1: HÀM TẢI TÀI SẢN (ASSETS) ĐÁNG TIN CẬY
// ==========================================================
async function loadAssets() {
    loadingElement.innerText = "Đang tải tài nguyên...";
    
    // Tạo một promise để tải các mô hình AI
    const modelPromise = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models')
    ]);

    // Tạo một promise cho mỗi hình ảnh
    const createImagePromise = (image, src) => {
        return new Promise((resolve, reject) => {
            image.src = src;
            image.crossOrigin = "Anonymous";
            image.onload = resolve;
            image.onerror = reject;
        });
    };

    const hatPromise = createImagePromise(hatImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png');
    const candle1Promise = createImagePromise(candleImages[0], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/candleb1.png');
    const candle2Promise = createImagePromise(candleImages[1], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/candelb2.png');
    
    // Đợi TẤT CẢ mọi thứ tải xong
    await Promise.all([modelPromise, hatPromise, candle1Promise, candle2Promise]);
    
    console.log("SUCCESS: All models and images are loaded and ready to be drawn!");
}

// ==========================================================
// BƯỚC 2: HÀM KHỞI TẠO CHÍNH
// ==========================================================
async function initialize() {
    try {
        await loadAssets(); // Đợi tài sản tải xong
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            loadingElement.classList.add("hidden");
            startButton.disabled = false;
            video.play();
            // Bắt đầu vòng lặp chính ngay lập tức
            requestAnimationFrame(gameLoop);
        };
    } catch (error) {
        console.error("Initialization Failed:", error);
        loadingElement.innerText = "Tải tài nguyên thất bại. Vui lòng F5.";
    }
}
initialize();

// ==========================================================
// BƯỚC 3: VÒNG LẶP GAME ĐÃ ĐƯỢC CẢI TIẾN
// ==========================================================
async function gameLoop() {
    if (video.paused || video.ended) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }
    
    // Xóa toàn bộ canvas ở mỗi khung hình
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // AI nhận diện luôn chạy trong nền
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
    detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
    
    // Phần logic và vẽ của game CHỈ chạy khi game đang hoạt động
    if (gameActive) {
        if (detections && detections.length > 0) {
            const noseTip = detections[0].landmarks.positions[30]; 
            handleCollisions(noseTip);
        }
        drawCandles();
    }
    
    // Phần vẽ khuôn mặt luôn chạy để người chơi thấy mình
    if (detections && detections.length > 0) {
        const face = detections[0];
        drawFaceElements(face.detection.box, face.landmarks.positions[30]);
    }
    
    // Lặp lại
    requestAnimationFrame(gameLoop);
}


// --- CÁC HÀM VẼ VÀ LOGIC KHÔNG THAY ĐỔI NHIỀU ---
function drawFaceElements(box, noseTip) {
    const flippedX = canvasElement.width - box.x - box.width;
    canvasCtx.strokeStyle = '#00FF00';
    canvasCtx.lineWidth = 4;
    canvasCtx.strokeRect(flippedX, box.y, box.width, box.height);
    const hatWidth = box.width * 1.5;
    const hatHeight = hatImage.height * (hatWidth / hatImage.width);
    const hatX = flippedX - (hatWidth - box.width) / 2;
    const hatY = box.y - hatHeight * 0.9;
    canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
    const flippedNoseX = canvasElement.width - noseTip.x;
    canvasCtx.beginPath();
    canvasCtx.arc(flippedNoseX, noseTip.y, 5, 0, 2 * Math.PI);
    canvasCtx.fillStyle = 'red';
    canvasCtx.fill();
}

function drawCandles() {
    candles.forEach(candle => {
        canvasCtx.drawImage(candle.image, candle.x, candle.y, candle.width, candle.height);
    });
}

function handleCollisions(noseTip) {
    candles.forEach((candle, index) => {
        const flippedNoseX = canvasElement.width - noseTip.x;
        if (flippedNoseX > candle.x && flippedNoseX < candle.x + candle.width &&
            noseTip.y > candle.y && noseTip.y < candle.y + candle.height) {
            candles.splice(index, 1);
            score++;
            scoreElement.innerText = score;
        }
    });
}

// --- CÁC HÀM QUẢN LÝ GAME KHÔNG THAY ĐỔI ---
function spawnCandle() {
    if (candles.length > 2) { candles.shift(); }
    const size = 80;
    const x = Math.random() * (canvasElement.width - size - 100) + 50;
    const y = Math.random() * (canvasElement.height - size - 100) + 50;
    const randomImage = candleImages[Math.floor(Math.random() * candleImages.length)];
    candles.push({ x, y, width: size, height: size, image: randomImage });
}

function startGame() {
    score = 0; timeLeft = 60; candles = [];
    scoreElement.innerText = score; timerElement.innerText = timeLeft;
    gameActive = true;
    startButton.style.display = 'none';
    finalMessageElement.classList.add('hidden');
    gameInfoElement.style.display = 'flex';
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