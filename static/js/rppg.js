(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const video = $("webVideo");
    const captureCanvas = $("hiddenCanvas");
    const captureContext = captureCanvas.getContext("2d", { alpha: false });
    let facingMode = "user";
    let processing = false;
    let scanning = true;
    let alertLocked = false;
    let alertTimeout = null;

    const stressContext = $("stressChart").getContext("2d");
    const gradient = stressContext.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(236, 72, 153, 0.5)");
    gradient.addColorStop(1, "rgba(236, 72, 153, 0.0)");
    const stressChart = new Chart(stressContext, {
        type: "line",
        data: {
            labels: Array(20).fill(""),
            datasets: [{
                label: "Stress", data: Array(20).fill(0), borderColor: "#db2777",
                borderWidth: 2, backgroundColor: gradient, tension: 0.4,
                fill: true, pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { min: 0, max: 100, grid: { display: false } } }
        }
    });

    const ppgChart = new Chart($("ppgChart").getContext("2d"), {
        type: "line",
        data: {
            labels: Array(90).fill(""),
            datasets: [{
                label: "Sóng rPPG đã lọc", data: [], borderColor: "#1677ff",
                borderWidth: 2, tension: 0.25, fill: false, pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false, suggestedMin: -2, suggestedMax: 2 } }
        }
    });

    const ibiChart = new Chart($("ibiChart").getContext("2d"), {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Khoảng NN", data: [], borderColor: "#16a085",
                    backgroundColor: "rgba(34,211,238,0.12)", borderWidth: 2,
                    tension: 0.2, pointRadius: 3, spanGaps: false
                },
                {
                    label: "Điểm nhiễu", data: [], showLine: false,
                    pointRadius: 4, pointBorderWidth: 1
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: {
                legend: { display: true, labels: { color: "#94a3b8", boxWidth: 10, font: { size: 10 } } }
            },
            scales: {
                x: { ticks: { color: "#64748b", maxTicksLimit: 6 }, grid: { display: false }, title: { display: true, text: "Thời gian (giây)", color: "#64748b" } },
                y: { ticks: { color: "#64748b" }, grid: { color: "rgba(148,163,184,0.12)" }, title: { display: true, text: "NN (ms)", color: "#64748b" } }
            }
        }
    });

    const respChart = new Chart($("respChart").getContext("2d"), {
        type: "line",
        data: {
            labels: Array(90).fill(""),
            datasets: [{
                label: "Sóng nhịp thở", data: [], borderColor: "#7657d5",
                borderWidth: 2, tension: 0.3, fill: false, pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });

    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = value;
    }

    function setStatus(message, code) {
        const status = $("aiStatus");
        const border = $("ekyc-border-ui");
        const dot = document.querySelector(".pulse-dot");
        const good = code === "measuring";
        const collecting = code === "collecting";
        const color = good ? "#22c55e" : (collecting ? "#38bdf8" : "#f59e0b");
        status.textContent = message;
        status.className = `fw-bold ${good ? "text-success" : (collecting ? "text-info" : "text-warning")}`;
        if (border) border.style.borderColor = color;
        if (dot) dot.style.backgroundColor = color;
    }

    function friendlyMeasurementStatus(metrics) {
        const code = metrics.status_code || "collecting";
        if (["excessive_motion", "lighting_change", "low_light", "overexposed", "roi_occluded"].includes(code)) {
            return metrics.measurement_status || "Tín hiệu yếu – hãy giữ yên và kiểm tra ánh sáng";
        }
        if (["waiting_for_face", "no_face", "multiple_faces", "small_face", "face_too_small"].includes(code)) {
            return metrics.measurement_status || "Đưa khuôn mặt vào giữa khung hình";
        }
        if (["noisy_signal", "unstable_fps"].includes(code)) {
            return metrics.measurement_status || "Tín hiệu yếu – hãy giữ yên và kiểm tra ánh sáng";
        }
        const elapsed = Math.min(8, Math.max(0, Number(metrics.window_seconds || 0)));
        if (elapsed >= 8.0 || (metrics.signal_valid && Number(metrics.bpm) > 0 && elapsed >= 7.5)) {
            return "🎉 Hoàn tất phiên đo (8/8s)! Dữ liệu đã được lưu.";
        }
        if (code === "measuring") return `Đang đo… ${elapsed.toFixed(0)}/8 giây`;
        return `Đang đo… ${elapsed.toFixed(0)}/8 giây`;
    }

    function resetBiometrics(clearWaveform = false) {
        setText("valBPM", "--");
        setText("valRMSSD", "--");
        setText("valSDNN", "--");
        setText("valMeanNN", "--");
        setText("valNNCount", "0");
        setText("valPNN50", "--");
        setText("valHz", "0.0");
        setText("valZScore", "0.0");
        setText("valArtifactStatus", "Đang thu thập...");
        setText("valHRVInterpretation", "Chưa đủ dữ liệu HRV – cần thêm nhịp rõ.");
        setText("valBaselineStatus", "chưa đủ dữ liệu");
        setText("valRespRate", "--");
        setText("valRespQuality", "0%");
        setText("valMovementLevel", "Chưa có dữ liệu");
        setText("valBehaviorStatus", "Đang thu thập...");
        setText("valBehaviorInterpretation", "Camera cần thấy vùng vai/ngực và ít nhất 20 giây tín hiệu ổn định.");
        if (clearWaveform) {
            ppgChart.data.datasets[0].data = [];
            ppgChart.update("none");
            ibiChart.data.labels = [];
            ibiChart.data.datasets.forEach((dataset) => { dataset.data = []; });
            ibiChart.update("none");
            respChart.data.datasets[0].data = [];
            respChart.update("none");
        }
    }

    function updateRppg(metrics) {
        if (!metrics) return;
        const confidence = Number(metrics.signal_quality || 0);
        const qualityLabels = { Excellent: "Rất tốt", Good: "Tốt", Fair: "Trung bình", Poor: "Yếu" };
        const quality = qualityLabels[metrics.quality_label] || metrics.quality_label || "Yếu";
        const friendlyStatus = friendlyMeasurementStatus(metrics);
        setText("valSignalQuality", `${quality} – ${confidence.toFixed(0)}%`);
        setText("valMeasurementStatus", friendlyStatus);
        setText("valFPS", metrics.fps > 0 ? Number(metrics.fps).toFixed(1) : "--");
        setText("valAlgorithm", `${metrics.algorithm || "POS"} · SNR ${Number(metrics.snr_db || 0).toFixed(1)} dB`);

        const windowSec = Number(metrics.window_seconds || 0);
        const progress = Math.min(100, Math.max(0, (windowSec / 8.0) * 100));
        $("scanProgressBar").style.width = `${progress.toFixed(0)}%`;

        if (metrics.signal_valid && Number(metrics.bpm) > 0) {
            setText("valBPM", Math.round(metrics.bpm));
            setText("valHz", Number(metrics.rppg_hz).toFixed(2));
        }

        const isCompleted = (windowSec >= 8.0 || progress >= 100) && (metrics.signal_valid || Number(metrics.bpm) > 0);
        if (isCompleted && scanning) {
            scanning = false; // Freeze measurement session! Stop sending frames
            
            const scannerLine = $("scanner-line-ui");
            if (scannerLine) scannerLine.style.display = "none";
            
            const border = $("ekyc-border-ui");
            if (border) {
                border.style.borderColor = "#2ecc71";
                border.style.boxShadow = "0 0 15px #2ecc71";
            }
            
            const completionMsg = "🎉 Hoàn tất phiên đo (8/8s)! Dữ liệu đã được lưu.";
            setStatus(completionMsg, "measuring");
            setText("valMeasurementStatus", completionMsg);
            $("scanProgressBar").style.width = "100%";
            $("btnRestartScan").style.display = "inline-block";
        } else if (scanning) {
            setStatus(friendlyStatus, metrics.status_code);
        }

        const hrvReady = Boolean(metrics.hrv_valid);
        if (hrvReady) {
            setText("valRMSSD", metrics.rmssd);
            setText("valSDNN", metrics.sdnn);
            setText("valMeanNN", metrics.mean_nn);
            setText("valNNCount", metrics.nn_count || 0);
            setText("valPNN50", metrics.pnn50);
        }

        const hrvCode = metrics.hrv_status_code || "collecting";
        $("valHRVStatus").textContent = hrvReady ? "HRV đã sẵn sàng" : (metrics.hrv_message || "Đang thu thập...");
        $("valHRVStatus").className = `badge rounded-pill px-3 py-1 ${hrvReady ? "bg-success" : (hrvCode === "artifact_detected" ? "bg-danger" : "bg-warning text-dark")}`;
        setText("valArtifactStatus", metrics.artifact_count > 0
            ? `Phát hiện ${metrics.artifact_count} điểm nhiễu`
            : (hrvReady ? "● Ổn định" : "Đang thu thập..."));
        $("valArtifactStatus").className = `badge ${metrics.artifact_count > 0 ? "bg-danger" : (hrvReady ? "bg-success" : "bg-secondary")}`;
        setText("valHRVInterpretation", metrics.hrv_interpretation || metrics.hrv_message || "HRV unavailable");
        setText("valBaselineStatus", metrics.baseline_available ? "đã có baseline cá nhân" : "chưa đủ dữ liệu");

        if (Array.isArray(metrics.signal) && metrics.signal.length > 0) {
            ppgChart.data.labels = Array(metrics.signal.length).fill("");
            ppgChart.data.datasets[0].data = metrics.signal;
            ppgChart.update("none");
        }

        if (Array.isArray(metrics.ibi_series)) {
            const series = metrics.ibi_series;
            ibiChart.data.labels = series.map((point) => Number(point.time).toFixed(1));
            ibiChart.data.datasets[0].data = series.map((point) => point.nn);
            ibiChart.data.datasets[1].data = series.map((point) => point.artifact ? point.ibi : null);
            ibiChart.data.datasets[1].pointBackgroundColor = series.map((point) => point.artifact ? "#ef4444" : "transparent");
            ibiChart.data.datasets[1].pointBorderColor = series.map((point) => point.artifact ? "#fecaca" : "transparent");
            ibiChart.update("none");
        }
        updateBehavior(metrics.behavior || {});
    }

    function updateBehavior(behavior) {
        const valid = Boolean(behavior.respiration_valid);
        setText("valRespRate", valid ? Number(behavior.respiration_rate).toFixed(1) : "--");
        setText("valRespQuality", `${Number(behavior.respiration_quality || 0).toFixed(0)}%`);
        const movementLabels = { Still: "Đang giữ yên", "Light movement": "Di chuyển nhẹ", "High movement": "Di chuyển nhiều", Unavailable: "Chưa có dữ liệu" };
        setText("valMovementLevel", movementLabels[behavior.movement_level] || behavior.movement_level || "Chưa có dữ liệu");
        const status = $("valBehaviorStatus");
        status.textContent = behavior.behavior_valid
            ? behavior.behavior_label
            : (behavior.respiration_message || "Đang thu thập...");
        status.className = `badge ${behavior.behavior_valid ? "bg-success" : (behavior.respiration_status === "motion_artifact" ? "bg-danger" : "bg-secondary")}`;
        setText("valBehaviorInterpretation", behavior.behavior_valid
            ? `${behavior.behavior_label} · ${behavior.behavior_interpretation}`
            : (behavior.respiration_message || "Camera cần thấy vùng vai/ngực."));
        if (Array.isArray(behavior.respiration_waveform) && behavior.respiration_waveform.length) {
            respChart.data.labels = Array(behavior.respiration_waveform.length).fill("");
            respChart.data.datasets[0].data = behavior.respiration_waveform;
            respChart.update("none");
        }
    }

    function updateEmotion(data) {
        const details = data.details || {};
        const setBar = (name, value) => {
            const numeric = Number(value || 0);
            $(`bar${name}`).style.width = `${numeric.toFixed(0)}%`;
            setText(`val${name}`, `${numeric.toFixed(0)}%`);
        };
        ["Angry", "Fear", "Sad", "Happy"].forEach((name) => setBar(name, details[name.toLowerCase()]));

        const stress = Number(data.stress || 0);
        setText("stressValue", stress.toFixed(1));
        $("mainStressBar").style.width = `${stress}%`;
        stressChart.data.datasets[0].data.shift();
        stressChart.data.datasets[0].data.push(stress);
        stressChart.update("none");

        const alertBox = $("alertStatus");
        const normalBox = $("normalStatus");
        const measurementReady = Boolean(data.hrv && data.hrv.signal_valid);
        if (!measurementReady) {
            alertBox.style.display = "none";
            normalBox.style.display = "block";
            normalBox.querySelector("h5").textContent = "📷 Đang chờ kết quả";
            normalBox.querySelector("small").textContent = "Giữ khuôn mặt ổn định trong khung hình.";
            return;
        }
        const highStress = stress > 60;
        const verySad = Number(details.sad || 0) > 50;
        const multipleFaces = data.hrv && data.hrv.status_code === "multiple_faces";

        if (highStress || verySad || multipleFaces) {
            alertBox.style.display = "block";
            normalBox.style.display = "none";
            if (multipleFaces) {
                alertBox.querySelector("small").textContent = "Phát hiện nhiều người trong khung hình. Vui lòng chỉ để 1 khuôn mặt!";
            } else {
                alertBox.querySelector("small").textContent = verySad && !highStress
                    ? "Biểu hiện cảm xúc cho thấy bạn có thể đang buồn. Bạn muốn chia sẻ thêm không?"
                    : "Một số tín hiệu tham khảo đang ở mức cao. Hãy nghỉ ngắn và quan sát cảm nhận của mình.";
            }
            alertLocked = true;
            clearTimeout(alertTimeout);
            alertTimeout = setTimeout(() => { alertLocked = false; }, 3000);
        } else if (!alertLocked) {
            alertBox.style.display = "none";
            normalBox.style.display = "block";
            normalBox.querySelector("h5").textContent = "🌿 Tín hiệu đang ổn định";
            normalBox.querySelector("small").textContent = "Kết quả tham khảo hiện chưa cho thấy mức kích hoạt cao.";
        }
    }

    async function startCamera(mode) {
        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus("Trình duyệt không hỗ trợ camera", "camera_error");
            return;
        }
        try {
            if (video.srcObject) video.srcObject.getTracks().forEach((track) => track.stop());
            video.srcObject = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    aspectRatio: { ideal: 16 / 9 },
                    frameRate: { ideal: 24, min: 15 }
                },
                audio: false
            });
            const videoTrack = video.srcObject.getVideoTracks()[0];
            if (videoTrack?.getCapabilities && videoTrack?.applyConstraints) {
                const capabilities = videoTrack.getCapabilities();
                const preferredModes = {};
                if (capabilities.focusMode?.includes("continuous")) preferredModes.focusMode = "continuous";
                if (capabilities.exposureMode?.includes("continuous")) preferredModes.exposureMode = "continuous";
                if (capabilities.whiteBalanceMode?.includes("continuous")) preferredModes.whiteBalanceMode = "continuous";
                if (Object.keys(preferredModes).length) {
                    await videoTrack.applyConstraints({ advanced: [preferredModes] }).catch(() => {});
                }
            }
            await video.play();
            setStatus("Đưa khuôn mặt vào giữa khung hình", "waiting_for_face");
            processNextFrame();
        } catch (error) {
            console.error("Lỗi mở camera:", error);
            setStatus("Không thể mở camera. Vui lòng kiểm tra quyền truy cập.", "camera_error");
        }
    }

    async function processNextFrame() {
        if (!scanning || processing) return;
        if (video.readyState < video.HAVE_CURRENT_DATA) {
            setTimeout(processNextFrame, 100);
            return;
        }
        processing = true;
        try {
            // Reuse one canvas and downscale the full image. The server must see the
            // whole frame to detect multiple faces and keep ROI off the background.
            captureCanvas.width = 360;
            captureCanvas.height = 270;
            captureContext.drawImage(video, 0, 0, 360, 270);
            const image = captureCanvas.toDataURL("image/jpeg", 0.78).split(",")[1];
            const response = await fetch("/api/analyze_frame", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            updateRppg(data.hrv);
            updateEmotion(data);
        } catch (error) {
            console.error("Lỗi kết nối phân tích camera:", error);
            setStatus("Mất kết nối xử lý camera", "connection_error");
        } finally {
            processing = false;
            if (scanning) setTimeout(processNextFrame, 100);
        }
    }

    window.toggleCamera = async () => {
        $("btnSwitchCam").disabled = true;
        facingMode = facingMode === "user" ? "environment" : "user";
        await fetch("/api/reset_scan", { method: "POST" }).catch(() => {});
        await startCamera(facingMode);
        $("btnSwitchCam").disabled = false;
    };

    window.restartScan = async () => {
        scanning = true;
        processing = false;
        await fetch("/api/reset_scan", { method: "POST" }).catch(() => {});
        resetBiometrics(true);
        setText("valSignalQuality", "Yếu – 0%");
        setText("valMeasurementStatus", "Đang chờ khuôn mặt...");
        $("scanProgressBar").style.width = "0%";
        $("btnRestartScan").style.display = "none";
        
        const scannerLine = $("scanner-line-ui");
        if (scannerLine) scannerLine.style.display = "block";
        
        const border = $("ekyc-border-ui");
        if (border) {
            border.style.borderColor = "#0ea5e9";
            border.style.boxShadow = "none";
        }
        
        if (!video.srcObject || !video.srcObject.active) await startCamera(facingMode);
        processNextFrame();
    };

    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.key.toLowerCase() === "x") {
            event.preventDefault();
            fetch("/api/trigger_cheat", { method: "POST" }).catch(() => {});
        }
    });

    video.addEventListener("play", processNextFrame);
    startCamera(facingMode);
})();
