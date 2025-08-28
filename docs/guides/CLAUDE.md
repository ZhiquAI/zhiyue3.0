# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

智阅AI (ZhiYue AI) is an intelligent grading system for Chinese history teachers, combining OCR recognition and NLP technology for automated essay grading. The system features AI-powered handwriting recognition with 98% accuracy and multi-dimensional scoring based on historical subject characteristics.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: Ant Design with Chinese locale (zhCN)
- **State Management**: Zustand + React Context (AppContext)
- **Styling**: Tailwind CSS + Ant Design
- **Charts**: Recharts for data visualization
- **Router**: React Router DOM

### Backend (FastAPI + Python)
- **Framework**: FastAPI with async support
- **Database**: SQLAlchemy with PostgreSQL/SQLite
- **AI Services**: Google Gemini 2.5 Pro for OCR
- **Authentication**: JWT with passlib/bcrypt
- **File Processing**: Pillow for image handling
- **Task Queue**: Celery with Redis

### Key Directories
- `src/components/`: React components organized by feature
- `src/hooks/`: Custom React hooks for state and API
- `src/services/`: API clients and external service integrations
- `backend/api/`: FastAPI route handlers
- `backend/services/`: Business logic and AI services
- `backend/models/`: Database models and schemas

## Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server (port 5174)
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint
```

### Backend Development
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Start development server
python backend/start.py

# Start production server
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Run tests
pytest backend/tests/

# Format code
black backend/
isort backend/

# Lint code
flake8 backend/
```

### Integrated Development
```bash
# Quick start with full environment + log sync
./start_dev_with_logs.sh

# Quick start frontend only
./start_frontend.sh

# Quick backend setup
./quick_start.sh
```

### Log Monitoring
```bash
# Monitor all logs
python3 watch_logs.py -t all

# Monitor specific log types
python3 watch_logs.py -t frontend
python3 watch_logs.py -t api
python3 watch_logs.py -t errors
```

## Core Architecture Patterns

### State Management
- **AppContext**: Global application state (current view, exams, loading states)
- **useAuth**: Authentication state and user management
- **Zustand stores**: Component-level state management

### Component Architecture
- **Views**: Top-level page components (Dashboard, ExamManagement, DataAnalysis)
- **Workspaces**: Feature-specific workflow components (MarkingWorkspace, AnalysisWorkspace)
- **Common**: Reusable components (ErrorBoundary, LoadingSpinner, VirtualTable)

### API Integration
- **services/api.ts**: Main API client with axios
- **services/geminiApi.ts**: Gemini AI service integration
- **backend/services/**: Python service layer for business logic

### File Storage Architecture
- **Storage paths**: `./storage/exam_papers/` and `./storage/answer_sheets/`
- **Supported formats**: PDF, JPG, PNG, TIFF
- **Max file size**: 50MB (configurable)

## Development Tools

### Debug Tools (Development Mode)
- **Error Monitor**: Floating panel showing runtime errors
- **Log Sync**: Browser logs synced to filesystem via dev_log_server.py
- **Debug Toolbar**: Performance monitoring and API call tracking
- **Browser Console Commands**:
  - `testGemini()`: Test Gemini API connection
  - `__LOG_SYNC__.downloadLogs()`: Download debug logs
  - `__LOG_SYNC__.clearLogs()`: Clear accumulated logs

### Gemini AI Integration
- **Model**: Gemini 2.5 Pro for OCR processing
- **Configuration**: Set `GEMINI_API_KEY` in .env file
- **Fallback**: Mock data when API key not configured
- **Temperature**: 0.1 (optimized for OCR tasks)

## Configuration

### Environment Variables (.env)
- `GEMINI_API_KEY`: Google Gemini API key for OCR
- `DATABASE_URL`: Database connection string
- `DEBUG`: Enable debug mode (true/false)
- `MAX_FILE_SIZE`: Maximum upload file size in MB

### Port Configuration
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:8000
- **Log Sync Service**: http://localhost:3001
- **API Documentation**: http://localhost:8000/docs

## Testing

### Frontend Tests
- **Framework**: Vitest + Testing Library
- **Coverage**: Vitest coverage via c8
- **Test files**: `src/test/` directory
- **Commands**: `npm run test`, `npm run test:ui`, `npm run test:coverage`

### Backend Tests
- **Framework**: pytest + pytest-asyncio
- **Test files**: `backend/tests/` directory
- **Commands**: `pytest backend/tests/`

## Key Features to Understand

### OCR Processing Pipeline
1. File upload via `file_upload.py`
2. Image preprocessing and validation
3. Gemini 2.5 Pro OCR via `gemini_ocr_service.py`
4. Text extraction and structured output
5. Storage in database with metadata

### Grading Workflow
1. Question recognition from exam papers
2. Answer sheet OCR processing
3. AI-powered multi-dimensional scoring
4. Batch processing capabilities
5. Export functionality for results

### Data Analysis
- Real-time charts with Recharts
- Virtual scrolling for large datasets
- Export utilities for various formats
- Performance monitoring and caching