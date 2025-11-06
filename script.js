document.addEventListener('DOMContentLoaded', () => {

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

    let gameActive = false; let score = 0; let timeLeft = 30;
    let gameInterval, candleInterval; let candles = [];
    
    let endGameScene = {
        active: false, showWinCake: false, showLoseCake: false, faceData: null
    };

    const hatImage = new Image(); const candleImages = [new Image(), new Image()];
    const cakeWinImage = new Image(); const cakeLoseImage = new Image();

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
    // VÒNG LẶP GAME (SỬA LẠI THỨ TỰ VẼ)
    // ==========================================================
    async function gameLoop() {
        if (video.paused || video.ended) { requestAnimationFrame(gameLoop); return; }
        if (canvasElement.width !== video.videoWidth) {
            canvasElement.width = video.videoWidth; canvasElement.height = video.videoHeight;
        }
        
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
        const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
        
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        // Luôn vẽ khuôn mặt và nón trước
        if (detections && detections.length > 0) {
            const face = detections[0];
            endGameScene.faceData = face; // Lưu dữ liệu để dùng sau
            const mouthCenter = getMouthCenter(face.landmarks);
            drawFaceElements(face.detection.box, mouthCenter);
        }

        // Logic game chỉ chạy khi đang active
        if (gameActive) {
            if (detections && detections.length > 0) {
                const mouthCenter = getMouthCenter(detections[0].landmarks);
                handleCollisions(mouthCenter);
            }
            // --- SỬA LỖI: Vẽ nến Ở ĐÂY để chúng hiện trên cùng ---
            drawCandles(); 
        }

        // Vẽ kịch bản cuối game nếu đang hoạt động
        if (endGameScene.active) {
            drawEndGameScene();
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    // ==========================================================
    // SỬA LẠI LOGIC ĐIỀU KHIỂN BẰNG MIỆNG
    // ==========================================================
    function getMouthCenter(landmarks) {
        const topLip = landmarks.positions[62];
        const bottomLip = landmarks.positions[66];
        return { x: (topLip.x + bottomLip.x) / 2, y: (topLip.y + bottomLip.y) / 2 };
    }
    
    function drawFaceElements(box, mouthCenter) {
        const flippedX = canvasElement.width - box.x - box.width;
        const hatWidth = box.width * 1.5; const hatHeight = hatImage.height * (hatWidth / hatImage.width);
        const hatX = flippedX - (hatWidth - box.width) / 2; const hatY = box.y - hatHeight * 0.9;
        canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
        
        // Chấm đỏ giờ sẽ ở giữa miệng
        const flippedMouthX = canvasElement.width - mouthCenter.x;
        canvasCtx.beginPath();
        canvasCtx.arc(flippedMouthX, mouthCenter.y, 5, 0, 2 * Math.PI);
        canvasCtx.fillStyle = 'red';
        canvasCtx.fill();
    }
    
    function drawCandles() { candles.forEach(c => canvasCtx.drawImage(c.image, c.x, c.y, c.width, c.height)); }
    
    function handleCollisions(mouthCenter) {
        candles.forEach((candle, index) => {
            const flippedMouthX = canvasElement.width - mouthCenter.x;
            if (flippedMouthX > candle.x && flippedMouthX < candle.x + candle.width &&
                mouthCenter.y > candle.y && mouthCenter.y < candle.y + candle.height) {
                candles.splice(index, 1); score++; scoreElement.innerText = score;
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
            const cakeLoseWidth = box.width * 1.5;
            const cakeLoseHeight = cakeLoseImage.height * (cakeLoseWidth / cakeLoseImage.width);
            const cakeLoseX = flippedX + (box.width / 2) - (cakeLoseWidth / 2);
            const cakeLoseY = box.y + (box.height / 2) - (cakeLoseHeight / 2);
            canvasCtx.globalAlpha = 0.7;
            canvasCtx.drawImage(cakeLoseImage, cakeLoseX, cakeLoseY, cakeLoseWidth, cakeLoseHeight);
            canvasCtx.globalAlpha = 1.0;
        }
    }

    function spawnCandle() {
        if (candles.length > 2) { candles.shift(); }
        const size = 80; let newCandle, isOverlapping; let maxTries = 10;
        do {
            isOverlapping = false;
            const x = Math.random() * (canvasElement.width - size - 100) + 50;
            const y = Math.random() * (canvasElement.height - size - 100) + 50;
            newCandle = { x, y, width: size, height: size };
            for (const c of candles) { if (Math.hypot(newCandle.x - c.x, newCandle.y - c.y) < size * 1.5) { isOverlapping = true; break; } }
            maxTries--;
        } while (isOverlapping && maxTries > 0);
        if (!isOverlapping) {
             newCandle.image = candleImages[Math.floor(Math.random() * candleImages.length)];
             candles.push(newCandle);
        }
    }
    
    function startGame() {
        score = 0; timeLeft = 30; candles = [];
        endGameScene.active = false;
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

        endGameScene.active = true;
        cheerSound.play();
        endGameScene.showWinCake = true;
        
	// ==========================================================
        // KÍCH HOẠT PHÁO HOA LIÊN TỤC
        // ==========================================================
        confettiInterval = setInterval(() => {
            // Bắn từ góc dưới bên trái
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 1 }
            });
            // Bắn từ góc dưới bên phải
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 1 }
            });
        }, 400); // Cứ 400ms bắn một lần

        // ==========================================================
        // SỬA LẠI THỜI GIAN HIỂN THỊ BÁNH KEM
        // ==========================================================
        setTimeout(() => {
            endGameScene.showWinCake = false;
            splatSound.play();
            endGameScene.showLoseCake = true;
            
            setTimeout(() => {
                endGameScene.showLoseCake = false;
                endGameScene.active = false;
            }, 6000); // Bánh thua tồn tại 6 giây
        }, 6000); // Bánh thắng tồn tại 6 giây
    }
    
    startButton.addEventListener("click", startGame);
});