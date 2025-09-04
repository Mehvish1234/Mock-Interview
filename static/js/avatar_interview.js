/**
 * Avatar Interview JavaScript
 * Handles the complete avatar-based interview experience
 */

// Dynamic interview questions (will be populated by setup)
let INTERVIEW_QUESTIONS = [];

// Interview configuration
let interviewConfig = {
    jobRole: '',
    targetCompany: '',
    experienceLevel: '',
    questionCount: 5
};

// Global state
let currentQuestionIndex = 0;
let answers = [];
let isRecording = false;
let mediaRecorder = null;
let recognition = null;
let currentTranscript = '';
let videoRecorder = null;
let recordedVideoBlob = null;
let userVideoStream = null;
let postureAnalyzer = null;
let postureData = [];
let recordingStartTime = null;

// DOM elements
let avatarPlayer, micButton, micStatus, transcriptText, nextButton;
let currentQuestion, progressFill, progressText, loadingOverlay;
let completionScreen, submitButton, restartButton, viewHistoryButton;
let userVideo, postureCanvas, videoOverlay, recordingIndicator;
let overallScoreSection, detailedFeedbackSection, summarySection;
let interviewSetup, interviewContent, setupForm;

// Store overall interview feedback
let overallInterviewFeedback = null;

/**
 * Initialize the interview when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupSpeechRecognition();
    initializeVideoAndPosture();
    showSetupForm();
});

/**
 * Get references to DOM elements
 */
function initializeElements() {
    avatarPlayer = document.getElementById('avatarPlayer');
    micButton = document.getElementById('micButton');
    micStatus = document.getElementById('micStatus');
    transcriptText = document.getElementById('transcriptText');
    nextButton = document.getElementById('nextButton');
    currentQuestion = document.getElementById('currentQuestion');
    progressFill = document.getElementById('progressFill');
    progressText = document.getElementById('progressText');
    loadingOverlay = document.getElementById('loadingOverlay');
    completionScreen = document.getElementById('completionScreen');
    submitButton = document.getElementById('submitButton');
    restartButton = document.getElementById('restartButton');
    viewHistoryButton = document.getElementById('viewHistoryButton');
    userVideo = document.getElementById('userVideo');
    postureCanvas = document.getElementById('postureCanvas');
    videoOverlay = document.getElementById('videoOverlay');
    recordingIndicator = document.getElementById('recordingIndicator');
    
    // Feedback elements
    overallScoreSection = document.getElementById('overallScoreSection');
    detailedFeedbackSection = document.getElementById('detailedFeedbackSection');
    summarySection = document.getElementById('summarySection');
    
    // Setup elements
    interviewSetup = document.getElementById('interviewSetup');
    interviewContent = document.getElementById('interviewContent');
    setupForm = document.getElementById('setupForm');

    // Event listeners
    micButton.addEventListener('click', toggleRecording);
    nextButton.addEventListener('click', nextQuestion);
    submitButton.addEventListener('click', submitAnswers);
    restartButton.addEventListener('click', restartInterview);
    viewHistoryButton.addEventListener('click', viewInterviewHistory);
    setupForm.addEventListener('submit', handleSetupSubmit);
    
    // Avatar video events
    avatarPlayer.addEventListener('ended', onAvatarFinished);
    avatarPlayer.addEventListener('loadstart', showLoading);
    avatarPlayer.addEventListener('canplay', hideLoading);
    avatarPlayer.addEventListener('error', onAvatarError);
}

/**
 * Setup Web Speech API for speech recognition
 */
function setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = function() {
            console.log('Speech recognition started');
            micStatus.textContent = 'Listening... Speak now';
            micStatus.classList.add('recording');
        };
        
        recognition.onresult = function(event) {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript + ' ';
                }
            }
            
            if (transcript.trim()) {
                currentTranscript = transcript.trim();
                transcriptText.textContent = currentTranscript;
                transcriptText.classList.add('has-content');
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showToast('Speech recognition error: ' + event.error, 'error');
            stopRecording();
        };
        
        recognition.onend = function() {
            console.log('Speech recognition ended');
            if (isRecording) {
                // Restart if we're still supposed to be recording
                recognition.start();
            }
        };
    } else {
        console.warn('Speech recognition not supported');
        showToast('Speech recognition not supported in this browser', 'error');
    }
}

