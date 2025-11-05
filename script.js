// Import thư viện AI với phiên bản ổn định
import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/vision_bundle.mjs";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");

document.getElementById("game-info").style.display = 'none';
document.getElementById("final-message").style.display = 'none';

let faceDetector;
let isDetecting = false;
const hatImage = new Image();

const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        hatImage.onload = () => resolve(hatImage);
        hatImage.onerror = reject;
        hatImage.src = src + '?' + new Date().getTime();
        hatImage.crossOrigin = "Anonymous";
    });
};

const createFaceDetector = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
    faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "GPU"
        },
        runningMode: "VIDEO"
    });
};

async function initialize() {
    try {
        const hatPromise = loadImage('https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthdayhat.png');
        const detectorPromise = createFaceDetector();
        await Promise.all([hatPromise, detectorPromise]);
        console.log("SUCCESS: AI and Hat Image are ready!");
        loadingElement.classList.add("hidden");
        startButton.disabled = false;
    } catch (error) {
        console.error("LỖI KHỞI TẠO:", error);
        loadingElement.innerText = "Tải tài nguyên thất bại. Vui lòng F5.";
    }
}

initialize();

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
});

async function predictWebcam() {
    // 1. Đảm bảo kích thước canvas luôn khớp với video
    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    // 2. Xóa toàn bộ canvas ở đầu mỗi khung hình.
    // Đây là thay đổi quan trọng nhất!
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 3. Chỉ chạy nhận diện nếu game đang hoạt động
    if (isDetecting && faceDetector) {
        faceDetector.detectForVideo(video, performance.now(), (result) => {
            // Bây giờ, callback chỉ tập trung vào việc VẼ kết quả
            if (result.detections && result.detections.length > 0) {
                // Cải tiến: Lặp qua tất cả các khuôn mặt phát hiện được
                for (const detection of result.detections) {
                    const face = detection.boundingBox;
                    drawFaceBox(face);
                    drawHat(face);
                }
            }
        });
    }

    // 4. Yêu cầu trình duyệt vẽ khung hình tiếp theo
    window.requestAnimationFrame(predictWebcam);
}


// ==========================================================
// HÀM MỚI ĐỂ VẼ KHUNG CHỮ NHẬT
// ==========================================================
function drawFaceBox(face) {
    canvasCtx.strokeStyle = '#00FF00'; // Màu xanh lá cây sáng
    canvasCtx.lineWidth = 4; // Độ dày của đường kẻ

    // Tính toán tọa độ đã lật ngược
    const x = (1 - face.originX - face.width) * canvasElement.width;
    const y = face.originY * canvasElement.height;
    const width = face.width * canvasElement.width;
    const height = face.height * canvasElement.height;

    canvasCtx.strokeRect(x, y, width, height);
}
// ==========================================================


function drawHat(face) {
    const hatWidth = face.width * 1.5;
    const hatHeight = hatImage.height * (hatWidth / hatImage.width);
    const hatX = (1 - (face.originX + face.width / 2)) * canvasElement.width - (hatWidth / 2);
    const hatY = face.originY * canvasElement.height - hatHeight * 0.9;
    canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
}

function startGame() {
    isDetecting = true;
    startButton.style.display = 'none';
}

startButton.addEventListener("click", startGame);