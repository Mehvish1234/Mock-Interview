import os
import sys
import pymysql
import json
import re
import mysql.connector
from mysql.connector import Error
import requests
import google.generativeai as genai
from flask import Flask, render_template, redirect, url_for, flash, request, session, jsonify, abort, send_from_directory
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, TextAreaField, SelectField, DateField, FileField
from wtforms.validators import DataRequired, Email
import bcrypt
from flask_sqlalchemy import SQLAlchemy
import random
from datetime import datetime
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import sqlite3
import whisper
import tempfile

# For the career roadmap feature, you might need to install:
# pip install PyMuPDF (for PDF parsing)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database configuration
if os.environ.get('RENDER'):
    # Production database URL from Render
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
else:
    # Local database URL - using SQLite instead of MySQL for easier setup
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///interview_prep.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.environ.get('SECRET_KEY', '\x8bO|\xc3\xe3\x99&h%\xb9\xebU\xf9\x1eb\xee$\x85\xf1Z\x95\x85\xe3\xdd')

# Add these configurations after the existing app configurations
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
PROFILE_PHOTOS_FOLDER = os.path.join(os.getcwd(), 'static', 'profile_photos')
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'ogg', 'm4a'}
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROFILE_PHOTOS_FOLDER'] = PROFILE_PHOTOS_FOLDER
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,  # Helps detect disconnections
    'pool_recycle': 3600,   # Recycle connections after 1 hour
    'connect_args': {} # MySQL doesn't need check_same_thread
}

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROFILE_PHOTOS_FOLDER, exist_ok=True)
print(f"Profile photos folder: {PROFILE_PHOTOS_FOLDER}")

# Configure Gemini API with the correct API key from environment variable
genai.configure(api_key=os.environ.get('GEMINI_API_KEY', 'AIzaSyD8IqB_QpUaE1XQjvjJD8511szRJMTSHm0'))

def get_db_connection():
    """Get a new database connection"""
    try:
        if os.environ.get('RENDER'):
            # Parse DATABASE_URL for production
            db_url = os.environ.get('DATABASE_URL')
            connection = pymysql.connect(
                host=db_url.split('@')[1].split('/')[0],
                user=db_url.split('://')[1].split(':')[0],
                password=db_url.split(':')[2].split('@')[0],
                database=db_url.split('/')[-1],
                cursorclass=pymysql.cursors.DictCursor
            )
        else:
            # Local database connection using SQLite
            connection = sqlite3.connect('interview_prep.db')
            connection.row_factory = sqlite3.Row
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Add SQLite-specific configuration
def get_db_connection_status():
    """Get database connection status information"""
    try:
        connection = sqlite3.connect('interview_prep.db')
        with connection:
            cursor = connection.cursor()
            cursor.execute("SELECT sqlite_version()")
            version = cursor.fetchone()[0]
        return True, version
    except Exception as e:
        return False, str(e)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.LargeBinary, nullable=False)
    profile_photo = db.Column(db.String(255), nullable=True)
    interviews = db.relationship('Interview', backref='user', lazy=True)
    ai_interviews = db.relationship('AIInterview', backref='user', lazy=True)