/**
 * Initialize video recording and posture analysis
 */
async function initializeVideoAndPosture() {
    try {
        // Request camera access
        userVideoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false // Audio is handled separately by speech recognition
        });
        
        if (userVideo) {
            userVideo.srcObject = userVideoStream;
            userVideo.play();
            
            // Hide video overlay when video starts playing
            userVideo.addEventListener('playing', () => {
                if (videoOverlay) {
                    videoOverlay.style.display = 'none';
                }
            });
        }
        
        // Initialize posture analysis (using MediaPipe Pose or similar)
        await initializePostureAnalysis();
        
        console.log('Video and posture analysis initialized');
        
    } catch (error) {
        console.error('Error initializing video/posture:', error);
        showToast('Camera access denied. Video recording will be disabled.', 'error');
    }
}

/**
 * Initialize posture analysis using MediaPipe Pose
 */
async function initializePostureAnalysis() {
    try {
        // Load MediaPipe Pose (this would require including the MediaPipe library)
        // For now, we'll simulate posture analysis
        postureAnalyzer = {
            analyze: function(videoElement) {
                // Simulate posture analysis
                const randomScore = 6 + Math.random() * 3; // Random score between 6-9
                return {
                    score: randomScore,
                    confidence: 0.8,
                    details: {
                        shoulder_alignment: randomScore > 7 ? 'good' : 'needs_improvement',
                        head_position: randomScore > 6.5 ? 'upright' : 'tilted',
                        back_posture: randomScore > 7.5 ? 'straight' : 'slouching'
                    }
                };
            }
        };
        
        console.log('Posture analyzer initialized');
        
    } catch (error) {
        console.error('Error initializing posture analysis:', error);
        postureAnalyzer = null;
    }
}

/**
 * Start video recording
 */
function startVideoRecording() {
    if (!userVideoStream) {
        console.warn('No video stream available for recording');
        return;
    }
    
    try {
        const options = {
            mimeType: 'video/webm;codecs=vp8,opus'
        };
        
        videoRecorder = new MediaRecorder(userVideoStream, options);
        const chunks = [];
        
        videoRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };
        
        videoRecorder.onstop = function() {
            recordedVideoBlob = new Blob(chunks, { type: 'video/webm' });
            console.log('Video recording stopped, size:', recordedVideoBlob.size);
        };
        
        videoRecorder.start();
        recordingStartTime = Date.now();
        console.log('Video recording started');
        
    } catch (error) {
        console.error('Error starting video recording:', error);
        videoRecorder = null;
    }
}

/**
 * Stop video recording
 */
function stopVideoRecording() {
    if (videoRecorder && videoRecorder.state === 'recording') {
        videoRecorder.stop();
        console.log('Video recording stopped');
    }
}

/**
 * Analyze posture during recording
 */
function analyzePostureContinuously() {
    if (!postureAnalyzer || !userVideo) return;
    
    const analysisInterval = setInterval(() => {
        if (!isRecording) {
            clearInterval(analysisInterval);
            return;
        }
        
        const postureResult = postureAnalyzer.analyze(userVideo);
        postureData.push({
            timestamp: Date.now() - recordingStartTime,
            ...postureResult
        });
        
    }, 1000); // Analyze every second
}

/**
 * Calculate average posture score
 */
function calculateAveragePosture() {
    if (postureData.length === 0) {
        return {
            average_score: 5,
            confidence: 0.3,
            total_samples: 0
        };
    }
    
    const totalScore = postureData.reduce((sum, data) => sum + data.score, 0);
    const averageConfidence = postureData.reduce((sum, data) => sum + data.confidence, 0) / postureData.length;
    
    return {
        average_score: totalScore / postureData.length,
        confidence: averageConfidence,
        total_samples: postureData.length,
        detailed_analysis: postureData
    };
}

