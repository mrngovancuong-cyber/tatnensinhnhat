// Chờ cho toàn bộ trang được tải xong rồi mới chạy code
document.addEventListener('DOMContentLoaded', () => {

    // --- LẤY CÁC PHẦN TỬ DOM ---
    const video = document.getElementById("webcam");
    const canvasElement = document.getElementById("output_canvas");
    const canvasCtx = canvasElement.getContext("2d");
    const startButton = document.getElementById("startButton");
    const loadingElement = document.getElementById("loading");
    const gameInfoElement = document.getElementById("game-info");
    
    // --- TẢI HÌNH ẢNH ---
    const hatImage = new Image();

    // ==========================================================
    // BƯỚC 1: HÀM KHỞI TẠO CHÍNH
    // ==========================================================
    async function run() {
        try {
            // Ẩn các thành phần không cần thiết
            startButton.style.display = 'none';
            gameInfoElement.style.display = 'none';

            loadingElement.innerText = "Đang tải mô hình AI...";
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models')
            ]);
            console.log("AI Models Loaded!");

            loadingElement.innerText = "Đang tải hình ảnh...";
            await new Promise((resolve, reject) => {
                hatImage.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png';
                hatImage.crossOrigin = "Anonymous";
                hatImage.onload = resolve;
                hatImage.onerror = reject;
            });
            console.log("Images Loaded!");

            loadingElement.innerText = "Đang khởi động camera...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            
            await new Promise(resolve => { video.onloadedmetadata = resolve; });
            
            // MỌI THỨ ĐÃ SẴN SÀNG!
            loadingElement.classList.add("hidden");
            video.play();
            requestAnimationFrame(gameLoop); // Bắt đầu vòng lặp chính
            
        } catch (error) {
            console.error("Initialization Failed:", error);
            loadingElement.innerText = "Tải tài nguyên thất bại. Vui lòng F5.";
        }
    }
    
    run(); // Chạy hàm khởi tạo

    // ==========================================================
    // BƯỚC 2: VÒNG LẶP GỠ LỖI (ĐÃ ĐƯỢC ĐƠN GIẢN HÓA)
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
        
        // Luôn luôn nhận diện
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 });
        const detections = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
        
        // Luôn luôn xóa và vẽ lại
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (detections && detections.length > 0) {
            const face = detections[0];
            drawFaceElements(face.detection.box, face.landmarks.positions[30]);
        }
        
        requestAnimationFrame(gameLoop);
    }

    // ==========================================================
    // HÀM VẼ (CHỈ NÓN VÀ CHẤM ĐỎ)
    // ==========================================================
    function drawFaceElements(box, noseTip) {
        const flippedX = canvasElement.width - box.x - box.width;

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
});