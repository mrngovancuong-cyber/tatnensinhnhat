const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");
const gameInfoElement = document.getElementById("game-info");

const hatImage = new Image();
hatImage.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png';
hatImage.crossOrigin = "Anonymous";

// ==========================================================
// KHỞI TẠO VÀ TẢI MÔ HÌNH CỦA FACE-API.JS
// ==========================================================
async function initialize() {
    // Tải các mô hình AI cần thiết
    // Tiny Face Detector là mô hình nhỏ và rất nhanh
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    console.log("AI Models Loaded!");

    // Lấy quyền truy cập camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
    
    // Đợi video sẵn sàng
    await new Promise(resolve => video.onloadedmetadata = resolve);
    
    // Mọi thứ đã sẵn sàng
    loadingElement.classList.add("hidden");
    startButton.disabled = false;
    console.log("Application is ready!");
}

// Bắt đầu quá trình tải
initialize();

// ==========================================================
// HÀM VẼ VÀ NHẬN DIỆN CHÍNH
// ==========================================================
async function detectAndDraw() {
    // 1. Đồng bộ kích thước canvas với video
    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }
    
    // 2. Xóa canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 3. Nhận diện khuôn mặt
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());

    // 4. Vẽ kết quả lên canvas
    if (detections && detections.length > 0) {
        for (const detection of detections) {
            const box = detection.box;
            
            // Lật tọa độ X vì video đã được lật bằng CSS
            const flippedX = canvasElement.width - box.x - box.width;

            // Vẽ khung xanh
            canvasCtx.strokeStyle = '#00FF00';
            canvasCtx.lineWidth = 4;
            canvasCtx.strokeRect(flippedX, box.y, box.width, box.height);

            // Vẽ nón
            const hatWidth = box.width * 1.5;
            const hatHeight = hatImage.height * (hatWidth / hatImage.width);
            const hatX = flippedX - (hatWidth - box.width) / 2; // Canh giữa nón với khuôn mặt
            const hatY = box.y - hatHeight * 0.9;
            canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
        }
    }
    
    // 5. Lặp lại
    requestAnimationFrame(detectAndDraw);
}

// ==========================================================
// HÀM BẮT ĐẦU GAME
// ==========================================================
function startGame() {
    video.play();
    startButton.style.display = 'none';
    gameInfoElement.style.display = 'flex';
    console.log("Game started!");
    // Bắt đầu vòng lặp nhận diện và vẽ
    requestAnimationFrame(detectAndDraw);
}

startButton.addEventListener("click", startGame);