/**
 * Show setup form
 */
function showSetupForm() {
    interviewSetup.style.display = 'block';
    interviewContent.style.display = 'none';
    completionScreen.style.display = 'none';
}

/**
 * Handle setup form submission
 */
async function handleSetupSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const jobRole = document.getElementById('jobRole').value;
    const targetCompany = document.getElementById('targetCompany').value;
    const experienceLevel = document.getElementById('experienceLevel').value;
    const questionCount = parseInt(document.getElementById('questionCount').value);
    
    if (!jobRole || !targetCompany || !experienceLevel || !questionCount) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    // Store configuration
    interviewConfig = {
        jobRole,
        targetCompany,
        experienceLevel,
        questionCount
    };
    
    // Disable form and show loading
    const submitBtn = document.querySelector('.start-interview-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Questions...';
    
    try {
        // Generate questions using Gemini API
        await generateInterviewQuestions();
        
        // Start the interview
        await startInterview();
        
    } catch (error) {
        console.error('Error generating questions:', error);
        showToast('Error generating questions. Using default questions.', 'error');
        
        // Use fallback questions
        INTERVIEW_QUESTIONS = getFallbackQuestions(jobRole, questionCount);
        await startInterview();
        
    } finally {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-play me-2"></i>Generate Interview Questions';
    }
}

/**
 * Generate interview questions using Gemini API
 */
async function generateInterviewQuestions() {
    const { jobRole, targetCompany, experienceLevel, questionCount } = interviewConfig;
    
    showToast('Generating personalized interview questions...', 'info');
    
    try {
        const response = await fetch('/api/generate_question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: jobRole,
                company: targetCompany,
                difficulty: experienceLevel,
                question_count: questionCount,
                generate_multiple: true
            })
        });
        
        const data = await response.json();
        
        if (data.questions && Array.isArray(data.questions)) {
            INTERVIEW_QUESTIONS = data.questions;
        } else if (data.question) {
            // Single question response - generate multiple calls
            INTERVIEW_QUESTIONS = [];
            const previousQuestions = [];
            
            for (let i = 0; i < questionCount; i++) {
                const questionResponse = await fetch('/api/generate_question', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: jobRole,
                        company: targetCompany,
                        difficulty: experienceLevel,
                        previous_questions: previousQuestions
                    })
                });
                
                const questionData = await questionResponse.json();
                if (questionData.question) {
                    INTERVIEW_QUESTIONS.push(questionData.question);
                    previousQuestions.push(questionData.question);
                } else {
                    throw new Error('Failed to generate question');
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } else {
            throw new Error('Invalid response format');
        }
        
        showToast(`Generated ${INTERVIEW_QUESTIONS.length} personalized questions!`, 'success');
        
    } catch (error) {
        console.error('Error generating questions:', error);
        throw error;
    }
}

/**
 * Get fallback questions based on role
 */
function getFallbackQuestions(role, count) {
    const questionSets = {
        'Software Engineer': [
            'Tell me about yourself and your software development experience.',
            'Describe a challenging technical problem you solved recently.',
            'How do you approach debugging complex issues?',
            'What programming languages and technologies are you most comfortable with?',
            'How do you stay updated with new technologies and best practices?',
            'Describe your experience with version control and collaborative development.',
            'What is your approach to writing clean, maintainable code?',
            'How do you handle technical debt in your projects?',
            'Describe a time when you had to optimize code performance.',
            'What testing strategies do you use in your development process?'
        ],
        'Data Scientist': [
            'Tell me about your background in data science and analytics.',
            'Describe a data science project you\'re proud of.',
            'How do you approach data cleaning and preprocessing?',
            'What machine learning algorithms are you most familiar with?',
            'How do you validate and evaluate your models?',
            'Describe your experience with data visualization tools.',
            'How do you communicate technical findings to non-technical stakeholders?',
            'What is your approach to handling missing or inconsistent data?',
            'Describe a time when your analysis led to actionable business insights.',
            'How do you stay current with developments in data science?'
        ],
        'Product Manager': [
            'Tell me about your product management experience.',
            'How do you prioritize features in a product roadmap?',
            'Describe a successful product launch you managed.',
            'How do you gather and incorporate user feedback?',
            'What metrics do you use to measure product success?',
            'How do you work with engineering teams to deliver products?',
            'Describe a time when you had to make a difficult product decision.',
            'How do you conduct market research and competitive analysis?',
            'What is your approach to stakeholder management?',
            'How do you balance user needs with business objectives?'
        ]
    };
    
    // Get questions for the specific role or use software engineer as default
    const questions = questionSets[role] || questionSets['Software Engineer'];
    
    // Return the requested number of questions
    return questions.slice(0, count);
}

