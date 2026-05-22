# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create data directories if they don't exist (used by the local JSON-based storage)
RUN mkdir -p data/raw data/processed

# Create a non-root user for security
RUN addgroup --system appuser && adduser --system --group appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port (as per the docstring in main.py)
EXPOSE 8001

# Run uvicorn
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8001"]