class Interview(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(100), nullable=False)
    position = db.Column(db.String(100), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='Upcoming')
    performance = db.Column(db.Integer, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class AIInterview(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_role = db.Column(db.String(100), nullable=False)
    experience_level = db.Column(db.String(50), nullable=False)
    target_company = db.Column(db.String(100), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    questions = db.Column(db.Text, nullable=False)
    answers = db.Column(db.Text, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    performance = db.Column(db.Integer, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class RegistrationForm(FlaskForm):
    name = StringField("Name", validators=[DataRequired()])
    email = StringField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Register")

class LoginForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Login")

class InterviewForm(FlaskForm):
    company = StringField("Company", validators=[DataRequired()])
    position = StringField("Position", validators=[DataRequired()])
    date = DateField("Interview Date", validators=[DataRequired()], format='%Y-%m-%d')
    notes = TextAreaField("Notes")
    status = SelectField("Status", choices=[('Upcoming', 'Upcoming'), ('Completed', 'Completed'), ('Rejected', 'Rejected'), ('Offered', 'Offered')])
    performance = SelectField("Performance (1-10)", choices=[(str(i), str(i)) for i in range(1, 11)], validators=[])
    submit = SubmitField("Save")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        name = form.name.data
        email = form.email.data
        password = form.password.data
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash("An account with this email already exists. Please log in instead.", "warning")
            return redirect(url_for('login'))
        
        # Hash password and create new user
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        new_user = User(name=name, email=email, password=hashed_password)
        
        try:
            db.session.add(new_user)
            db.session.commit()
            flash("Registration successful! Please log in.", "success")
            return redirect(url_for('login'))
        except Exception as e:
            flash("An error occurred while registering. Please try again.", "danger")
            print("Database Error:", str(e))
            db.session.rollback()
            
            # Try to diagnose and fix common issues
            try:
                # Create tables if they don't exist
                with app.app_context():
                    db.create_all()
                flash("Database tables have been refreshed. Please try registering again.", "info")
            except Exception as table_error:
                print("Failed to create tables:", str(table_error))
    
    return render_template('register.html', form=form)

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        
        try:
            user = User.query.filter_by(email=email).first()
            
            if user and bcrypt.checkpw(password.encode('utf-8'), user.password):
                session['user_id'] = user.id
                flash("Login successful!", "success")
                return redirect(url_for('dashboard'))
            else:
                flash("Login unsuccessful. Please check your email and password.", "danger")
                
        except Exception as e:
            flash("A database error occurred. Please try again later.", "danger")
            print("Database error during login:", str(e))
            
            # Try to fix database connection issues
            try:
                # Refresh connection and tables if needed
                db.session.rollback()
                with app.app_context():
                    db.create_all()
            except Exception as repair_error:
                print("Failed to repair database:", str(repair_error))
    
    return render_template('login.html', form=form)

@app.route('/resume_template')
def resume_template():
    return render_template('resume_template.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return render_template('dashboard.html', user=None, interviews=[], stats={
            'total': 0,
            'completed': 0,
            'upcoming': 0,
            'offers': 0,
            'avg_performance': 0
        }, not_logged_in=True)
    
    user = User.query.get(session['user_id'])
    # Get the user's interviews for the dashboard
    interviews = Interview.query.filter_by(user_id=user.id).order_by(Interview.date.desc()).all()
    
    # Calculate some statistics
    completed_interviews = [i for i in interviews if i.status == 'Completed']
    upcoming_interviews = [i for i in interviews if i.status == 'Upcoming']
    offers = [i for i in interviews if i.status == 'Offered']
    
    avg_performance = 0
    if completed_interviews:
        performances = [i.performance for i in completed_interviews if i.performance]
        if performances:
            avg_performance = sum(performances) / len(performances)
    
    stats = {
        'total': len(interviews),
        'completed': len(completed_interviews),
        'upcoming': len(upcoming_interviews),
        'offers': len(offers),
        'avg_performance': round(avg_performance, 1)
    }
    
    return render_template('dashboard.html', user=user, interviews=interviews, stats=stats)

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash("You have been logged out successfully.", "info")
    return redirect(url_for('login'))

@app.route('/dsa')
def dsa():
    return render_template('dsa.html')

@app.route('/more')
def more():
    return render_template('more.html')

@app.route('/interview_progress', methods=['GET', 'POST'])
def interview_progress():
    if 'user_id' not in session:
        flash("Please log in to access interview progress tracking.", "warning")
        return redirect(url_for('login'))
    
    form = InterviewForm()
    if form.validate_on_submit():
        new_interview = Interview(
            company=form.company.data,
            position=form.position.data,
            date=form.date.data,
            notes=form.notes.data,
            status=form.status.data,
            user_id=session['user_id']
        )
        
        if form.status.data == 'Completed':
            new_interview.performance = int(form.performance.data)
        
        db.session.add(new_interview)
        db.session.commit()
        flash("Interview added successfully!", "success")
        return redirect(url_for('interview_progress'))
    
    # Get all interviews for the current user
    interviews = Interview.query.filter_by(user_id=session['user_id']).order_by(Interview.date.desc()).all()
    
    return render_template('interview_progress.html', form=form, interviews=interviews)

@app.route('/edit_interview/<int:id>', methods=['GET', 'POST'])
def edit_interview(id):
    if 'user_id' not in session:
        flash("Please log in to edit interviews.", "warning")
        return redirect(url_for('login'))
    
    interview = Interview.query.get_or_404(id)
    # Make sure the interview belongs to the current user
    if interview.user_id != session['user_id']:
        flash("You do not have permission to edit this interview.", "danger")
        return redirect(url_for('interview_progress'))
    
    form = InterviewForm(obj=interview)
    if form.validate_on_submit():
        interview.company = form.company.data
        interview.position = form.position.data
        interview.date = form.date.data
        interview.notes = form.notes.data
        interview.status = form.status.data
        
        if form.status.data == 'Completed':
            interview.performance = int(form.performance.data)
        
        db.session.commit()
        flash("Interview updated successfully!", "success")
        return redirect(url_for('interview_progress'))
    
    return render_template('edit_interview.html', form=form, interview=interview)

@app.route('/delete_interview/<int:id>', methods=['POST'])
def delete_interview(id):
    if 'user_id' not in session:
        flash("Please log in to delete interviews.", "warning")
        return redirect(url_for('login'))
    
    interview = Interview.query.get_or_404(id)
    # Make sure the interview belongs to the current user
    if interview.user_id != session['user_id']:
        flash("You do not have permission to delete this interview.", "danger")
        return redirect(url_for('interview_progress'))
    
    db.session.delete(interview)
    db.session.commit()
    flash("Interview deleted successfully!", "success")
    return redirect(url_for('interview_progress'))

def generate_interview_questions(job_role, experience_level, target_company, num_questions):
    """Generate interview questions using Gemini model"""
    prompt = f"""
    You are an expert interviewer at {target_company}. Generate exactly {num_questions} interview questions
    for a {experience_level} {job_role}. Cover technical and behavioral skills.
    
    The questions should be challenging but appropriate for the experience level.
    Include a mix of:
    - Technical knowledge
    - Problem-solving
    - System design (if applicable)
    - Behavioral scenarios
    - Role-specific skills
    
    Format each question as a complete, clear sentence.
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        questions = [q.strip() for q in response.text.strip().split("\n") if q.strip()]
        return questions[:int(num_questions)]
    except Exception as e:
        print(f"Error generating questions: {e}")
        return []

def evaluate_answer(question, answer):
    """Evaluate interview answer using Gemini model"""
    prompt = f"""
    You are an expert interview evaluator at a top tech company. Review the candidate's answer and provide structured feedback.
    
    Question: {question}
    Answer: {answer}
    
    Respond in this format:
    <score>Score: [0-10]</score>
    <summary>One-line summary of performance</summary>
    <strengths>
    - Key strength 1
    - Key strength 2
    </strengths>
    <improvements>
    - Improvement tip 1
    - Improvement tip 2
    </improvements>
    <detailed_feedback>2-3 sentences of specific, actionable feedback</detailed_feedback>
    """

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating feedback: {e}")
        return "Error generating feedback. Please try again."

@app.route('/continue_interview/<int:interview_id>')
def continue_interview(interview_id):
    """Route to continue an incomplete interview"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Get the interview
    interview = AIInterview.query.get_or_404(interview_id)
    
    # Check if user owns this interview
    if interview.user_id != session['user_id']:
        flash('You are not authorized to access this interview.', 'error')
        return redirect(url_for('ai_interview'))
    
    # Get questions and answers
    questions = interview.questions.split("\n") if interview.questions else []
    answers = interview.answers.split("\nQ: ") if interview.answers else []
    
    # Calculate the next unanswered question index
    next_question_index = len(answers)
    if next_question_index >= len(questions):
        flash('This interview is already completed.', 'info')
        return redirect(url_for('ai_interview'))
    
    # Prepare data for frontend
    interview_data = {
        'interview_id': interview.id,
        'job_role': interview.job_role,
        'experience_level': interview.experience_level,
        'target_company': interview.target_company,
        'questions': questions,
        'next_question_index': next_question_index,
        'total_questions': len(questions),
        'completed_answers': answers
    }
    
    return render_template('ai_interview.html', 
                         continue_data=interview_data,
                         ai_interviews=AIInterview.query.filter_by(user_id=session['user_id']).order_by(AIInterview.date.desc()).all())

@app.route('/ai_interview', methods=['GET', 'POST'])
def ai_interview():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        if 'start_interview' in request.form:
            # Start new interview
            job_role = request.form.get('job_role')
            experience_level = request.form.get('experience_level')
            target_company = request.form.get('target_company')
            num_questions = request.form.get('num_questions', '5')

            # Generate questions
            questions = generate_interview_questions(job_role, experience_level, target_company, int(num_questions))
            
            if not questions:
                return jsonify({
                    'status': 'error',
                    'message': 'Failed to generate questions. Please try again.'
                })

            # Create new interview record
            interview = AIInterview(
                user_id=session['user_id'],
                job_role=job_role,
                experience_level=experience_level,
                target_company=target_company,
                questions="\n".join(questions),
                date=datetime.utcnow()
            )
            db.session.add(interview)
            db.session.commit()
            
            return jsonify({
                'status': 'success',
                'interview_id': interview.id,
                'questions': questions,
                'current_index': 0
            })
        
        elif 'submit_answer' in request.form:
            # Submit answer for evaluation
            interview_id = request.form.get('interview_id')
            question = request.form.get('question')
            answer = request.form.get('answer')
            question_index = request.form.get('question_index', 0)

            if not all([interview_id, question, answer]):
                return jsonify({
                    'status': 'error',
                    'message': 'Missing required fields'
                })

            # Get interview record
            interview = AIInterview.query.get_or_404(interview_id)
            
            # Evaluate answer
            feedback = evaluate_answer(question, answer)
            
            # Update interview record
            if not interview.answers:
                interview.answers = answer
                interview.feedback = feedback
            else:
                interview.answers += f"\nQ: {question}\nA: {answer}"
                interview.feedback += f"\n\n{feedback}"
            
            # Extract score from feedback
            try:
                score_text = feedback.split('<score>')[1].split('</score>')[0]
                score = int(score_text.split(':')[1].strip().split('/')[0])
                if not interview.performance:
                    interview.performance = score
                else:
                    # Average with previous scores
                    current_scores = interview.performance.split(',') if isinstance(interview.performance, str) else [interview.performance]
                    scores = [float(s) for s in current_scores] + [score]
                    interview.performance = sum(scores) / len(scores)
            except:
                pass
                
            db.session.commit()

            # Get total number of questions
            total_questions = len(interview.questions.split("\n"))
            is_complete = int(question_index) + 1 >= total_questions
            
            return jsonify({
                'status': 'success',
                'feedback': feedback,
                'is_complete': is_complete
            })
    
    # GET request - show interview page
    ai_interviews = AIInterview.query.filter_by(user_id=session['user_id']).order_by(AIInterview.date.desc()).all()
    return render_template('ai_interview.html', ai_interviews=ai_interviews)

@app.route('/ai_interview/<int:interview_id>/feedback')
def get_interview_feedback(interview_id):
    """Get detailed feedback for an interview"""
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Not authenticated'}), 401
    
    interview = AIInterview.query.get_or_404(interview_id)
    if interview.user_id != session['user_id']:
        return jsonify({'status': 'error', 'message': 'Not authorized'}), 403
    
    # Format feedback HTML
    feedback_html = f"""
    <div class="feedback-summary card mb-4">
        <div class="card-body">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h4 class="card-title mb-3">Interview Summary</h4>
                    <p class="mb-2"><strong>Role:</strong> {interview.job_role}</p>
                    <p class="mb-2"><strong>Company:</strong> {interview.target_company}</p>
                    <p class="mb-2"><strong>Experience Level:</strong> {interview.experience_level}</p>
                    <p class="mb-0"><strong>Date:</strong> {interview.date.strftime('%Y-%m-%d %H:%M')}</p>
                </div>
                <div class="col-md-4 text-center">
                    <div class="performance-indicator">
                        <div class="display-4 mb-2">{interview.performance or 'N/A'}</div>
                        <p class="text-muted">Overall Score</p>
                        {f'<div class="progress"><div class="progress-bar bg-success" style="width: {float(interview.performance) * 10}%"></div></div>' if interview.performance else ''}
                    </div>
                </div>
            </div>
        </div>
    </div>
    """
    
    if interview.questions and interview.answers:
        questions = interview.questions.split("\n")
        answers = interview.answers.split("\nQ: ")
        feedbacks = interview.feedback.split("\n\n") if interview.feedback else []
        
        feedback_html += '<div class="questions-section">'
        
        for i, (question, feedback) in enumerate(zip(questions, feedbacks)):
            answer = answers[i] if i < len(answers) else "No answer provided"
            
            feedback_html += f"""
            <div class="card mb-3 question-card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="fas fa-question-circle text-primary me-2"></i>
                        Question {i+1}
                    </h5>
                </div>
                <div class="card-body">
                    <div class="question-text mb-3">
                        <p class="lead">{question}</p>
                    </div>
                    <div class="answer-text mb-3">
                        <h6 class="text-muted mb-2">Your Answer:</h6>
                        <div class="p-3 bg-light rounded">{answer}</div>
                    </div>
                    <div class="feedback-section">
                        <h6 class="text-muted mb-2">Feedback:</h6>
                        <div class="feedback-content">
                            {feedback}
                        </div>
                    </div>
                </div>
            </div>
            """
        
        feedback_html += '</div>'
    
    return jsonify({
        'status': 'success',
        'feedback': feedback_html
    })

@app.route('/company_prep')
def company_prep():
    companies = [
        {
            'name': 'Google',
            'logo': 'google.png',
            'color': '#4285F4',
            'gradient': 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
            'faqs': [
                {'question': 'What is Google\'s interview process?', 'answer': 'Google\'s interview process typically includes phone screening, technical interviews, and onsite interviews focusing on algorithms, system design, and behavioral questions.'},
                {'question': 'What programming languages does Google prefer?', 'answer': 'Google primarily uses Python, Java, C++, and Go. However, they focus on problem-solving skills rather than specific languages.'},
                {'question': 'What are common Google interview topics?', 'answer': 'Common topics include data structures, algorithms, system design, and behavioral questions about past experiences.'}
            ],
            'resources': [
                {'name': 'Google Interview Guide', 'file': 'google_guide.pdf'},
                {'name': 'Sample Questions', 'file': 'google_questions.pdf'},
                {'name': 'System Design Guide', 'file': 'google_system_design.pdf'}
            ]
        },
        {
            'name': 'Microsoft',
            'logo': 'microsoft.png',
            'color': '#00A4EF',
            'gradient': 'linear-gradient(135deg, #00A4EF 0%, #7FBA00 100%)',
            'faqs': [
                {'question': 'What is Microsoft\'s interview process?', 'answer': 'Microsoft\'s process includes phone screening, technical interviews, and onsite interviews focusing on coding, system design, and behavioral questions.'},
                {'question': 'What technologies does Microsoft focus on?', 'answer': 'Microsoft focuses on C#, .NET, Azure, and web technologies, but also values problem-solving skills.'},
                {'question': 'What are common Microsoft interview topics?', 'answer': 'Topics include algorithms, data structures, system design, and behavioral questions.'}
            ],
            'resources': [
                {'name': 'Microsoft Interview Guide', 'file': 'microsoft_guide.pdf'},
                {'name': 'Sample Questions', 'file': 'microsoft_questions.pdf'},
                {'name': 'Azure Guide', 'file': 'microsoft_azure.pdf'}
            ]
        },
        {
            'name': 'Amazon',
            'logo': 'amazon.png',
            'color': '#FF9900',
            'gradient': 'linear-gradient(135deg, #FF9900 0%, #232F3E 100%)',
            'faqs': [
                {'question': 'What is Amazon\'s interview process?', 'answer': 'Amazon\'s process includes online assessment, phone interviews, and onsite interviews focusing on leadership principles and technical skills.'},
                {'question': 'What are Amazon\'s leadership principles?', 'answer': 'Amazon has 16 leadership principles that are crucial for interviews, including customer obsession and ownership.'},
                {'question': 'What are common Amazon interview topics?', 'answer': 'Topics include system design, algorithms, and behavioral questions based on leadership principles.'}
            ],
            'resources': [
                {'name': 'Amazon Interview Guide', 'file': 'amazon_guide.pdf'},
                {'name': 'Leadership Principles', 'file': 'amazon_principles.pdf'},
                {'name': 'System Design Guide', 'file': 'amazon_system_design.pdf'}
            ]
        },
        {
            'name': 'Meta',
            'logo': 'meta.png',
            'color': '#1877F2',
            'gradient': 'linear-gradient(135deg, #1877F2 0%, #166FE5 100%)',
            'faqs': [
                {'question': 'What is Meta\'s interview process?', 'answer': 'Meta\'s process includes phone screening, technical interviews, and onsite interviews focusing on coding and system design.'},
                {'question': 'What technologies does Meta use?', 'answer': 'Meta primarily uses React, PHP, Python, and various AI/ML technologies.'},
                {'question': 'What are common Meta interview topics?', 'answer': 'Topics include algorithms, system design, and behavioral questions about past experiences.'}
            ],
            'resources': [
                {'name': 'Meta Interview Guide', 'file': 'meta_guide.pdf'},
                {'name': 'Sample Questions', 'file': 'meta_questions.pdf'},
                {'name': 'System Design Guide', 'file': 'meta_system_design.pdf'}
            ]
        },
        {
            'name': 'Apple',
            'logo': 'apple.png',
            'color': '#000000',
            'gradient': 'linear-gradient(135deg, #000000 0%, #333333 100%)',
            'faqs': [
                {'question': 'What is Apple\'s interview process?', 'answer': 'Apple\'s process includes phone screening, technical interviews, and onsite interviews focusing on problem-solving and innovation.'},
                {'question': 'What technologies does Apple focus on?', 'answer': 'Apple focuses on iOS development, Swift, Objective-C, and hardware-software integration.'},
                {'question': 'What are common Apple interview topics?', 'answer': 'Topics include algorithms, system design, and questions about user experience and design.'}
            ],
            'resources': [
                {'name': 'Apple Interview Guide', 'file': 'apple_guide.pdf'},
                {'name': 'Sample Questions', 'file': 'apple_questions.pdf'},
                {'name': 'iOS Development Guide', 'file': 'apple_ios.pdf'}
            ]
        }
    ]
    return render_template('company_prep.html', companies=companies)

@app.route('/company/<company>')
def company_detail(company):
    companies = [
        {
            'name': 'Google',
            'logo': 'google.png',
            'color': '#4285F4',
            'gradient': 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
            'faqs': [
                {'question': 'What is Google\'s interview process?', 'answer': 'Google\'s interview process typically includes phone screening, technical interviews, and onsite interviews focusing on algorithms, system design, and behavioral questions.'},
                {'question': 'What programming languages does Google prefer?', 'answer': 'Google primarily uses Python, Java, C++, and Go. However, they focus on problem-solving skills rather than specific languages.'},
                {'question': 'What are common Google interview topics?', 'answer': 'Common topics include data structures, algorithms, system design, and behavioral questions about past experiences.'}
            ],
            'resources': [
                {'name': 'Google Interview Guide', 'file': 'google_guide.pdf'},
                {'name': 'Sample Questions', 'file': 'google_questions.pdf'},
                {'name': 'System Design Guide', 'file': 'google_system_design.pdf'}
            ]
        },
        {
            'name': 'Microsoft',
            'logo': 'microsoft.png',
            'color': '#00A4EF',
            'gradient': 'linear-gradient(135deg, #00A4EF 0%, #7FBA00 100%)',
            'faqs': [
                {'question': 'What is Microsoft\'s interview process?', 'answer': 'Microsoft\'s process includes phone screening, technical interviews, and onsite interviews focusing on coding, system design, and behavioral questions.'},
                {'question': 'What technologies does Microsoft focus on?', 'answer': 'Microsoft focuses on C#, .NET, Azure, and web technologies, but also values problem-solving skills.'},
                {'question': 'What are common Microsoft interview topics?', 'answer': 'Topics include algorithms, data structures, system design, and behavioral questions.'}
            ],
            'resources': [
                {'name': 'Microsoft Interview Guide', 'file': 'microsoft_guide.pdf'},
                {'name': 'Sample Questions', 'file': 'microsoft_questions.pdf'},
                {'name': 'Azure Guide', 'file': 'microsoft_azure.pdf'}
            ]
        },
        {
            'name': 'Amazon',
            'logo': 'amazon.png',
            'color': '#FF9900',
            'gradient': 'linear-gradient(135deg, #FF9900 0%, #232F3E 100%)',
            'faqs': [
                {'question': 'What is Amazon\'s interview process?', 'answer': 'Amazon\'s process includes online assessment, phone interviews, and onsite interviews focusing on leadership principles and technical skills.'},
                {'question': 'What are Amazon\'s leadership principles?', 'answer': 'Amazon has 16 leadership principles that are crucial for interviews, including customer obsession and ownership.'},
                {'question': 'What are common Amazon interview topics?', 'answer': 'Topics include system design, algorithms, and behavioral questions based on leadership principles.'}
            ],
            'resources': [
                {'name': 'Amazon Interview Guide', 'file': 'amazon_guide.pdf'},
                {'name': 'Leadership Principles', 'file': 'amazon_principles.pdf'},
                {'name': 'System Design Guide', 'file': 'amazon_system_design.pdf'}
            ]
        },
        {
            'name': 'Meta',
            'logo': 'meta.png',
            'color': '#1877F2',
            'gradient': 'linear-gradient(135deg, #1877F2 0%, #166FE5 100%)',
            'faqs': [
                {'question': 'What is Meta\'s interview process?', 'answer': 'Meta\'s process includes phone screening, technical interviews, and onsite interviews focusing on coding and system design.'},
                {'question': 'What technologies does Meta use?', 'answer': 'Meta primarily uses React, PHP, Python, and various AI/ML technologies.'},
                {'question': 'What are common Meta interview topics?', 'answer': 'Topics include algorithms, system design, and behavioral questions about past experiences.'}
            ],
            'resources': [
                {'name': 'Meta Interview Guide', 'file': 'meta_guide.pdf'},
                {'name': 'Sample Questions', 'file': 'meta_questions.pdf'},
                {'name': 'System Design Guide', 'file': 'meta_system_design.pdf'}
            ]
        },
        {
            'name': 'Apple',
            'logo': 'apple.png',
            'color': '#000000',
            'gradient': 'linear-gradient(135deg, #000000 0%, #333333 100%)',
            'faqs': [
                {'question': 'What is Apple\'s interview process?', 'answer': 'Apple\'s process includes phone screening, technical interviews, and onsite interviews focusing on problem-solving and innovation.'},
                {'question': 'What technologies does Apple focus on?', 'answer': 'Apple focuses on iOS development, Swift, Objective-C, and hardware-software integration.'},
                {'question': 'What are common Apple interview topics?', 'answer': 'Topics include algorithms, system design, and questions about user experience and design.'}
            ],
            'resources': [
                {'name': 'Apple Interview Guide', 'file': 'apple_guide.pdf'},
                {'name': 'Sample Questions', 'file': 'apple_questions.pdf'},
                {'name': 'iOS Development Guide', 'file': 'apple_ios.pdf'}
            ]
        }
    ]
    
    company_data = next((c for c in companies if c['name'].lower() == company), None)
    if company_data is None:
        abort(404)
    
    return render_template('company_detail.html', company=company_data)

@app.route('/resources')
def resources():
    return render_template('resources.html')

@app.route('/career_roadmap', methods=['GET', 'POST'])
def career_roadmap():
    roadmap_data = None
    debug_info = None
    
    if request.method == 'POST':
        role = request.form.get('role')
        experience = request.form.get('experience')
        company = request.form.get('company')
        resume_text = ""
        
        # Handle resume upload if provided
        if 'resume' in request.files:
            resume_file = request.files['resume']
            if resume_file and resume_file.filename != '':
                try:
                    if resume_file.filename.endswith('.pdf'):
                        # Extract text from PDF
                        import fitz  # PyMuPDF
                        pdf_document = fitz.open(stream=resume_file.read(), filetype="pdf")
                        resume_text = ""
                        for page in pdf_document:
                            resume_text += page.get_text()
                    elif resume_file.filename.endswith('.txt'):
                    # Read text file directly
                        resume_text = resume_file.read().decode('utf-8')
                except Exception as e:
                    flash(f"Error processing resume: {str(e)}", "warning")
                
        # Create the prompt for generating the roadmap
        prompt = f"""
        Create a detailed career roadmap for a {role} position at {company} with {experience} years of experience.
        The response should be a JSON object with the following structure:
        {{
            "title": "Career Roadmap for [Role] at [Company]",
            "overview": "Brief overview of the roadmap",
            "stages": [
                {{
                    "name": "Stage name",
                    "timeframe": "Expected duration",
                    "description": "Stage description",
                    "milestones": [
                        {{
                            "title": "Milestone title",
                            "description": "Milestone description",
                            "tasks": ["Task 1", "Task 2", ...]
                        }}
                    ],
                    "skills": ["Skill 1", "Skill 2", ...],
                    "resources": ["Resource 1", "Resource 2", ...]
                }}
            ],
            "daily_practices": ["Practice 1", "Practice 2", ...],
            "long_term_goals": ["Goal 1", "Goal 2", ...]
        }}

        If resume text is provided, use it to personalize the roadmap:
        {resume_text if resume_text else "No resume provided"}

        Return ONLY the JSON object, no additional text or formatting.
        """
        
        print("Sending request to Gemini API...")
        
        try:
            # Create the model and generate content
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            print(f"Response received from Gemini API: {response_text[:100]}...")
            
            # Try to find a JSON block with regex
            import re
            json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1).strip()
                print("Extracted JSON from code block")
            else:
                # If no code block found, treat the entire response as JSON
                json_str = response_text
                print("Using entire response as JSON")
            
            # Clean up potential non-JSON parts
            json_str = re.sub(r'^```.*?$', '', json_str, flags=re.MULTILINE)
            json_str = re.sub(r'^```$', '', json_str, flags=re.MULTILINE)
            
            # Parse JSON
            roadmap_data = json.loads(json_str)
            print("JSON successfully parsed")
            
            # Store the roadmap in the database if user is logged in
            if 'user_id' in session:
                try:
                    # Use SQLAlchemy to store the roadmap
                    roadmap = CareerRoadmap(
                        user_id=session['user_id'],
                        job_role=role,
                        experience=experience,
                        target_company=company,
                        roadmap_data=json.dumps(roadmap_data),
                        created_at=datetime.utcnow()
                    )
                    db.session.add(roadmap)
                    db.session.commit()
                except Exception as e:
                    print(f"Database error: {e}")
                    flash(f"Error saving roadmap: {str(e)}", "warning")
                    db.session.rollback()
            
        except Exception as e:
            error_msg = f"Error generating roadmap: {str(e)}"
            print(error_msg)
            flash(error_msg, "danger")
            debug_info = {
                'error': str(e),
                'prompt': prompt,
                'response': response_text if 'response_text' in locals() else None
            }
    
    return render_template('career_roadmap.html',
                         roadmap_data=roadmap_data,
                         debug_info=debug_info)

class CareerRoadmap(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    job_role = db.Column(db.String(100), nullable=False)
    experience = db.Column(db.String(50), nullable=False)
    target_company = db.Column(db.String(100), nullable=False)
    roadmap_data = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user = db.relationship('User', backref='roadmaps', lazy=True)

@app.route('/generate_detailed_roadmap', methods=['POST'])
def generate_detailed_roadmap():
    """API endpoint to generate a detailed career roadmap"""
    try:
        data = request.json
        role = data.get('role')
        experience = data.get('experience')
        company = data.get('company')
        
        if not all([role, experience, company]):
            return jsonify({
                'status': 'error', 
                'message': 'Missing required parameters'
            })
            
        # Configure Gemini API with the specified key
        genai.configure(api_key="AIzaSyD8IqB_QpUaE1XQjvjJD8511szRJMTSHm0")
        
        # Generate detailed roadmap 
        prompt = f"""
        Create a detailed, well-structured HTML career roadmap for a {role} with {experience} years of experience 
        aiming to work at {company}.
        
        Include these sections:
        1. Technical skills needed at each career stage
        2. Recommended learning resources (specific books, courses, websites)
        3. Portfolio projects to build
        4. Interview preparation specific to {company}
        5. Career progression timeline
        
        Format your response as clean HTML using Bootstrap 5 classes for styling.
        Use these Bootstrap components:
        - Cards for each section
        - Progress bars for skill levels
        - Badges for technologies
        - Accordions for expandable content
        - Icons from Font Awesome (using the <i> tag)
        
        Make the HTML visually attractive with proper spacing, colors, and organization.
        Do NOT include <!DOCTYPE>, <html>, <head> or <body> tags - just the content HTML.
        
        IMPORTANT: Return ONLY the HTML without any markdown code blocks, explanations or other text.
        """
        
        print("Generating detailed roadmap...")
        # Call Gemini model - use the correct model
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        
        # Extract HTML content from response and clean it up
        html_content = response.text.strip()
        
        # Check if the response contains markdown code blocks with HTML
        import re
        html_match = re.search(r'```(?:html)?\s*(.*?)\s*```', html_content, re.DOTALL)
        if html_match:
            html_content = html_match.group(1).strip()
            print("Extracted HTML from code block")
        
        print(f"Generated HTML content length: {len(html_content)}")
        
        return jsonify({
            'status': 'success',
            'content': html_content
        })
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error generating detailed roadmap: {error_msg}")
        return jsonify({
            'status': 'error',
            'message': error_msg
        })

@app.route('/upload_profile_photo', methods=['POST'])
def upload_profile_photo():
    if 'user_id' not in session:
        flash("Please log in to upload a profile photo.", "warning")
        return redirect(url_for('login'))
    
    if 'profile_photo' not in request.files:
        flash("No file part", "danger")
        return redirect(url_for('dashboard'))
    
    file = request.files['profile_photo']
    
    # If user doesn't select a file, browser also
    # submit an empty part without filename
    if file.filename == '':
        flash("No selected file", "danger")
        return redirect(url_for('dashboard'))
    
    if file and allowed_image(file.filename):
        # Create a secure filename to prevent path traversal attacks
        filename = secure_filename(f"user_{session['user_id']}_{file.filename}")
        filepath = os.path.join(app.config['PROFILE_PHOTOS_FOLDER'], filename)
        
        # Save the file
        file.save(filepath)
        
        # Update the user's profile_photo field in the database
        user = User.query.get(session['user_id'])
        user.profile_photo = filename
        db.session.commit()
        
        flash("Profile photo updated successfully!", "success")
        return redirect(url_for('dashboard'))
    else:
        flash("Allowed image types are png, jpg, jpeg, gif", "danger")
        return redirect(url_for('dashboard'))

@app.route('/download/<filename>')
def download_file(filename):
    """
    Route to handle file downloads for company resources.
    The filename parameter should match the resource file names in the company data.
    """
    # Ensure the filename is safe
    secure_name = secure_filename(filename)
    try:
        # Return the file from the resources directory
        return send_from_directory(os.path.join('static', 'resources'), secure_name, as_attachment=True)
    except FileNotFoundError:
        flash(f"File {filename} not found.", "danger")
        return redirect(url_for('company_prep'))

@app.route('/db_health_check')
def db_health_check():
    """
    Route to check database connectivity and health.
    This can help diagnose issues with the database.
    """
    try:
        # Check direct MySQL connection
        mysql_connected, mysql_version = get_db_connection_status()
        
        # Check if we can connect to the database via SQLAlchemy
        test_user = User.query.first()
        
        # Get counts of records in key tables
        user_count = User.query.count()
        interview_count = Interview.query.count()
        ai_interview_count = AIInterview.query.count()
        
        return jsonify({
            'status': 'ok',
            'message': 'Database is connected and healthy',
            'mysql': {
                'connected': mysql_connected,
                'version': mysql_version,
            },
            'sqlalchemy': {
                'connected': True,
                'engine': str(db.engine.url)
            },
            'record_counts': {
                'users': user_count,
                'interviews': interview_count,
                'ai_interviews': ai_interview_count
            }
        })
    except Exception as e:
        error_message = str(e)
        
        # Try direct connection to diagnose
        mysql_connected, mysql_version = get_db_connection_status()
        
        return jsonify({
            'status': 'error',
            'message': 'SQLAlchemy connection failed',
            'error': error_message,
            'mysql': {
                'connected': mysql_connected,
                'version': mysql_version if mysql_connected else 'Unknown'
            }
        }), 500

@app.route('/live_interview')
def live_interview():
    return render_template('live_interview.html')

@app.route('/generate_interview_question', methods=['POST'])
def generate_interview_question():
    try:
        data = request.json
        question_number = data.get('questionNumber', 1)
        total_questions = data.get('totalQuestions', 5)
        
        # Configure Gemini model
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Generate interview question
        prompt = f"""
        Generate a professional interview question ({question_number} of {total_questions}).
        The question should be challenging but clear, and appropriate for a technical interview.
        Include a mix of technical and behavioral questions.
        Return ONLY the question text, no additional context or formatting.
        """
        
        response = model.generate_content(prompt)
        question = response.text.strip()
        
        return jsonify({'question': question})
    except Exception as e:
        print(f"Error generating question: {str(e)}")
        return jsonify({'error': 'Failed to generate question'}), 500

@app.route('/transcribe_audio', methods=['POST'])
def transcribe_audio():
    try:
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'error': 'No file provided'
            }), 400
            
        audio_file = request.files['file']
        if not audio_file.filename:
            return jsonify({
                'status': 'error',
                'error': 'Empty file provided'
            }), 400
            
        # Verify file type
        if not audio_file.filename.lower().endswith('.wav'):
            return jsonify({
                'status': 'error',
                'error': 'Only WAV files are supported'
            }), 400
            
        # Create uploads directory if it doesn't exist
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Save the uploaded file temporarily with a unique name
        temp_filename = f"answer_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
        temp_filepath = os.path.join(UPLOAD_FOLDER, temp_filename)
        
        try:
            # Save the file
            audio_file.save(temp_filepath)
            
            # Print file info for debugging
            file_size = os.path.getsize(temp_filepath)
            print(f"Saved audio file: {temp_filepath}")
            print(f"File size: {file_size} bytes")
            
            # Load Whisper model (use 'tiny' for faster processing)
            print("Loading Whisper model...")
            model = whisper.load_model("tiny")
            
            # Transcribe audio with more options
            print("Transcribing audio...")
            result = model.transcribe(
                temp_filepath,
                language='en',  # Force English language
                task='transcribe',  # Specifically set to transcribe task
                fp16=False  # Disable half-precision to avoid some GPU-related errors
            )
            
            transcription = result["text"].strip()
            print(f"Transcription result: {transcription}")
            
            if not transcription:
                raise Exception("No transcription generated")
            
            # Clean up the temporary file
            os.remove(temp_filepath)
            
            return jsonify({
                'status': 'success',
                'transcription': transcription
            })
            
        except Exception as e:
            # Clean up the temporary file in case of error
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
            raise e
                
    except Exception as e:
        error_msg = str(e)
        print(f"Error transcribing audio: {error_msg}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to transcribe audio',
            'details': error_msg
        }), 500

@app.route('/evaluate_answer', methods=['POST'])
def evaluate_answer():
    try:
        data = request.json
        question = data.get('question', '')
        answer = data.get('answer', '')
        
        if not question or not answer:
            return jsonify({
                'status': 'error',
                'error': 'Question and answer are required'
            }), 400
        
        # Configure Gemini model
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Create evaluation prompt
        prompt = f"""
        You are an expert interview evaluator. Evaluate the following interview answer and provide detailed feedback.
        
        Question: {question}
        Answer: {answer}
        
        Please evaluate the answer and respond with the following format (use JSON format):
        {{
            "score": [score from 1-10],
            "feedback": "[2-3 sentences of overall feedback]",
            "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
        }}
        
        Evaluation criteria:
        - Clarity and communication skills
        - Relevance to the question
        - Depth of knowledge demonstrated
        - Examples and specificity
        - Professional presentation
        
        Provide constructive feedback that helps the candidate improve.
        Return ONLY the JSON object, no additional text.
        """
        
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Try to extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            json_str = response_text
        
        try:
            evaluation = json.loads(json_str)
            
            # Validate the evaluation structure
            if not all(key in evaluation for key in ['score', 'feedback', 'suggestions']):
                raise ValueError("Invalid evaluation format")
            
            # Ensure score is valid
            score = evaluation.get('score', 0)
            if not isinstance(score, (int, float)) or score < 1 or score > 10:
                evaluation['score'] = 5  # Default score if invalid
            
            # Ensure suggestions is a list
            if not isinstance(evaluation.get('suggestions'), list):
                evaluation['suggestions'] = ['Continue practicing to improve your interview skills']
            
            return jsonify({
                'status': 'success',
                'evaluation': evaluation
            })
            
        except json.JSONDecodeError:
            # Fallback evaluation if JSON parsing fails
            return jsonify({
                'status': 'success',
                'evaluation': {
                    'score': 6,
                    'feedback': 'Your answer shows understanding of the topic. Consider providing more specific examples and details to strengthen your response.',
                    'suggestions': [
                        'Include specific examples from your experience',
                        'Structure your answer with clear beginning, middle, and end',
                        'Practice speaking more confidently and clearly'
                    ]
                }
            })
        
    except Exception as e:
        print(f"Error evaluating answer: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to evaluate answer',
            'details': str(e)
        }), 500