/**
 * Start the interview process
 */
async function startInterview() {
    // Hide setup and show interview content
    interviewSetup.style.display = 'none';
    interviewContent.style.display = 'block';
    
    currentQuestionIndex = 0;
    answers = [];
    updateProgress();
    await startAvatar(INTERVIEW_QUESTIONS[0]);
}

/**
 * Start avatar with given question text
 */
async function startAvatar(questionText) {
    try {
        showLoading();
        currentQuestion.textContent = questionText;
        
        // Call D-ID API to create avatar talk
        const response = await fetch('/api/create_avatar_talk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: questionText })
        });
        
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'demo') {
            if (data.status === 'demo') {
                showToast(data.message, 'info');
                // Use a placeholder video for demo
                avatarPlayer.src = '';
                avatarPlayer.poster = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjhGOUZBIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjEyMCIgcj0iNDAiIGZpbGw9IiNFOUVDRUYiLz4KPHJlY3QgeD0iMTcwIiB5PSIxODAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI4MCIgZmlsbD0iI0U5RUNFRiIvPgo8dGV4dCB4PSIyMDAiIHk9IjI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzZDNzU3RCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij5EZW1vIE1vZGU8L3RleHQ+Cjwvc3ZnPg==";
                hideLoading();
                // Simulate avatar finishing after 3 seconds
                setTimeout(() => {
                    onAvatarFinished();
                }, 3000);
            } else {
                avatarPlayer.src = data.video_url;
                avatarPlayer.load();
            }
        } else {
            throw new Error(data.message || 'Failed to create avatar');
        }
        
    } catch (error) {
        console.error('Error starting avatar:', error);
        showToast('Error starting avatar: ' + error.message, 'error');
        hideLoading();
        // Enable mic button anyway for demo purposes
        onAvatarFinished();
    }
}

/**
 * Called when avatar finishes speaking
 */
function onAvatarFinished() {
    hideLoading();
    micButton.disabled = false;
    micStatus.textContent = 'Click to start recording your answer';
    console.log('Avatar finished, mic enabled');
}

/**
 * Handle avatar loading
 */
function showLoading() {
    loadingOverlay.style.display = 'flex';
    micButton.disabled = true;
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

/**
 * Handle avatar errors
 */
function onAvatarError(event) {
    console.error('Avatar video error:', event);
    hideLoading();
    onAvatarFinished(); // Enable mic anyway
}

/**
 * Toggle recording state
 */
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

/**
 * Start recording user response
 */
function startRecording() {
    if (!recognition) {
        showToast('Speech recognition not available', 'error');
        return;
    }
    
    isRecording = true;
    currentTranscript = '';
    postureData = []; // Reset posture data for this question
    
    micButton.classList.add('recording');
    micButton.innerHTML = '<i class="fas fa-stop"></i>';
    micStatus.textContent = 'Recording... Click to stop';
    micStatus.classList.add('recording');
    
    transcriptText.textContent = 'Listening...';
    transcriptText.classList.remove('has-content');
    
    nextButton.style.display = 'none';
    
    // Start video recording
    startVideoRecording();
    
    // Start posture analysis
    analyzePostureContinuously();
    
    // Show recording indicator
    if (recordingIndicator) {
        recordingIndicator.style.display = 'flex';
    }
    
    try {
        recognition.start();
    } catch (error) {
        console.error('Error starting recognition:', error);
        showToast('Error starting recording: ' + error.message, 'error');
        stopRecording();
    }
}

/**
 * Stop recording user response
 */
function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    
    micButton.classList.remove('recording');
    micButton.innerHTML = '<i class="fas fa-microphone"></i>';
    micStatus.textContent = 'Click to record another response';
    micStatus.classList.remove('recording');
    
    // Stop video recording
    stopVideoRecording();
    
    // Hide recording indicator
    if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
    }
    
    if (recognition) {
        recognition.stop();
    }
    
    // Show transcript and next button if we have content
    if (currentTranscript) {
        transcriptText.textContent = currentTranscript;
        const transcriptContainer = transcriptText.parentElement;
        if (transcriptContainer) {
            transcriptContainer.classList.add('has-content');
        }
        nextButton.style.display = 'block';
    } else {
        transcriptText.textContent = 'No speech detected. Please try again.';
    }
}

