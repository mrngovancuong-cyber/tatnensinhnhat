import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/vision_bundle.mjs";

// Lấy các phần tử DOM
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");
const gameInfoElement = document.getElementById("game-info");

// Biến trạng thái game
let faceDetector;
let lastDetections = []; // Biến lưu kết quả nhận diện cuối cùng
let isDetecting = false;

const hatImage = new Image();
hatImage.src = 'https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png';
hatImage.crossOrigin = "Anonymous";

// Hàm khởi tạo AI
async function initialize() {
    try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
        faceDetector = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                delegate: "GPU"
            },
            runningMode: "VIDEO"
        });
        console.log("SUCCESS: AI Model is ready!");
        await hatImage.decode(); // Đảm bảo ảnh đã tải xong
        console.log("SUCCESS: Hat Image is ready!");
        loadingElement.classList.add("hidden");
        startButton.disabled = false;
    } catch (error) {
        console.error("LỖI KHỞI TẠO:", error);
        loadingElement.innerText = "Tải tài nguyên thất bại. Vui lòng F5.";
    }
}

// Lấy camera và bắt đầu
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => {
        // Bắt đầu vòng lặp vẽ ngay khi video sẵn sàng
        window.requestAnimationFrame(gameLoop);
    });
});

initialize();

// ==========================================================
// VÒNG LẶP GAME CHÍNH (ĐÃ SỬA LỖI)
// ==========================================================
let lastVideoTime = -1;
function gameLoop() {
    // 1. Đồng bộ kích thước canvas với video
    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    // 2. Gửi khung hình cho AI nếu game đang chạy và có khung hình mới
    if (isDetecting && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        faceDetector.detectForVideo(video, performance.now(), (result) => {
            // Chỉ cập nhật dữ liệu, không vẽ ở đây
            if (result.detections) {
                lastDetections = result.detections;
            }
        });
    }

    // 3. Luôn luôn xóa canvas ở mỗi khung hình
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 4. Luôn luôn vẽ kết quả cuối cùng mà chúng ta có
    if (isDetecting && lastDetections.length > 0) {
        for (const detection of lastDetections) {
            drawFaceBox(detection.boundingBox);
            drawHat(detection.boundingBox);
        }
    }

    // 5. Lặp lại
    window.requestAnimationFrame(gameLoop);
}

function drawFaceBox(face) {
    canvasCtx.strokeStyle = '#00FF00';
    canvasCtx.lineWidth = 4;
    const width = face.width * canvasElement.width;
    const height = face.height * canvasElement.height;
    const x = canvasElement.width - (face.originX * canvasElement.width) - width;
    const y = face.originY * canvasElement.height;
    canvasCtx.strokeRect(x, y, width, height);
}

function drawHat(face) {
    const faceWidthPx = face.width * canvasElement.width;
    const faceCenterXpx = (face.originX * canvasElement.width) + (faceWidthPx / 2);
    const hatWidth = faceWidthPx * 1.5;
    const hatHeight = hatImage.height * (hatWidth / hatImage.width);
    const hatX = canvasElement.width - faceCenterXpx - (hatWidth / 2);
    const hatY = (face.originY * canvasElement.height) - hatHeight * 0.9;
    canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
}

function startGame() {
    isDetecting = true;
    startButton.style.display = 'none';
    gameInfoElement.style.display = 'flex';
}

startButton.addEventListener("click", startGame);