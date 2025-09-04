/**
 * Usage Tracking JavaScript Library
 * Automatically tracks user interactions with different features
 */

class UsageTracker {
    constructor() {
        this.baseUrl = '/api';
        this.init();
    }

    init() {
        // Auto-track page visits
        this.trackPageVisit();
        
        // Set up event listeners for common interactions
        this.setupEventListeners();
    }

    trackPageVisit() {
        const page = window.location.pathname;
        
        // Track specific feature page visits
        if (page.includes('/dsa')) {
            this.trackDSAVisit();
        } else if (page.includes('/english_booster')) {
            this.trackEnglishBoosterVisit();
        } else if (page.includes('/company_prep') || page.includes('/company/')) {
            this.trackCompanyPrepVisit();
        }
    }

    setupEventListeners() {
        // Track DSA problem interactions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.dsa-problem-solve, .solve-problem')) {
                this.handleDSAProblemSolve(e.target);
            }
            
            if (e.target.matches('.english-exercise-complete, .complete-exercise')) {
                this.handleEnglishExerciseComplete(e.target);
            }
            
            if (e.target.matches('.company-prep-complete, .prep-complete')) {
                this.handleCompanyPrepComplete(e.target);
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.resume-upload-form')) {
                this.handleResumeUpload(e.target);
            }
        });
    }

    // DSA Tracking Methods
    trackDSAVisit() {
        console.log('📊 Tracking DSA page visit');
    }

    handleDSAProblemSolve(element) {
        const problemTitle = element.dataset.problemTitle || 'Unknown Problem';
        const category = element.dataset.category || 'General';
        const difficulty = element.dataset.difficulty || 'Medium';
        const solved = element.dataset.solved === 'true';

        this.trackDSAPractice(problemTitle, category, difficulty, solved);
    }

    async trackDSAPractice(problemTitle, category = 'General', difficulty = 'Medium', solved = false) {
        try {
            const response = await fetch(`${this.baseUrl}/track_dsa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    problem_title: problemTitle,
                    category: category,
                    difficulty: difficulty,
                    solved: solved
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                console.log('✅ DSA practice tracked:', problemTitle);
                this.showTrackingNotification('DSA practice recorded!');
            }
        } catch (error) {
            console.error('❌ Error tracking DSA practice:', error);
        }
    }

    // English Booster Tracking Methods
    trackEnglishBoosterVisit() {
        console.log('📊 Tracking English Booster page visit');
    }

    handleEnglishExerciseComplete(element) {
        const sessionType = element.dataset.sessionType || 'Grammar';
        const score = parseFloat(element.dataset.score) || 0;
        const exercises = parseInt(element.dataset.exercises) || 1;

        this.trackEnglishBoosterSession(sessionType, score, exercises);
    }

    async trackEnglishBoosterSession(sessionType = 'Grammar', score = 0, exercises = 1) {
        try {
            const response = await fetch(`${this.baseUrl}/track_english_booster`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_type: sessionType,
                    score: score,
                    exercises: exercises
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                console.log('✅ English Booster session tracked:', sessionType);
                this.showTrackingNotification('English practice recorded!');
            }
        } catch (error) {
            console.error('❌ Error tracking English Booster session:', error);
        }
    }

    // Company Prep Tracking Methods
    trackCompanyPrepVisit() {
        // Extract company name from URL or page content
        const urlParts = window.location.pathname.split('/');
        const companyName = urlParts.includes('company') ? 
            urlParts[urlParts.indexOf('company') + 1] : 'General';
        
        console.log('📊 Tracking company prep visit:', companyName);
    }

    handleCompanyPrepComplete(element) {
        const companyName = element.dataset.company || 'Unknown Company';
        const prepType = element.dataset.prepType || 'General';
        const progress = parseFloat(element.dataset.progress) || 25;

        this.trackCompanyPrepSession(companyName, prepType, progress);
    }

    async trackCompanyPrepSession(companyName, prepType = 'General', progress = 25) {
        try {
            const response = await fetch(`${this.baseUrl}/track_company_prep`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company_name: companyName,
                    prep_type: prepType,
                    progress: progress
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                console.log('✅ Company prep session tracked:', companyName);
                this.showTrackingNotification('Company prep progress saved!');
            }
        } catch (error) {
            console.error('❌ Error tracking company prep session:', error);
        }
    }

    // Resume Upload Tracking
    handleResumeUpload(form) {
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) {
            const file = fileInput.files[0];
            this.trackResumeUpload(file.name, file.name, file.size);
        }
    }

    async trackResumeUpload(filename, originalFilename, fileSize) {
        try {
            const response = await fetch(`${this.baseUrl}/track_resume_upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: filename,
                    original_filename: originalFilename,
                    file_size: fileSize
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                console.log('✅ Resume upload tracked:', filename);
                this.showTrackingNotification('Resume upload recorded!');
            }
        } catch (error) {
            console.error('❌ Error tracking resume upload:', error);
        }
    }

    // Utility Methods
    showTrackingNotification(message) {
        // Create a small notification
        const notification = document.createElement('div');
        notification.className = 'tracking-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Public API for manual tracking
    static trackDSA(problemTitle, category, difficulty, solved) {
        const tracker = new UsageTracker();
        return tracker.trackDSAPractice(problemTitle, category, difficulty, solved);
    }

    static trackEnglishBooster(sessionType, score, exercises) {
        const tracker = new UsageTracker();
        return tracker.trackEnglishBoosterSession(sessionType, score, exercises);
    }

    static trackCompanyPrep(companyName, prepType, progress) {
        const tracker = new UsageTracker();
        return tracker.trackCompanyPrepSession(companyName, prepType, progress);
    }

    static trackResumeUpload(filename, originalFilename, fileSize) {
        const tracker = new UsageTracker();
        return tracker.trackResumeUpload(filename, originalFilename, fileSize);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.usageTracker = new UsageTracker();
});

// Export for manual usage
window.UsageTracker = UsageTracker;