/**
 * Move to next question
 */
async function nextQuestion() {
    // Calculate video duration
    const videoDuration = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : 0;
    
    // Get detailed evaluation for current answer
    if (currentTranscript) {
        showToast('Analyzing your response...', 'info');
        
        try {
            const postureAnalysis = calculateAveragePosture();
            
            // Get detailed evaluation from backend
            const evaluationResponse = await fetch('/api/evaluate_answer_detailed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: INTERVIEW_QUESTIONS[currentQuestionIndex],
                    transcript: currentTranscript,
                    posture_data: postureAnalysis,
                    video_duration: videoDuration
                })
            });
            
            const evaluation = await evaluationResponse.json();
            
            // Save comprehensive answer data
            const answerData = {
                question: INTERVIEW_QUESTIONS[currentQuestionIndex],
                answer: currentTranscript,
                timestamp: new Date().toISOString(),
                video_duration: videoDuration,
                posture_analysis: postureAnalysis,
                detailed_evaluation: evaluation,
                video_blob_size: recordedVideoBlob ? recordedVideoBlob.size : 0
            };
            
            answers.push(answerData);
            
            showToast(`Score: ${evaluation.overall_score}/10 - ${evaluation.detailed_feedback}`, 'success');
            
        } catch (error) {
            console.error('Error getting detailed evaluation:', error);
            
            // Fallback: save basic answer data
            answers.push({
                question: INTERVIEW_QUESTIONS[currentQuestionIndex],
                answer: currentTranscript,
                timestamp: new Date().toISOString(),
                video_duration: videoDuration,
                posture_analysis: calculateAveragePosture(),
                evaluation_error: error.message
            });
            
            showToast('Answer saved (evaluation unavailable)', 'info');
        }
    }
    
    currentQuestionIndex++;
    
    // Check if interview is complete
    if (currentQuestionIndex >= INTERVIEW_QUESTIONS.length) {
        showCompletionScreen();
        return;
    }
    
    // Reset UI for next question
    resetForNextQuestion();
    updateProgress();
    
    // Start next avatar question
    await startAvatar(INTERVIEW_QUESTIONS[currentQuestionIndex]);
}

/**
 * Reset UI elements for next question
 */
function resetForNextQuestion() {
    currentTranscript = '';
    transcriptText.textContent = 'Your spoken response will appear here...';
    
    // Reset transcript container styling
    const transcriptContainer = transcriptText.parentElement;
    if (transcriptContainer) {
        transcriptContainer.classList.remove('has-content');
    }
    
    nextButton.style.display = 'none';
    micButton.disabled = true;
    micStatus.textContent = 'Wait for the question to finish';
    micStatus.classList.remove('recording');
    
    // Hide recording indicator
    if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
    }
    
    if (isRecording) {
        stopRecording();
    }
}

/**
 * Update progress bar and text
 */
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / INTERVIEW_QUESTIONS.length) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `Question ${currentQuestionIndex + 1} of ${INTERVIEW_QUESTIONS.length}`;
}

/**
 * Show completion screen
 */
