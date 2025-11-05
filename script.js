// Import thư viện AI với phiên bản ổn định
import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/vision_bundle.mjs";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");
const gameInfoElement = document.getElementById("game-info");
const finalMessageElement = document.getElementById("final-message");

// Ẩn các thành phần UI không cần thiết lúc đầu
gameInfoElement.style.display = 'none';
finalMessageElement.style.display = 'none';

let faceDetector;
let isDetecting = false;
const hatImage = new Image();

const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        hatImage.onload = () => resolve(hatImage);
        hatImage.onerror = reject;
        hatImage.src = src + '?' + new Date().getTime(); // Thêm tham số để tránh cache
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
        const hatPromise = loadImage('https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/main/birthday_hat.png');
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

function predictWebcam() {
    if (canvasElement.width !== video.videoWidth) {
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
    }

    // Luôn xóa canvas ở mỗi khung hình
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (isDetecting && faceDetector) {
        faceDetector.detectForVideo(video, performance.now(), (result) => {
            if (result.detections && result.detections.length > 0) {
                for (const detection of result.detections) {
                    const face = detection.boundingBox;
                    drawFaceBox(face);
                    drawHat(face);
                }
            }
        });
    }

    window.requestAnimationFrame(predictWebcam);
}


// ==========================================================
// CÁC HÀM VẼ ĐÃ SỬA LỖI TÍNH TOÁN TỌA ĐỘ (FIX QUAN TRỌNG NHẤT)
// ==========================================================
function drawFaceBox(face) {
    canvasCtx.strokeStyle = '#00FF00';
    canvasCtx.lineWidth = 4;

    // Chuyển đổi tọa độ tỉ lệ sang tọa độ pixel thực tế
    const width = face.width * canvasElement.width;
    const height = face.height * canvasElement.height;
    // Tính toán lại X cho video đã bị lật ngang
    const x = canvasElement.width - (face.originX * canvasElement.width) - width;
    const y = face.originY * canvasElement.height;

    canvasCtx.strokeRect(x, y, width, height);
}

function drawHat(face) {
    const faceWidthPx = face.width * canvasElement.width;
    const faceCenterXpx = (face.originX * canvasElement.width) + (faceWidthPx / 2);

    const hatWidth = faceWidthPx * 1.5;
    const hatHeight = hatImage.height * (hatWidth / hatImage.width);

    // Tính toán tọa độ pixel đã lật ngược
    const hatX = canvasElement.width - faceCenterXpx - (hatWidth / 2);
    const hatY = (face.originY * canvasElement.height) - hatHeight * 0.9;

    canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
}
// ==========================================================


function startGame() {
    console.log("Game started!");
    isDetecting = true;
    startButton.style.display = 'none';
    finalMessageElement.style.display = 'none';

    // Hiển thị lại phần giao diện game (dù chưa có logic)
    gameInfoElement.style.display = 'flex';
}

startButton.addEventListener("click", startGame);