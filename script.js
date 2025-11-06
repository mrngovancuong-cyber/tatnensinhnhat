// Chờ cho toàn bộ trang được tải xong rồi mới chạy code
document.addEventListener('DOMContentLoaded', () => {

    // --- LẤY CÁC PHẦN TỬ DOM ---
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

    const hatImage = new Image();
    const candleImages = [new Image(), new Image()];

    // ==========================================================
    // KHỞI TẠO CHÍNH (ĐÃ ĐƯỢC XÁC MINH)
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
            const createImagePromise = (image, src) => new Promise((resolve, reject) => {
                image.src = src; image.crossOrigin = "Anonymous";
                image.onload = resolve; image.onerror = reject;
            });
            await Promise.all([
                createImagePromise(hatImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/birthdayhat.png'),
                createImagePromise(candleImages[0], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/candleb1.png'),
                createImagePromise(candleImages[1], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/candelb2.png')
            ]);

            loadingElement.innerText = "Đang khởi động camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            await new Promise(resolve => { video.onloadedmetadata = resolve; });
            
            loadingElement.classList.add("hidden");
            startButton.disabled = false;
            video.play();
            requestAnimationFrame(gameLoop);
        } catch (error) {
            console.error("Initialization Failed:", error);
            loadingElement.innerText = "Lỗi! Vui lòng tải lại trang.";
        }
    }
    run();

    // ==========================================================
    // VÒNG LẶP GAME
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
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
        const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (gameActive) {
            if (detections && detections.length > 0) {
                const mouthCenter = getMouthCenter(detections[0].landmarks);
                handleCollisions(mouthCenter);
            }
            drawCandles();
        }
        
        if (detections && detections.length > 0) {
            const face = detections[0];
            const mouthCenter = getMouthCenter(face.landmarks);
            drawFaceElements(face.detection.box, mouthCenter);
        }
        requestAnimationFrame(gameLoop);
    }
    
    // ==========================================================
    // MỤC TIÊU 1.1: Lấy điểm giữa miệng
    // ==========================================================
    function getMouthCenter(landmarks) {
        const topLip = landmarks.positions[62]; // Điểm giữa môi trên
        const bottomLip = landmarks.positions[66]; // Điểm giữa môi dưới
        return {
            x: (topLip.x + bottomLip.x) / 2,
            y: (topLip.y + bottomLip.y) / 2
        };
    }

    // --- CÁC HÀM VẼ VÀ LOGIC ---
    function drawFaceElements(box, mouthCenter) {
        const flippedX = canvasElement.width - box.x - box.width;
        // MỤC TIÊU 1.3: Bỏ khung xanh (đã xóa dòng vẽ)
        
        const hatWidth = box.width * 1.5;
        const hatHeight = hatImage.height * (hatWidth / hatImage.width);
        const hatX = flippedX - (hatWidth - box.width) / 2;
        const hatY = box.y - hatHeight * 0.9;
        canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);

        // Chấm đỏ giờ sẽ ở giữa miệng
        const flippedMouthX = canvasElement.width - mouthCenter.x;
        canvasCtx.beginPath();
        canvasCtx.arc(flippedMouthX, mouthCenter.y, 5, 0, 2 * Math.PI);
        canvasCtx.fillStyle = 'red';
        canvasCtx.fill();
    }
    function drawCandles() {
        candles.forEach(candle => {
            canvasCtx.drawImage(candle.image, candle.x, candle.y, candle.width, candle.height);
        });
    }
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
    
    // ==========================================================
    // MỤC TIÊU 1.2: Tối ưu hóa việc sinh nến
    // ==========================================================
    function spawnCandle() {
        if (candles.length > 2) { candles.shift(); }
        const size = 80;
        let newCandle;
        let isOverlapping;
        let maxTries = 10; // Giới hạn số lần thử để tránh vòng lặp vô tận

        do {
            isOverlapping = false;
            const x = Math.random() * (canvasElement.width - size - 100) + 50;
            const y = Math.random() * (canvasElement.height - size - 100) + 50;
            newCandle = { x, y, width: size, height: size };

            for (const existingCandle of candles) {
                const distance = Math.hypot(newCandle.x - existingCandle.x, newCandle.y - existingCandle.y);
                if (distance < size * 1.5) { // Nếu khoảng cách quá gần, coi như trùng lặp
                    isOverlapping = true;
                    break;
                }
            }
            maxTries--;
        } while (isOverlapping && maxTries > 0);
        
        if (!isOverlapping) {
             const randomImage = candleImages[Math.floor(Math.random() * candleImages.length)];
             newCandle.image = randomImage;
             candles.push(newCandle);
        }
    }

    // --- CÁC HÀM QUẢN LÝ GAME ---
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
        }, 2500); // Thay đổi từ 2000ms
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
});