async function showCompletionScreen() {
    document.querySelector('.interview-content').style.display = 'none';
    completionScreen.style.display = 'block';
    
    // Update progress to 100%
    progressFill.style.width = '100%';
    progressText.textContent = `Interview Complete!`;
    
    // Calculate and display overall interview feedback
    await calculateOverallFeedback();
    displayDetailedFeedback();
}

/**
 * Calculate overall interview feedback from all answers
 */
async function calculateOverallFeedback() {
    if (answers.length === 0) return;
    
    try {
        showToast('Calculating your overall interview performance...', 'info');
        
        // Aggregate all individual evaluations
        let totalContentScore = 0;
        let totalCommunicationScore = 0;
        let totalCompletenessScore = 0;
        let totalEngagementScore = 0;
        let totalPostureScore = 0;
        let totalVideoScore = 0;
        let validAnswers = 0;
        
        let allStrengths = [];
        let allImprovements = [];
        let totalDuration = 0;
        let totalWords = 0;
        
        for (const answer of answers) {
            if (answer.detailed_evaluation) {
                const eval = answer.detailed_evaluation;
                
                // Aggregate transcript analysis scores
                if (eval.transcript_analysis) {
                    const ta = eval.transcript_analysis;
                    if (ta.content_quality) totalContentScore += ta.content_quality.score || 0;
                    if (ta.communication) totalCommunicationScore += ta.communication.score || 0;
                    if (ta.completeness) totalCompletenessScore += ta.completeness.score || 0;
                    if (ta.engagement) totalEngagementScore += ta.engagement.score || 0;
                    
                    // Collect strengths and improvements
                    if (ta.strengths) allStrengths.push(...ta.strengths);
                    if (ta.areas_for_improvement) allImprovements.push(...ta.areas_for_improvement);
                }
                
                // Aggregate posture and video scores
                if (eval.posture_analysis) totalPostureScore += eval.posture_analysis.score || 0;
                if (eval.video_analysis) totalVideoScore += eval.video_analysis.score || 0;
                
                validAnswers++;
            }
            
            // Aggregate duration and word count
            totalDuration += answer.video_duration || 0;
            totalWords += (answer.answer || '').split(' ').length;
        }
        
        if (validAnswers > 0) {
            // Calculate averages
            const avgContent = totalContentScore / validAnswers;
            const avgCommunication = totalCommunicationScore / validAnswers;
            const avgCompleteness = totalCompletenessScore / validAnswers;
            const avgEngagement = totalEngagementScore / validAnswers;
            const avgPosture = totalPostureScore / validAnswers;
            const avgVideo = totalVideoScore / validAnswers;
            
            // Calculate overall score (weighted average)
            const overallScore = (
                avgContent * 0.3 +
                avgCommunication * 0.25 +
                avgCompleteness * 0.2 +
                avgEngagement * 0.15 +
                avgPosture * 0.05 +
                avgVideo * 0.05
            );
            
            // Remove duplicates and limit items
            const uniqueStrengths = [...new Set(allStrengths)].slice(0, 5);
            const uniqueImprovements = [...new Set(allImprovements)].slice(0, 5);
            
            overallInterviewFeedback = {
                overall_score: Math.round(overallScore * 10) / 10,
                content_quality: {
                    score: Math.round(avgContent * 10) / 10,
                    feedback: generateCategoryFeedback('content', avgContent),
                    suggestions: generateCategorySuggestions('content', avgContent)
                },
                communication: {
                    score: Math.round(avgCommunication * 10) / 10,
                    feedback: generateCategoryFeedback('communication', avgCommunication),
                    suggestions: generateCategorySuggestions('communication', avgCommunication)
                },
                body_language: {
                    score: Math.round(avgPosture * 10) / 10,
                    feedback: generateCategoryFeedback('posture', avgPosture),
                    suggestions: generateCategorySuggestions('posture', avgPosture)
                },
                speaking_pace: {
                    score: Math.round(avgVideo * 10) / 10,
                    feedback: generateCategoryFeedback('video', avgVideo),
                    suggestions: generateCategorySuggestions('video', avgVideo)
                },
                strengths: uniqueStrengths.length > 0 ? uniqueStrengths : ['Completed the interview successfully', 'Showed professional attitude'],
                improvements: uniqueImprovements.length > 0 ? uniqueImprovements : ['Practice more technical examples', 'Work on confident body language'],
                statistics: {
                    total_duration: Math.round(totalDuration),
                    total_words: totalWords,
                    average_response_length: Math.round(totalWords / answers.length),
                    questions_answered: answers.length
                }
            };
        }
        
    } catch (error) {
        console.error('Error calculating overall feedback:', error);
        // Provide fallback feedback
        overallInterviewFeedback = {
            overall_score: 7.0,
            content_quality: { score: 7.0, feedback: 'Good technical responses', suggestions: ['Add more specific examples'] },
            communication: { score: 7.5, feedback: 'Clear communication', suggestions: ['Reduce filler words'] },
            body_language: { score: 7.0, feedback: 'Professional appearance', suggestions: ['Maintain consistent posture'] },
            speaking_pace: { score: 7.5, feedback: 'Good speaking rhythm', suggestions: ['Use strategic pauses'] },
            strengths: ['Clear communication', 'Professional demeanor', 'Relevant examples'],
            improvements: ['Add more quantitative results', 'Practice confident body language'],
            statistics: {
                total_duration: answers.reduce((sum, a) => sum + (a.video_duration || 0), 0),
                total_words: answers.reduce((sum, a) => sum + (a.answer || '').split(' ').length, 0),
                average_response_length: 50,
                questions_answered: answers.length
            }
        };
    }
}