@app.route('/english_communication')
def english_communication():
    return render_template('english_communication.html')

@app.route('/correct_text', methods=['POST'])
def correct_text():
    try:
        data = request.json
        user_text = data.get('text', '').strip()
        
        if not user_text:
            return jsonify({
                'status': 'error',
                'error': 'No text provided'
            }), 400
        
        # Configure Gemini model
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Create correction prompt
        correction_prompt = f"""
        Correct and improve the English in this paragraph for interview preparation. Make it clear, concise, and professional. 
        Also provide a list of specific improvements made.
        
        Original text: "{user_text}"
        
        Please respond in this JSON format:
        {{
            "improved_text": "[The corrected and improved paragraph]",
            "improvements": ["List of specific improvements made", "Another improvement", "etc"]
        }}
        
        Focus on:
        - Grammar and sentence structure
        - Professional vocabulary
        - Clarity and conciseness
        - Interview-appropriate language
        - Flow and coherence
        
        Return ONLY the JSON object.
        """
        
        response = model.generate_content(correction_prompt)
        response_text = response.text.strip()
        
        # Try to extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            json_str = response_text
        
        try:
            correction_result = json.loads(json_str)
            
            # Validate the response structure
            if 'improved_text' not in correction_result:
                raise ValueError("Invalid response format")
            
            # Ensure improvements is a list
            if 'improvements' not in correction_result or not isinstance(correction_result['improvements'], list):
                correction_result['improvements'] = ['Text has been improved for clarity and professionalism']
            
            return jsonify({
                'status': 'success',
                'improved_text': correction_result['improved_text'],
                'improvements': correction_result['improvements']
            })
            
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            # Use the response as improved text
            improved_text = response_text.replace('"', '').strip()
            
            return jsonify({
                'status': 'success',
                'improved_text': improved_text,
                'improvements': ['Grammar and structure improvements', 'Enhanced professional vocabulary', 'Improved clarity and flow']
            })
        
    except Exception as e:
        print(f"Error correcting text: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to improve text',
            'details': str(e)
        }), 500

