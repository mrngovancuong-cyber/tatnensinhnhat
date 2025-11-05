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

// Hàm tải ảnh, trả về một Promise
const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        hatImage.onload = () => resolve(hatImage);
        hatImage.onerror = reject;
        // Thêm timestamp để tránh lỗi cache của trình duyệt
        hatImage.src = src + '?' + new Date().getTime();
        hatImage.crossOrigin = "Anonymous"; // Cần thiết khi tải ảnh từ domain khác
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

// --- HÀM KHỞI TẠO CHÍNH ---
// Chờ cho CẢ AI và ảnh cái nón được tải xong
async function initialize() {
    try {
        // Lấy link ảnh raw từ GitHub của bạn
        const hatPromise = loadImage('https://raw.githubusercontent.com/mrngovancuong-cyber/image-data/refs/heads/main/birthday%20hat.png');
        const detectorPromise = createFaceDetector();
        
        // Chờ cả hai hoàn tất
        await Promise.all([hatPromise, detectorPromise]);

        console.log("SUCCESS: AI and Hat Image are ready!");
        loadingElement.classList.add("hidden");
        startButton.disabled = false;
    } catch (error) {
        console.error("LỖI KHỞI TẠO:", error);
        loadingElement.innerText = "Tải tài nguyên thất bại. Vui lòng F5.";
    }
}

initialize(); // Bắt đầu quá trình khởi tạo

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
});

function predictWebcam() {
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    if (isDetecting && faceDetector) {
        faceDetector.detectForVideo(video, performance.now(), (result) => {
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

            if (result.detections && result.detections.length > 0) {
                const face = result.detections[0].boundingBox;
                drawHat(face);
            }
        });
    }

    window.requestAnimationFrame(predictWebcam);
}

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