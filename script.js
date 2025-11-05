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

    // --- HÌNH ẢNH ---
    const hatImage = new Image();
    const candleImages = [new Image(), new Image()];

    // ==========================================================
    // BƯỚC 1: HÀM KHỞI TẠO CHÍNH
    // ==========================================================
    async function initialize() {
        try {
            startButton.disabled = true; // Vô hiệu hóa nút ban đầu

            loadingElement.innerText = "Đang tải mô hình AI...";
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models')
            ]);
            console.log("AI Models Loaded!");

            loadingElement.innerText = "Đang tải hình ảnh...";
            // Hàm hỗ trợ tải ảnh
            const loadImage = (img, src) => new Promise((resolve, reject) => {
                img.src = src;
                img.crossOrigin = "Anonymous";
                img.onload = resolve;
                img.onerror = reject;
            });

            // Tải tất cả hình ảnh với link ĐÚNG
            await Promise.all([
                loadImage(hatImage, 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/birthdayhat.png'),
                loadImage(candleImages[0], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/candleb1.png'),
                loadImage(candleImages[1], 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/candelb2.png')
            ]);
            console.log("Images Loaded!");

            loadingElement.innerText = "Đang khởi động camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            await new Promise(resolve => { video.onloadedmetadata = resolve; });
            
            // MỌI THỨ ĐÃ SẴN SÀNG!
            loadingElement.classList.add("hidden");
            startButton.disabled = false; // Kích hoạt nút bấm
            video.play();
            requestAnimationFrame(gameLoop); // Bắt đầu vòng lặp nhận diện
            
        } catch (error) {
            console.error("Initialization Failed:", error);
            loadingElement.innerText = `Lỗi: ${error.message}. Vui lòng tải lại trang.`;
        }
    }
    
    initialize();

    // ==========================================================
    // BƯỚC 2: VÒNG LẶP GAME
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
        
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Luôn nhận diện khuôn mặt
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
        const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
        
        // Nếu tìm thấy khuôn mặt, vẽ các thành phần
        if (detections && detections.length > 0) {
            const face = detections[0];
            const box = face.detection.box;
            const noseTip = face.landmarks.positions[30];
            
            drawFaceElements(box, noseTip);

            // Logic tương tác game (chỉ chạy khi đã nhấn nút Bắt đầu)
            if (gameActive) {
                handleCollisions(noseTip);
            }
        }
        
        // Luôn vẽ nến (chỉ chạy khi đã nhấn nút Bắt đầu)
        if (gameActive) {
            drawCandles();
        }
        
        requestAnimationFrame(gameLoop);
    }

    // ==========================================================
    // CÁC HÀM VẼ
    // ==========================================================
    function drawFaceElements(box, noseTip) {
        const flippedX = canvasElement.width - box.x - box.width;

        // Vẽ khung xanh
        canvasCtx.strokeStyle = '#00FF00';
        canvasCtx.lineWidth = 4;
        canvasCtx.strokeRect(flippedX, box.y, box.width, box.height);

        // Vẽ nón
        const hatWidth = box.width * 1.5;
        const hatHeight = hatImage.height * (hatWidth / hatImage.width);
        const hatX = flippedX - (hatWidth - box.width) / 2;
        const hatY = box.y - hatHeight * 0.9;
        canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);

        // Vẽ chấm đỏ ở chóp mũi
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

    // ==========================================================
    // LOGIC GAME
    // ==========================================================
    function handleCollisions(noseTip) {
        const flippedNoseX = canvasElement.width - noseTip.x;
        
        candles.forEach((candle, index) => {
            // Kiểm tra xem mũi có nằm trong vùng của nến không
            if (flippedNoseX > candle.x && flippedNoseX < candle.x + candle.width &&
                noseTip.y > candle.y && noseTip.y < candle.y + candle.height) {
                
                candles.splice(index, 1); // Xóa nến
                score++;
                scoreElement.innerText = score;
            }
        });
    }

    function spawnCandle() {
        if (candles.length >= 3) { // Giới hạn tối đa 3 nến trên màn hình
             return;
        }
        const size = 80;
        // Vị trí ngẫu nhiên trong vùng an toàn của màn hình
        const x = Math.random() * (canvasElement.width - size - 100) + 50;
        const y = Math.random() * (canvasElement.height - size - 100) + 50;
        
        // Chọn ngẫu nhiên hình ảnh nến
        const randomImage = candleImages[Math.floor(Math.random() * candleImages.length)];
        
        candles.push({ x, y, width: size, height: size, image: randomImage });
    }

    // ==========================================================
    // CÁC HÀM QUẢN LÝ TRẠNG THÁI GAME
    // ==========================================================
    function startGame() {
        score = 0;
        timeLeft = 60;
        candles = [];
        scoreElement.innerText = score;
        timerElement.innerText = timeLeft;
        gameActive = true;
        
        startButton.style.display = 'none'; // Ẩn nút bắt đầu
        finalMessageElement.classList.add('hidden');
        gameInfoElement.style.display = 'flex'; // Hiện điểm số/thời gian
        
        // Bắt đầu đếm ngược
        gameInterval = setInterval(() => {
            timeLeft--;
            timerElement.innerText = timeLeft;
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
        
        // Bắt đầu tạo nến sau mỗi 1.5 giây
        candleInterval = setInterval(() => {
            if (gameActive) spawnCandle();
        }, 1500);
    }

    function endGame() {
        gameActive = false;
        clearInterval(gameInterval);
        clearInterval(candleInterval);
        
        finalScoreElement.innerText = score;
        finalMessageElement.classList.remove('hidden');
        startButton.style.display = 'block'; // Hiện lại nút bắt đầu
        
        candles = []; // Xóa hết nến
    }

    startButton.addEventListener("click", startGame);
});