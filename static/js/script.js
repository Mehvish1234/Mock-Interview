// Sample data for interview questions
const questions = {
    technical: [
        "What is the difference between == and === in JavaScript?",
        "Explain closures in JavaScript.",
        "What is the time complexity of binary search?",
    ],
    behavioral: [
        "Tell me about a time you faced a challenge at work.",
        "Describe a situation where you had to work with a difficult colleague.",
        "How do you handle stressful situations?",
    ],
    'problem-solving': [
        " Find the largest and smallest elements in an array.",
        " Reverse an array.",
        " Find the second largest element in an array.",
        " Check if an array is sorted.",
        " Rotate an array by k positions.",
        " Merge two sorted arrays.",
        " Find the missing number in an array of size n containing numbers from 1 to n.",
        " Find the duplicate number in an array where only one number is repeated.",
        " Move all zeros to the end of an array.",
        " Find the maximum sum of a subarray (Kadane's Algorithm)."
    ],
};

// Function to load questions dynamically
function loadQuestions(category) {
    const container = document.getElementById("questions-container");
    container.innerHTML = ''; // Clear existing questions

    const header = document.createElement('h3');
    header.classList.add('questions-header');
    header.textContent = `Practice Questions - ${capitalize(category)} Category`;
    container.appendChild(header);

    // Create a fade-in effect when loading questions
    questions[category].forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.classList.add('question-card');

        // Add a delay for staggered animation
        questionElement.style.animationDelay = `${index * 0.2}s`;

        const questionText = document.createElement('p');
        questionText.textContent = question;

        questionElement.appendChild(questionText);
        container.appendChild(questionElement);
    });
}

// Capitalize function for category titles
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Dummy function for the "Start Now" button
function startPreparation() {
    alert("Get ready to master your interviews!");
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations for elements when they come into view
    const observeElements = document.querySelectorAll('.feature-card, .category-card, .testimonial-content');
    
    // Observer for animations on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });
    
    // Observe all animation elements
    observeElements.forEach(el => {
        observer.observe(el);
    });
    
    // Add interactive particles to hero section
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        createParticles(heroSection);
    }
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }
    
    // Initialize category hover effects
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('hovered');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('hovered');
        });
    });
    
    // Testimonial slider functionality
    initTestimonialSlider();
    
    // Add scroll to top button
    addScrollToTopButton();
    
    // Add typing effect to hero title
    const heroTitle = document.querySelector('#hero h1');
    if (heroTitle) {
        setTimeout(() => {
            addTypewriterEffect(heroTitle);
        }, 1000);
    }
    
    // Initialize feature cards
    initFeatureCards();
    
    // Initialize the logout confirmation
    initLogoutConfirmation();
});

// Create floating particle effect
function createParticles(container) {
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles-container';
    
    // Add particles to container
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random position
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        
        // Random size
        const size = Math.random() * 10 + 5;
        
        // Random animation duration
        const duration = Math.random() * 10 + 10;
        
        // Random opacity
        const opacity = Math.random() * 0.5 + 0.1;
        
        // Apply styles
        particle.style.cssText = `
            position: absolute;
            top: ${posY}%;
            left: ${posX}%;
            width: ${size}px;
            height: ${size}px;
            background-color: rgba(255, 255, 255, ${opacity});
            border-radius: 50%;
            animation: float ${duration}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
            pointer-events: none;
        `;
        
        particlesContainer.appendChild(particle);
    }
    
    container.appendChild(particlesContainer);
}

// Testimonial slider
function initTestimonialSlider() {
    const slides = document.querySelectorAll('.testimonial-slide');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (!slides.length || !prevBtn || !nextBtn) return;
    
    let currentSlide = 0;
    
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.style.display = 'none';
            slide.classList.remove('active');
        });
        
        slides[index].style.display = 'block';
        setTimeout(() => {
            slides[index].classList.add('active');
        }, 100);
    }
    
    // Initialize
    showSlide(currentSlide);
    
    // Next/Prev buttons
    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    });
    
    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    });
    
    // Auto play
    let interval = setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }, 5000);
    
    // Pause on hover
    const slider = document.querySelector('.testimonial-slider');
    slider.addEventListener('mouseenter', () => {
        clearInterval(interval);
    });
    
    slider.addEventListener('mouseleave', () => {
        interval = setInterval(() => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }, 5000);
    });
}

