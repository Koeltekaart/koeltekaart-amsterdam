FROM python:3.12-slim

WORKDIR /app

# Copy dependency list and install first (layer caching)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the rest of the project
COPY . .

# Expose port and start with gunicorn
EXPOSE 8000
CMD ["sh", "-c", "cd backend && gunicorn wsgi:app --bind 0.0.0.0:${PORT:-8000} --workers 2"]