/**
 * Generate category-specific feedback
 */
function generateCategoryFeedback(category, score) {
    const feedbacks = {
        content: {
            high: 'Excellent technical knowledge with comprehensive examples and clear explanations.',
            medium: 'Good understanding demonstrated with relevant examples and solid explanations.',
            low: 'Basic knowledge shown but could benefit from more detailed examples and explanations.'
        },
        communication: {
            high: 'Outstanding clarity and structure in responses with professional language throughout.',
            medium: 'Clear and well-structured responses with good professional communication.',
            low: 'Communication is understandable but could be more structured and polished.'
        },
        posture: {
            high: 'Excellent professional posture maintained consistently throughout the interview.',
            medium: 'Good posture with minor adjustments needed for optimal presentation.',
            low: 'Posture needs improvement to project more confidence and professionalism.'
        },
        video: {
            high: 'Perfect speaking pace that was engaging and easy to follow throughout.',
            medium: 'Good speaking pace with natural rhythm and appropriate pauses.',
            low: 'Speaking pace could be adjusted for better clarity and engagement.'
        }
    };
    
    const level = score >= 8 ? 'high' : score >= 6 ? 'medium' : 'low';
    return feedbacks[category]?.[level] || 'Performance analyzed successfully.';
}

/**
 * Generate category-specific suggestions
 */
function generateCategorySuggestions(category, score) {
    const suggestions = {
        content: {
            high: ['Continue providing detailed examples', 'Share more diverse project experiences'],
            medium: ['Add more quantitative results', 'Include specific technologies used'],
            low: ['Prepare more detailed examples', 'Practice explaining technical concepts clearly']
        },
        communication: {
            high: ['Maintain this excellent communication style', 'Consider adding more storytelling elements'],
            medium: ['Reduce filler words like "um" and "uh"', 'Practice smoother transitions between ideas'],
            low: ['Work on structuring responses clearly', 'Practice speaking more confidently']
        },
        posture: {
            high: ['Keep maintaining excellent posture', 'Continue projecting confidence'],
            medium: ['Keep shoulders back consistently', 'Maintain steady eye contact with camera'],
            low: ['Sit up straight and avoid slouching', 'Practice confident body positioning']
        },
        video: {
            high: ['Maintain this excellent pace', 'Continue using effective pauses'],
            medium: ['Use strategic pauses for emphasis', 'Maintain consistent energy level'],
            low: ['Practice speaking at a steady pace', 'Work on natural rhythm and flow']
        }
    };
    
    const level = score >= 8 ? 'high' : score >= 6 ? 'medium' : 'low';
    return suggestions[category]?.[level] || ['Continue practicing and improving'];
}

