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
    const bgMusic = document.getElementById("bg-music");
    const cheerSound = document.getElementById("cheer-sound");
    const splatSound = document.getElementById("splat-sound");

    let gameActive = false;
    let score = 0;
    let timeLeft = 30;
    let gameInterval, candleInterval;
    let candles = [];
    
    // --- BIẾN TRẠNG THÁI MỚI CHO KỊCH BẢN CUỐI GAME ---
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
    // KHỞI TẠO CHÍNH (Không thay đổi)
    // ==========================================================
    async function run() {
        try {
            startButton.disabled = true;
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
            video.play();
            setTimeout(() => { bgMusic.play().catch(e => {}); }, 2000);
            requestAnimationFrame(gameLoop);
        } catch (error) {
            console.error("Initialization Failed:", error);
            loadingElement.innerText = "Lỗi! Vui lòng tải lại trang.";
        }
    }
    run();

    // ==========================================================
    // VÒNG LẶP GAME (SỬA LẠI ĐỂ HỖ TRỢ KỊCH BẢN CUỐI)
    // ==========================================================
    async function gameLoop() {
        if (video.paused || video.ended) { requestAnimationFrame(gameLoop); return; }
        if (canvasElement.width !== video.videoWidth) {
            canvasElement.width = video.videoWidth; canvasElement.height = video.videoHeight;
        }
        
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
        const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
        
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (gameActive) {
            if (detections && detections.length > 0) {
                handleCollisions(detections[0].landmarks.positions[30]);
            }
            drawCandles();
        }
        
        if (detections && detections.length > 0) {
            const face = detections[0];
            // Lưu lại dữ liệu khuôn mặt để dùng trong kịch bản cuối game
            endGameScene.faceData = face;
            drawFaceElements(face.detection.box, face.landmarks.positions[30]);
        }

        // Vẽ kịch bản cuối game nếu đang hoạt động
        if (endGameScene.active) {
            drawEndGameScene();
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    // (Các hàm vẽ và logic game khác giữ nguyên)
    function drawFaceElements(box, mouthCenter) { /* ... */ }
    function drawCandles() { /* ... */ }
    function handleCollisions(mouthCenter) { /* ... */ }
    function spawnCandle() { /* ... */ }

    // ==========================================================
    // HÀM VẼ MỚI CHO KỊCH BẢN CUỐI GAME
    // ==========================================================
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
            const cakeLoseWidth = box.width * 1.2;
            const cakeLoseHeight = cakeLoseImage.height * (cakeLoseWidth / cakeLoseImage.width);
            const cakeLoseX = flippedX + (box.width / 2) - (cakeLoseWidth / 2);
            const cakeLoseY = box.y + (box.height / 2) - (cakeLoseHeight / 2);
            canvasCtx.globalAlpha = 0.7;
            canvasCtx.drawImage(cakeLoseImage, cakeLoseX, cakeLoseY, cakeLoseWidth, cakeLoseHeight);
            canvasCtx.globalAlpha = 1.0;
        }
    }

    // ==========================================================
    // CÁC HÀM QUẢN LÝ GAME (SỬA LẠI START & END)
    // ==========================================================
    function startGame() {
        score = 0; timeLeft = 30; candles = [];
        endGameScene.active = false; // Reset kịch bản cuối
        scoreElement.innerText = score; timerElement.innerText = timeLeft;
        gameActive = true;
        
        startButton.style.display = 'none';
        finalWishContainer.classList.add('hidden');
        gameInfoElement.style.display = 'flex';
        
        gameInterval = setInterval(() => {
            timeLeft--;
            timerElement.innerText = timeLeft;
            if (timeLeft <= 0) endGame();
        }, 1000);
        
        candleInterval = setInterval(() => { if (gameActive) spawnCandle(); }, 2500);
    }

    function endGame() {
        gameActive = false;
        clearInterval(gameInterval); clearInterval(candleInterval);
        candles = [];
        
        finalWishScore.innerText = score;
        finalWishContainer.classList.remove('hidden');
        
        gameInfoElement.style.display = 'none';
        startButton.style.display = 'none';

        // --- BẮT ĐẦU KỊCH BẢN CUỐI GAME ---
        endGameScene.active = true;

        // Hiệu ứng 1: Bánh thắng & Vỗ tay
        cheerSound.play();
        endGameScene.showWinCake = true;
        
        setTimeout(() => {
            // Hiệu ứng 2: Bánh thua & Âm thanh ụp
            endGameScene.showWinCake = false; // Ẩn bánh thắng
            splatSound.play();
            endGameScene.showLoseCake = true;
            
            setTimeout(() => {
                // Kết thúc kịch bản
                endGameScene.showLoseCake = false;
                endGameScene.active = false;
                // Có thể hiện lại nút Bắt Đầu ở đây nếu muốn chơi lại
                // startButton.style.display = 'block';
            }, 3000); // Bánh thua tồn tại 3 giây
        }, 3000); // Bánh thắng tồn tại 3 giây
    }
    
    startButton.addEventListener("click", startGame);

    // Dán lại các hàm không thay đổi để cho chắc chắn
    function getMouthCenter(landmarks) { const topLip = landmarks.positions[62]; const bottomLip = landmarks.positions[66]; return { x: (topLip.x + bottomLip.x) / 2, y: (topLip.y + bottomLip.y) / 2 }; }
    function drawFaceElements(box, mouthCenter) { const flippedX = canvasElement.width - box.x - box.width; const hatWidth = box.width * 1.5; const hatHeight = hatImage.height * (hatWidth / hatImage.width); const hatX = flippedX - (hatWidth - box.width) / 2; const hatY = box.y - hatHeight * 0.9; canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight); const flippedMouthX = canvasElement.width - mouthCenter.x; canvasCtx.beginPath(); canvasCtx.arc(flippedMouthX, mouthCenter.y, 5, 0, 2 * Math.PI); canvasCtx.fillStyle = 'red'; canvasCtx.fill(); }
    function handleCollisions(mouthCenter) { candles.forEach((candle, index) => { const flippedMouthX = canvasElement.width - mouthCenter.x; if (flippedMouthX > candle.x && flippedMouthX < candle.x + candle.width && mouthCenter.y > candle.y && mouthCenter.y < candle.y + candle.height) { candles.splice(index, 1); score++; scoreElement.innerText = score; } }); }
    function spawnCandle() { if (candles.length > 2) { candles.shift(); } const size = 80; let newCandle, isOverlapping; let maxTries = 10; do { isOverlapping = false; const x = Math.random() * (canvasElement.width - size - 100) + 50; const y = Math.random() * (canvasElement.height - size - 100) + 50; newCandle = { x, y, width: size, height: size }; for (const existingCandle of candles) { if (Math.hypot(newCandle.x - existingCandle.x, newCandle.y - existingCandle.y) < size * 1.5) { isOverlapping = true; break; } } maxTries--; } while (isOverlapping && maxTries > 0); if (!isOverlapping) { const randomImage = candleImages[Math.floor(Math.random() * candleImages.length)]; newCandle.image = randomImage; candles.push(newCandle); } }

});