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
    let bodyPixModel = null; // Biến cho mô hình BodyPix

    // Tải tất cả hình ảnh cần thiết
    const hatImage = new Image();
    const candleImages = [new Image(), new Image()];
    const cakeWinImage = new Image();
    const cakeLoseImage = new Image();
    const backgroundImage = new Image(); // Ảnh nền video

    // ==========================================================
    // KHỞI TẠO CHÍNH (THÊM BODYPIX)
    // ==========================================================
    async function run() {
        try {
            startButton.disabled = true;
            loadingElement.innerText = "Đang tải mô hình AI...";
            const modelPromises = [
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                bodyPix.load() // Tải mô hình BodyPix
            ];

            loadingElement.innerText = "Đang tải hình ảnh...";
            const createImagePromise = (image, src) => new Promise((resolve, reject) => {
                image.src = src; image.crossOrigin = "Anonymous";
                image.onload = resolve; image.onerror = reject;
            });
            const imagePromises = [
                createImagePromise(hatImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/birthdayhat.png'),
                createImagePromise(candleImages[0], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/candleb1.png'),
                createImagePromise(candleImages[1], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/candelb2.png'),
                createImagePromise(cakeWinImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/cnadleb3.png'),
                createImagePromise(cakeLoseImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/cake.png'),
                createImagePromise(backgroundImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/b.png')
            ];
            
            // Đợi tất cả mô hình và ảnh tải xong
            const [loadedModels] = await Promise.all([Promise.all(modelPromises), Promise.all(imagePromises)]);
            bodyPixModel = loadedModels[2]; // Gán mô hình bodyPix đã tải
            console.log("SUCCESS: All models and images are loaded!");
            
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
    // VÒNG LẶP GAME (THÊM LOGIC TÁCH NỀN)
    // ==========================================================
    async function gameLoop() {
        if (video.paused || video.ended || !bodyPixModel) {
            requestAnimationFrame(gameLoop); return;
        }
        if (canvasElement.width !== video.videoWidth) {
            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
        }
        
        // --- BƯỚC 3.1: TÁCH NỀN ---
        const segmentation = await bodyPixModel.segmentPerson(video);
        
        // --- BƯỚC 3.2: VẼ LẠI MỌI THỨ THEO LỚP ---
        // Lớp 1: Vẽ nền ảo
        canvasCtx.drawImage(backgroundImage, 0, 0, canvasElement.width, canvasElement.height);
        
        // Lớp 2: Chỉ vẽ người từ video lên trên nền ảo
        const foreground = bodyPix.toMask(segmentation);
        canvasCtx.save();
        canvasCtx.globalCompositeOperation = 'destination-in';
        canvasCtx.drawImage(foreground, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.globalCompositeOperation = 'source-atop';
        canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.restore();

        // --- BƯỚC 3.3: CHẠY LOGIC GAME NHƯ CŨ ---
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
        const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
        
        if (gameActive) {
            if (detections && detections.length > 0) {
                handleCollisions(detections[0].landmarks.positions[30]);
            }
            drawCandles();
        }
        
        if (detections && detections.length > 0) {
            drawFaceElements(detections[0].detection.box, detections[0].landmarks.positions[30]);
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    // (Các hàm còn lại gần như giữ nguyên)
    function drawFaceElements(box, mouthCenter) {
        const flippedX = canvasElement.width - box.x - box.width;
        const hatWidth = box.width * 1.5;
        const hatHeight = hatImage.height * (hatWidth / hatImage.width);
        const hatX = flippedX - (hatWidth - box.width) / 2;
        const hatY = box.y - hatHeight * 0.9;
        canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);

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
        scoreElement.innerText = score; timerElement.innerText = timeLeft;
        gameActive = true;
        startButton.style.display = 'none';
        finalWishContainer.classList.add('hidden');
        gameInfoElement.classList.remove('hidden');
        gameInterval = setInterval(() => {
            timeLeft--;
            timerElement.innerText = timeLeft;
            if (timeLeft <= 0) endGame();
        }, 1000);
        candleInterval = setInterval(() => { if (gameActive) spawnCandle(); }, 2500);
    }
    async function endGame() {
        gameActive = false;
        clearInterval(gameInterval); clearInterval(candleInterval);
        candles = [];
        finalWishScore.innerText = score;
        finalWishContainer.classList.remove('hidden');
        gameInfoElement.classList.add('hidden');
        startButton.style.display = 'none';
        await new Promise(r => setTimeout(r, 100));
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })).withFaceLandmarks();
        if (detections && detections.length > 0) {
            const box = detections[0].detection.box;
            cheerSound.play();
            const cakeWinWidth = box.width * 2;
            const cakeWinHeight = cakeWinImage.height * (cakeWinWidth / cakeWinImage.width);
            const flippedX = canvasElement.width - box.x - box.width;
            const cakeWinX = flippedX + (box.width / 2) - (cakeWinWidth / 2);
            const cakeWinY = box.y + box.height;
            canvasCtx.drawImage(cakeWinImage, cakeWinX, cakeWinY, cakeWinWidth, cakeWinHeight);
            setTimeout(() => {
                splatSound.play();
                const cakeLoseWidth = box.width * 1.2;
                const cakeLoseHeight = cakeLoseImage.height * (cakeLoseWidth / cakeLoseImage.width);
                const cakeLoseX = flippedX + (box.width / 2) - (cakeLoseWidth / 2);
                const cakeLoseY = box.y + (box.height / 2) - (cakeLoseHeight / 2);
                canvasCtx.globalAlpha = 0.7;
                canvasCtx.drawImage(cakeLoseImage, cakeLoseX, cakeLoseY, cakeLoseWidth, cakeLoseHeight);
                canvasCtx.globalAlpha = 1.0;
                setTimeout(() => {}, 3000);
            }, 3000);
        }
    }
    startButton.addEventListener("click", startGame);
});