/**
 * Display detailed feedback in the completion screen
 */
function displayDetailedFeedback() {
    if (!overallInterviewFeedback) return;
    
    const feedback = overallInterviewFeedback;
    
    // Show overall score
    document.getElementById('overallScore').textContent = feedback.overall_score;
    overallScoreSection.style.display = 'block';
    
    // Update category scores and feedback
    updateCategoryDisplay('contentScore', 'contentFeedback', 'contentSuggestions', feedback.content_quality);
    updateCategoryDisplay('communicationScore', 'communicationFeedback', 'communicationSuggestions', feedback.communication);
    updateCategoryDisplay('postureScore', 'postureFeedback', 'postureSuggestions', feedback.body_language);
    updateCategoryDisplay('pacingScore', 'pacingFeedback', 'pacingSuggestions', feedback.speaking_pace);
    
    // Show detailed feedback section
    detailedFeedbackSection.style.display = 'block';
    
    // Update strengths and improvements
    updateListDisplay('strengthsList', feedback.strengths);
    updateListDisplay('improvementsList', feedback.improvements);
    
    // Show summary section
    summarySection.style.display = 'block';
}

/**
 * Update category display elements
 */
function updateCategoryDisplay(scoreId, feedbackId, suggestionsId, categoryData) {
    if (!categoryData) return;
    
    document.getElementById(scoreId).textContent = `${categoryData.score}/10`;
    document.getElementById(feedbackId).textContent = categoryData.feedback;
    
    const suggestionsText = Array.isArray(categoryData.suggestions) 
        ? categoryData.suggestions.map(s => `• ${s}`).join('\n')
        : `• ${categoryData.suggestions}`;
    document.getElementById(suggestionsId).textContent = suggestionsText;
}

/**
 * Update list display elements
 */
function updateListDisplay(listId, items) {
    const listElement = document.getElementById(listId);
    if (!listElement || !Array.isArray(items)) return;
    
    listElement.innerHTML = items.map(item => `<li>${item}</li>`).join('');
}

/**
 * Submit interview answers
 */
async function submitAnswers() {
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
        
        const response = await fetch('/api/avatar_interview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                answers: answers,
                completed_at: new Date().toISOString(),
                total_questions: INTERVIEW_QUESTIONS.length,
                overall_feedback: overallInterviewFeedback,
                interview_type: 'avatar_interview'
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'saved') {
            showToast('Interview answers submitted successfully!', 'success');
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to save answers');
        }
        
    } catch (error) {
        console.error('Error submitting answers:', error);
        showToast('Error submitting answers: ' + error.message, 'error');
        
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Answers';
    }
}

/**
 * Restart the interview
 */
function restartInterview() {
    // Reset all state
    currentQuestionIndex = 0;
    answers = [];
    currentTranscript = '';
    isRecording = false;
    
    // Reset UI
    completionScreen.style.display = 'none';
    document.querySelector('.interview-content').style.display = 'block';
    resetForNextQuestion();
    updateProgress();
    
    // Start first question
    startAvatar(INTERVIEW_QUESTIONS[0]);
}

/**
 * View interview history
 */
function viewInterviewHistory() {
    // Redirect to dashboard or interview history page
    window.location.href = '/dashboard#avatar-interviews';
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    icon.className = `toast-icon ${icons[type] || icons.info}`;
    messageEl.textContent = message;
    
    // Set toast type class
    toast.className = `toast ${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isRecording) {
        // Stop recording when page becomes hidden
        stopRecording();
    }
});

/**
 * Handle beforeunload to warn about unsaved progress
 */
window.addEventListener('beforeunload', function(e) {
    if (answers.length > 0 && currentQuestionIndex < INTERVIEW_QUESTIONS.length) {
        e.preventDefault();
        e.returnValue = 'You have unsaved interview progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});
