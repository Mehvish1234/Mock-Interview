# WEB-INTER-PREP

An all-in-one interview preparation platform designed to help job seekers track their interview progress, practice interviews with AI, generate personalized career roadmaps, and prepare for interviews at top tech companies.

## 🚀 Latest Features

### 🎤 Live Interview System
- **Real-time Speech Recognition**: Answer questions using voice input with browser-based speech recognition
- **AI-Powered Question Generation**: Dynamic interview questions tailored to your experience level
- **Instant Audio Feedback**: Questions are spoken aloud using text-to-speech technology
- **Performance Evaluation**: Get detailed scores and feedback on each answer
- **Quick 2-Question Sessions**: Perfect for regular practice without time commitment

### 💬 English Communication Skills
- **AI Grammar Correction**: Improve your English using Google Gemini AI
- **Side-by-Side Comparison**: See original vs improved text clearly
- **Professional Enhancement**: Optimized specifically for interview contexts
- **Text-to-Speech Integration**: Practice pronunciation with high-quality audio
- **Detailed Improvements**: Learn exactly what was corrected and why

## Features

- **User Authentication**: Secure login and registration system with profile management
- **Interview Tracking**: Track your interview progress, statuses, and performance
- **AI Interview Practice**: Practice interviews with AI-generated questions and receive personalized feedback
- **Live Interview Sessions**: Voice-powered practice sessions with real-time feedback
- **English Communication Skills**: AI-powered text correction and pronunciation practice
- **Career Roadmap Generator**: Generate customized career roadmaps with flowcharts based on your job role, experience, and target company
- **Company-Specific Preparation**: Access specialized resources for top tech companies like Google, Microsoft, Amazon, Meta, and Apple
- **Dashboard Analytics**: View interview statistics and performance metrics
- **Profile Management**: Upload profile photos and manage your personal information
- **Resume Analysis**: Upload your resume for tailored roadmap and interview suggestions

## Tech Stack

- **Backend**: Flask (Python)
- **Database**: SQLite (local) / MySQL (production)
- **AI Integration**: Google Gemini API for text generation and evaluation
- **Speech Technology**: Web Speech API, Whisper for transcription, Murf API for TTS
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Data Visualization**: Graphviz for flowcharts
- **Authentication**: Flask session management with bcrypt for password hashing
- **File Processing**: PyPDF2 for resume parsing, PyMuPDF for advanced PDF handling
- **Styling**: Font Awesome for icons

## Getting Started

### Prerequisites

- Python 3.8+
- Modern web browser with speech recognition support (Chrome, Edge recommended)
- Graphviz (for flowchart generation)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   pip install git+https://github.com/openai/whisper.git
   ```
3. Install Graphviz from https://graphviz.org/download/
4. Set up environment variables (optional):
   ```
   GEMINI_API_KEY=your_gemini_api_key
   SECRET_KEY=your_secret_key
   ```
5. Run the application:
   ```
   python app.py
   ```
6. Access the application at: http://127.0.0.1:5000/

### Default Login

- Email: admin@example.com
- Password: admin123

## Key Features Explained

### 🎤 Live Interview System
Experience realistic interview sessions with:
- **Voice Recognition**: Speak your answers naturally
- **AI Question Generation**: Get personalized questions based on your profile
- **Real-time Feedback**: Instant evaluation with detailed scoring
- **Progress Tracking**: Monitor improvement over multiple sessions

### 💬 English Communication Skills
Enhance your communication with:
- **Smart Correction**: AI identifies and fixes grammar, vocabulary, and structure issues
- **Professional Language**: Optimized for interview and business contexts
- **Pronunciation Practice**: High-quality text-to-speech for accent improvement
- **Learning Insights**: Understand what was improved and why

### 🤖 AI Interview Practice
Practice interviews with AI-generated questions tailored to your job role, experience level, and target company. Receive detailed feedback and performance scores to improve your interview skills.

### 🗺️ Career Roadmap Generator
Generate a personalized career roadmap including:
- Interactive flowchart visualizing your career progression
- Detailed breakdown of technical skills needed at each stage
- Recommended learning resources
- Portfolio project ideas
- Interview preparation tips
- Career progression timeline

### 📊 Interview Tracking
Keep track of all your interviews, including:
- Company and position
- Interview date
- Interview status (Upcoming, Completed, Rejected, Offered)
- Performance rating
- Interview notes

### 🏢 Company-Specific Preparation
Access specialized resources for top tech companies including:
- Common interview topics
- Company-specific FAQs
- Required technologies
- Interview process details

## 🌟 What's New

- **Live Interview Feature**: Complete voice-powered interview sessions
- **English Skills Enhancement**: AI-powered grammar correction and pronunciation
- **Improved Speech Recognition**: More accurate voice-to-text conversion
- **Enhanced User Interface**: Modern, responsive design with better accessibility
- **Performance Analytics**: Detailed scoring and improvement tracking

## 📱 Browser Support

- **Chrome**: Full support (recommended)
- **Edge**: Full support
- **Firefox**: Limited speech recognition support
- **Safari**: Basic functionality

## 🤝 Contributing

This project welcomes contributions! Feel free to submit issues and pull requests.

## 📄 License

This project is open source and available under the MIT License.
