document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTS & GLOBAL VARIABLES ---
    const video = document.getElementById("webcam");
    const canvasElement = document.getElementById("output_canvas");
    const canvasCtx = canvasElement.getContext("2d");
    const startButton = document.getElementById("startButton");
    const loadingElement = document.getElementById("loading");
    const gameInfoElement = document.getElementById("game-info");
    const scoreElement = document.getElementById("score");
    const timerElement = document.getElementById("timer");
    const finalWishContainer = document.getElementById("final-wish-container");
    const finalWishScore = document.querySelector("#wish-line-2 strong");
    const gameContainer = document.querySelector('.game-container');
    const bgMusic = document.getElementById("bg-music");
    const cheerSound = document.getElementById("cheer-sound");
    const splatSound = document.getElementById("splat-sound");
    const introModal = document.getElementById("intro-modal");
    const readyButton = document.getElementById("readyButton");
    
    let gameActive = false; let score = 0; let timeLeft = 35;
    let gameInterval, candleInterval;
    let confettiInterval = null;
    let candles = [];
    
    let endGameScene = {
        active: false,
        showWinCake: false,
        showLoseCake: false,
        faceData: null
    };

    const hatImage = new Image();
    const candleImages = [new Image(), new Image()];
    const cakeWinImage = new Image();
    const cakeLoseImage = new Image();

    // ==========================================================
    // KHỞI TẠO CHÍNH
    // ==========================================================
    async function run() {
        try {
            startButton.style.display = 'none';
            loadingElement.classList.remove('hidden');

            loadingElement.innerText = "Đang tải mô hình AI...";
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models')
            ]);
            
            loadingElement.innerText = "Đang tải hình ảnh...";
            const createImagePromise = (img, src) => new Promise((res, rej) => {
                img.src = src; img.crossOrigin = "Anonymous";
                img.onload = res; img.onerror = rej;
            });
            await Promise.all([
                createImagePromise(hatImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/birthdayhat.png'),
                createImagePromise(candleImages[0], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/candleb1.png'),
                createImagePromise(candleImages[1], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/candelb2.png'),
                createImagePromise(cakeWinImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/cnadleb3.png'),
                createImagePromise(cakeLoseImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/cake.png'),
            ]);

            loadingElement.innerText = "Đang khởi động camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            await new Promise(resolve => { video.onloadedmetadata = resolve; });
            
            loadingElement.classList.add("hidden");
            startButton.disabled = false;
            startButton.style.display = 'block';
            video.play();
            setTimeout(() => { bgMusic.play().catch(e => {}); }, 1000);
            requestAnimationFrame(gameLoop);
        } catch (error) {
            console.error("Initialization Failed:", error);
            loadingElement.innerText = "Lỗi! Vui lòng tải lại trang.";
        }
    }
    
    readyButton.addEventListener('click', () => {
        introModal.classList.add('hidden');
        run();
    });

    // ==========================================================
    // VÒNG LẶP GAME
    // ==========================================================
    async function gameLoop() {
        if (video.paused || video.ended) { requestAnimationFrame(gameLoop); return; }
        if (canvasElement.width !== video.videoWidth) {
            canvasElement.width = video.videoWidth; canvasElement.height = video.videoHeight;
        }
        
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
        const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
        
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (detections && detections.length > 0) {
            const face = detections[0];
            endGameScene.faceData = face;
            const mouthCenter = getMouthCenter(face.landmarks);
            drawFaceElements(face.detection.box); // Bỏ mouthCenter vì không vẽ chấm đỏ
            if (gameActive) {
                handleCollisions(mouthCenter);
            }
        }
        if (gameActive) {
            drawCandles();
        }
        if (endGameScene.active) {
            drawEndGameScene();
        }
        requestAnimationFrame(gameLoop);
    }
    
    function getMouthCenter(landmarks) {
        const topLip = landmarks.positions[62];
        const bottomLip = landmarks.positions[66];
        return { x: (topLip.x + bottomLip.x) / 2, y: (topLip.y + bottomLip.y) / 2 };
    }
    
    function drawFaceElements(box) {
        const flippedX = canvasElement.width - box.x - box.width;
        const hatWidth = box.width * 1.5;
        const hatHeight = hatImage.height * (hatWidth / hatImage.width);
        const hatX = flippedX - (hatWidth - box.width) / 2;
        const hatY = box.y - hatHeight * 0.9;
        canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
    }
    
    function drawCandles() { candles.forEach(c => canvasCtx.drawImage(c.image, c.x, c.y, c.width, c.height)); }
    
    function handleCollisions(mouthCenter) {
        candles.forEach((candle, index) => {
            const flippedMouthX = canvasElement.width - mouthCenter.x;
            if (flippedMouthX > candle.x && flippedMouthX < candle.x + candle.width &&
                mouthCenter.y > candle.y && mouthCenter.y < candle.y + candle.height) {
                candles.splice(index, 1);
                score++;
                scoreElement.innerText = score;
            }
        });
    }

    function drawEndGameScene() {
        if (!endGameScene.faceData) return;
        const box = endGameScene.faceData.detection.box;
        const flippedX = canvasElement.width - box.x - box.width;
        if (endGameScene.showWinCake) {
            const cakeWinWidth = box.width * 2;
            const cakeWinHeight = cakeWinImage.height * (cakeWinWidth / cakeWinImage.width);
            const cakeWinX = flippedX + (box.width / 2) - (cakeWinWidth / 2);
            const cakeWinY = box.y + box.height;
            canvasCtx.drawImage(cakeWinImage, cakeWinX, cakeWinY, cakeWinWidth, cakeWinHeight);
        }
        if (endGameScene.showLoseCake) {
            const cakeLoseWidth = box.width * 1.7;
            const cakeLoseHeight = cakeLoseImage.height * (cakeLoseWidth / cakeLoseImage.width);
            const cakeLoseX = flippedX + (box.width / 2) - (cakeLoseWidth / 2);
            const cakeLoseY = box.y + (box.height / 2) - (cakeLoseHeight / 2);
            canvasCtx.globalAlpha = 0.7;
            canvasCtx.drawImage(cakeLoseImage, cakeLoseX, cakeLoseY, cakeLoseWidth, cakeLoseHeight);
            canvasCtx.globalAlpha = 1.0;
        }
    }

    function spawnCandle() {
        if (candles.length >= 3) return;
        const size = 80;
        let newCandleData, isOverlapping;
        let maxTries = 10;
        do {
            isOverlapping = false;
            const x = Math.random() * (canvasElement.width - size - 100) + 50;
            const y = Math.random() * (canvasElement.height - size - 100) + 50;
            newCandleData = { x, y, width: size, height: size };
            for (const c of candles) {
                if (Math.hypot(newCandleData.x - c.x, newCandleData.y - c.y) < size * 1.5) {
                    isOverlapping = true; break;
                }
            }
            maxTries--;
        } while (isOverlapping && maxTries > 0);
        if (!isOverlapping) {
            const candleId = Date.now();
            const randomImage = candleImages[Math.floor(Math.random() * candleImages.length)];
            newCandleData.image = randomImage;
            newCandleData.id = candleId;
            candles.push(newCandleData);
            setTimeout(() => {
                const index = candles.findIndex(c => c.id === candleId);
                if (index !== -1) { candles.splice(index, 1); }
            }, 3000);
        }
    }
    
// ==========================================================
// THAY THẾ HÀM CŨ BẰNG HÀM MỚI NÀY
// ==========================================================
function startGame() {
    score = 0; timeLeft = 35; candles = [];
    endGameScene.active = false;
    if (confettiInterval) clearInterval(confettiInterval);

    // Chuyển về bố cục 1 cột (trạng thái chơi game)
    gameContainer.classList.remove('end-state');
    finalWishContainer.classList.add('hidden');

    scoreElement.innerText = score; timerElement.innerText = timeLeft;
    gameActive = true;
    startButton.style.display = 'none';
    gameInfoElement.style.display = 'flex';
    gameInterval = setInterval(() => {
        timeLeft--;
        timerElement.innerText = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
    candleInterval = setInterval(() => { if (gameActive) spawnCandle(); }, 2500);
}

// ==========================================================
// THAY THẾ HÀM CŨ BẰNG HÀM MỚI NÀY
// ==========================================================
async function endGame() {
    gameActive = false;
    clearInterval(gameInterval); clearInterval(candleInterval);
    candles = [];
    finalWishScore.innerText = score;
    
    // Chuyển sang bố cục 2 cột (trạng thái kết thúc)
    gameContainer.classList.add('end-state');
    finalWishContainer.classList.remove('hidden');
    
    gameInfoElement.style.display = 'none';
    startButton.style.display = 'none';

    // Kịch bản bánh kem & pháo hoa
    endGameScene.active = true;
    cheerSound.play();
    endGameScene.showWinCake = true;
    confettiInterval = setInterval(() => {
        confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 1 } });
        confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 1 } });
    }, 400);
    
    setTimeout(() => {
        endGameScene.showWinCake = false;
        splatSound.play();
        endGameScene.showLoseCake = true;
        setTimeout(() => {
            endGameScene.showLoseCake = false;
            endGameScene.active = false;
        }, 5000);
    }, 8000);
}
    
    startButton.addEventListener("click", startGame);
});