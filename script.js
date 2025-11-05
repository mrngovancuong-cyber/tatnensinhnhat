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

const hatImage = new Image();
hatImage.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png';
hatImage.crossOrigin = "Anonymous";
const candleImages = [new Image(), new Image()];
candleImages[0].src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/candleb1.png';
candleImages[0].crossOrigin = "Anonymous";
candleImages[1].src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/candelb2.png';
candleImages[1].crossOrigin = "Anonymous";

let gameActive = false;
let score = 0;
let timeLeft = 60;
let gameInterval, candleInterval;
let candles = [];

// KHỞI TẠO VÀ TẢI MÔ HÌNH CỦA FACE-API.JS
async function initialize() {
    loadingElement.innerText = "Đang tải mô hình AI và hình ảnh...";
    
    // Tải đồng thời 2 mô hình AI
    const modelPromises = [
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models')
    ];

    // ==========================================================
    // THAY ĐỔI QUAN TRỌNG: TẠO PROMISE CHO VIỆC TẢI ẢNH
    // ==========================================================
    const imagePromises = [hatImage.decode()];
    candleImages.forEach(img => imagePromises.push(img.decode()));

    // Đợi TẤT CẢ mọi thứ (cả AI và ảnh) tải xong
    await Promise.all([...modelPromises, ...imagePromises]);
    
    console.log("SUCCESS: All models and images are loaded!");

    // Lấy camera sau khi mọi thứ đã sẵn sàng
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
    
    await new Promise(resolve => video.onloadedmetadata = resolve);
    
    loadingElement.classList.add("hidden");
    startButton.disabled = false;
    console.log("Application is ready!");
}
initialize();

// VÒNG LẶP GAME CHÍNH VÀ NHẬN DIỆN
async function gameLoop() {
    if (!gameActive) return;

    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }
    
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
    const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();

    if (detections && detections.length > 0) {
        const face = detections[0];
        const landmarks = face.landmarks;
        const box = face.detection.box;
        const noseTip = landmarks.positions[30]; 
        
        handleCollisions(noseTip);
        drawFaceElements(box, noseTip);
    }
    
    drawCandles();
    requestAnimationFrame(gameLoop);
}

// CÁC HÀM VẼ
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

// LOGIC VA CHẠM BẰNG MŨI
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

// CÁC HÀM QUẢN LÝ GAME
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
    video.play();
    
    gameInterval = setInterval(() => {
        timeLeft--;
        timerElement.innerText = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
    
    candleInterval = setInterval(() => {
        if (gameActive) spawnCandle();
    }, 2000);

    requestAnimationFrame(gameLoop);
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