// Add scroll to top button
function addScrollToTopButton() {
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'scroll-top-btn';
    scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(scrollBtn);
    
    // Show/hide based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
    
    // Scroll to top on click
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .scroll-top-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: var(--primary-color);
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 999;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }
        
        .scroll-top-btn:hover {
            background-color: var(--primary-hover);
            transform: translateY(-5px);
        }
        
        .scroll-top-btn.visible {
            opacity: 1;
            visibility: visible;
        }
    `;
    document.head.appendChild(style);
}

// Add typewriter effect
function addTypewriterEffect(element) {
    if (!element) return;
    
    const text = element.textContent;
    element.textContent = '';
    element.style.opacity = '1';
    
    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typeInterval);
        }
    }, 100);
}

// Feature card interactions
function initFeatureCards() {
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        // Add click effect
        card.addEventListener('click', function() {
            this.classList.add('active');
            setTimeout(() => {
                this.classList.remove('active');
            }, 200);
        });
        
        // Add hover effect
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
        
        // Add keyboard navigation
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.classList.add('active');
                setTimeout(() => {
                    this.classList.remove('active');
                }, 200);
            }
        });
    });
}

// Logout confirmation
function initLogoutConfirmation() {
    // Create the modal HTML and add it to the body
    const modalHTML = `
        <div id="logoutConfirmModal" class="custom-modal">
            <div class="custom-modal-content">
                <div class="custom-modal-header">
                    <h4><i class="fas fa-sign-out-alt me-2"></i>Confirm Logout</h4>
                    <button type="button" class="modal-close-btn">&times;</button>
                </div>
                <div class="custom-modal-body">
                    <p>Are you sure you want to log out?</p>
                </div>
                <div class="custom-modal-footer">
                    <button type="button" class="btn-cancel">Cancel</button>
                    <button type="button" class="btn-confirm">Yes, Log out</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body if it doesn't already exist
    if (!document.getElementById('logoutConfirmModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Add the modal styles
    const style = document.createElement('style');
    style.textContent = `
        .custom-modal {
            display: none;
            position: fixed;
            z-index: 9999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .custom-modal-content {
            background: white;
            margin: 15% auto;
            max-width: 400px;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.3s ease;
            overflow: hidden;
        }
        
        .custom-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: linear-gradient(135deg, #4285f4, #34a853);
            color: white;
        }
        
        .custom-modal-header h4 {
            margin: 0;
            font-size: 1.1rem;
        }
        
        .modal-close-btn {
            background: transparent;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            line-height: 1;
        }
        
        .custom-modal-body {
            padding: 20px;
            font-size: 1rem;
        }
        
        .custom-modal-footer {
            display: flex;
            justify-content: flex-end;
            padding: 15px 20px;
            border-top: 1px solid #eee;
            gap: 10px;
        }
        
        .btn-cancel {
            padding: 8px 16px;
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-cancel:hover {
            background-color: #e9ecef;
        }
        
        .btn-confirm {
            padding: 8px 16px;
            background: linear-gradient(135deg, #4285f4, #34a853);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-confirm:hover {
            background: linear-gradient(135deg, #34a853, #4285f4);
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
    `;
    document.head.appendChild(style);
    
    // Get modal elements
    const modal = document.getElementById('logoutConfirmModal');
    const closeBtn = modal.querySelector('.modal-close-btn');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');
    
    // Store current logout URL
    let currentLogoutUrl = '';
    
    // Find all logout links
    const logoutLinks = document.querySelectorAll('a[href*="logout"]');
    
    // Add click event listeners to all logout links
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            // Prevent the default link behavior
            event.preventDefault();
            
            // Store the logout URL
            currentLogoutUrl = this.href;
            
            // Show the modal
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });
    });
    
    // Close modal when clicking the close button
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    });
    
    // Close modal when clicking the cancel button
    cancelBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    });
    
    // Handle confirm logout
    confirmBtn.addEventListener('click', function() {
        // Navigate to the logout URL
        if (currentLogoutUrl) {
            window.location.href = currentLogoutUrl;
        }
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}