@app.route('/text_to_speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.json
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({
                'status': 'error',
                'error': 'No text provided'
            }), 400
        
        # Try Murf API first (if available)
        try:
            murf_response = generate_speech_murf(text)
            if murf_response:
                return jsonify({
                    'status': 'success',
                    'audio_url': murf_response,
                    'provider': 'murf'
                })
        except Exception as murf_error:
            print(f"Murf API failed: {murf_error}")
        
        # Fallback: Return success without audio URL (will use browser speech synthesis)
        return jsonify({
            'status': 'success',
            'audio_url': None,
            'provider': 'browser',
            'message': 'Using browser speech synthesis'
        })
        
    except Exception as e:
        print(f"Error generating speech: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to generate speech',
            'details': str(e)
        }), 500

def generate_speech_murf(text):
    """
    Generate speech using Murf API
    Returns audio URL if successful, None if failed
    """
    try:
        import requests
        
        murf_api_key = "ap2_4dcc4f92-624c-4e40-a54f-fb7cc3b1473f"
        murf_url = "https://api.murf.ai/v1/speech/generate"
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {murf_api_key}'
        }
        
        payload = {
            'text': text,
            'voice': 'en-US-amy',
            'format': 'mp3',
            'speed': '1.0',
            'pitch': '1.0'
        }
        
        response = requests.post(murf_url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            return result.get('audio_url')
        else:
            print(f"Murf API error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Murf API exception: {str(e)}")
        return None

if __name__ == "__main__":
    try:
        # Verify MySQL connection first
        connected, mysql_version = get_db_connection_status()
        if connected:
            print(f"Successfully connected to MySQL (version: {mysql_version})")
        else:
            print(f"Failed to connect to MySQL: {mysql_version}")
            sys.exit(1)
            
        # Ensure all database tables exist
        with app.app_context():
            db.create_all()
            print("Database tables created successfully")
            
            # Check for users in the database
            user_count = User.query.count()
            print(f"Current user count in database: {user_count}")
            
            # Create a default admin user if no users exist
            if user_count == 0:
                try:
                    print("Creating default admin user...")
                    admin_password = "admin123"  # Simple default password
                    hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt())
                    
                    default_admin = User(
                        name="Admin User",
                        email="admin@example.com",
                        password=hashed_password
                    )
                    
                    db.session.add(default_admin)
                    db.session.commit()
                    print("Default admin user created successfully!")
                    print("Login with: admin@example.com / admin123")
                except Exception as admin_error:
                    print(f"Error creating default admin: {str(admin_error)}")
                    db.session.rollback()
            
        # Run the Flask application
        app.run(debug=True)
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        
        # Attempt recovery
        try:
            # Try to recreate the database
            print("Attempting to recreate database...")
            import sqlite3
            # For SQLite, we just need to delete the file and let SQLAlchemy recreate it
            if os.path.exists('interview_prep.db'):
                os.remove('interview_prep.db')
            print("Database file reset")
            
            with app.app_context():
                db.create_all()
                print("Database recovery complete, starting application")
                app.run(debug=True)
        except Exception as recovery_error:
            print(f"Recovery failed: {str(recovery_error)}")
            # Run the app anyway as a last resort
            app.run(debug=True) 