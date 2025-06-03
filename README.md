# WEB-INTER-PREP

An all-in-one interview preparation platform designed to help job seekers track their interview progress, practice interviews with AI, generate personalized career roadmaps, and prepare for interviews at top tech companies.

## Features

- **User Authentication**: Secure login and registration system with profile management
- **Interview Tracking**: Track your interview progress, statuses, and performance
- **AI Interview Practice**: Practice interviews with AI-generated questions and receive personalized feedback
- **Career Roadmap Generator**: Generate customized career roadmaps with flowcharts based on your job role, experience, and target company
- **Company-Specific Preparation**: Access specialized resources for top tech companies like Google, Microsoft, Amazon, Meta, and Apple
- **Dashboard Analytics**: View interview statistics and performance metrics
- **Profile Management**: Upload profile photos and manage your personal information
- **Resume Analysis**: Upload your resume for tailored roadmap and interview suggestions

## Tech Stack

- **Backend**: Flask (Python)
- **Database**: MySQL
- **AI Integration**: Google Gemini API
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Data Visualization**: Graphviz for flowcharts
- **Authentication**: Flask session management with bcrypt for password hashing
- **File Processing**: PyPDF2 for resume parsing
- **Styling**: Font Awesome for icons

## Getting Started

### Prerequisites

- Python 3.8+
- MySQL
- Graphviz (for flowchart generation)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Install Graphviz from https://graphviz.org/download/
4. Set up your MySQL database:
   ```
   CREATE DATABASE interview_prep;
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

### AI Interview Practice
Practice interviews with AI-generated questions tailored to your job role, experience level, and target company. Receive detailed feedback and performance scores to improve your interview skills.

### Career Roadmap Generator
Generate a personalized career roadmap including:
- Interactive flowchart visualizing your career progression
- Detailed breakdown of technical skills needed at each stage
- Recommended learning resources
- Portfolio project ideas
- Interview preparation tips
- Career progression timeline

### Interview Tracking
Keep track of all your interviews, including:
- Company and position
- Interview date
- Interview status (Upcoming, Completed, Rejected, Offered)
- Performance rating
- Interview notes

### Company-Specific Preparation
Access specialized resources for top tech companies including:
- Common interview topics
- Company-specific FAQs
- Required technologies
- Interview process details
