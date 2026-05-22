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
    libpq-dev \
    ca-certificates \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create a non-root user and switch to it for security
RUN addgroup --system django && adduser --system --group --home /home/django django

# Ensure static files directory exists and is owned by django
RUN mkdir -p /app/staticfiles && chown -R django:django /app /home/django

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

USER django

# Expose port
EXPOSE 8000

# Use the entrypoint script to handle migrations and startup
ENTRYPOINT ["/app/entrypoint.sh"]
