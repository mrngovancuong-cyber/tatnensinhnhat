// Import thư viện AI với phiên bản ổn định
import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/vision_bundle.mjs";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const startButton = document.getElementById("startButton");
const loadingElement = document.getElementById("loading");

// Ẩn các yếu tố không cần thiết cho bài kiểm tra này
document.getElementById("game-info").style.display = 'none';
document.getElementById("final-message").style.display = 'none';

let faceDetector;
let isDetecting = false;

// Tải hình ảnh cái nón sinh nhật
const hatImage = new Image();
hatImage.src = 'https://i.ibb.co/9v0z6s7/birthday-hat.png'; // Link ảnh nón PNG trong suốt

const createFaceDetector = async () => {
    try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");
        faceDetector = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
                // Sử dụng mô hình nhận diện khuôn mặt
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                delegate: "GPU"
            },
            runningMode: "VIDEO"
        });
        loadingElement.classList.add("hidden");
        startButton.disabled = false;
    } catch (error) {
        console.error("LỖI KHI TẠO FACE DETECTOR:", error);
        loadingElement.innerText = "Tải mô hình AI thất bại. Vui lòng F5 lại trang.";
    }
};

createFaceDetector();

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
                // Lấy thông tin khuôn mặt đầu tiên phát hiện được
                const face = result.detections[0].boundingBox;
                drawHat(face);
            }
        });
    }

    window.requestAnimationFrame(predictWebcam);
}

function drawHat(face) {
    const hatWidth = face.width * 1.5; // Nón rộng hơn mặt một chút
    const hatHeight = hatImage.height * (hatWidth / hatImage.width); // Giữ đúng tỷ lệ

    // Tính toán vị trí để đội nón (có lật ngược theo camera)
    const hatX = (1 - (face.originX + face.width / 2)) * canvasElement.width - (hatWidth / 2);
    const hatY = face.originY * canvasElement.height - hatHeight * 0.9; // Đặt nón cao hơn đỉnh đầu một chút

    canvasCtx.drawImage(hatImage, hatX, hatY, hatWidth, hatHeight);
}


// Hàm bắt đầu đơn giản: chỉ bật chế độ nhận diện
function startGame() {
    isDetecting = true;
    startButton.style.display = 'none'; // Ẩn nút bắt đầu đi
}

startButton.addEventListener("click", startGame);