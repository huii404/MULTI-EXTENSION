# Bio-Gate

Bio-Gate is an application designed to analyze facial emotions in real-time and calculate stress levels using a fuzzy inference system based on the Takagi-Sugeno model. It utilizes OpenCV for camera handling and DeepFace for facial emotion recognition.

## Features

* Real-time facial emotion recognition using DeepFace.
* Stress level calculation based on a custom fuzzy logic inference system.
* Support for multiple camera inputs with a built-in switching mechanism.
* Fake stress trigger for testing purposes.
* Video stream generation for easy integration with web interfaces.

## Prerequisites

Ensure you have the following installed on your system:

* Python 3.8 or higher
* pip (Python package installer)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kietlaptrinh/bio-gate.git
   cd bio-gate
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On Linux/macOS
   source venv/bin/activate
   ```

3. Install the required dependencies:
   ```bash
   pip install opencv-python deepface numpy
   ```

## Usage

The main functionality is encapsulated within the `VideoCamera` class in the `camera.py` file. 

To use the camera and emotion detection in your project, you can initialize the class as follows:

```python
from camera import VideoCamera

# Initialize the camera
camera = VideoCamera()

# Get a frame (returns a JPEG encoded byte string)
frame = camera.get_frame()

# Get the current calculated stress level
stress_level = camera.get_stress_level()

# Access current emotion
current_emotion = camera.current_emotion
```

### Testing the Stress Trigger

You can manually trigger a high-stress scenario for 15 seconds to test system behavior:
```python
camera.trigger_fake_stress()
```

### Switching Cameras

If you have multiple cameras connected, you can switch between them:
```python
camera.switch_camera()
```

## System Mechanism

1. **Frame Capture**: Captures video frames using OpenCV.
2. **Emotion Detection**: Processes frames through DeepFace to extract raw emotion percentages (angry, fear, sad, happy, neutral).
3. **Historical Averaging**: Maintains a history of recent emotions and calculates a weighted average to smooth out sudden changes and fluctuations.
4. **Fuzzy Inference System**: Applies a fuzzy logic system to evaluate the weighted emotions and determine a final stress level from 0 to 100.

## Disclaimer

This system is designed for experimental and educational purposes. The stress levels calculated are based on generalized facial expressions and should not be considered professional medical or psychological assessments.
