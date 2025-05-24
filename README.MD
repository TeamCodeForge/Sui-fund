# Project Installation Guide

This guide provides step-by-step instructions to set up and run the Django application locally.

## Prerequisites

- Python 3.x installed
- pip (Python package manager)
- Docker installed
- AWS SES credentials (optional, for email functionality)

## Installation Steps

1. **Create a Virtual Environment**

   Create and activate a virtual environment to manage Python dependencies.

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**

   Install the required Python packages listed in the `requirements.txt` file.

   ```bash
   pip install -r requirements.txt
   ```

3. **Set Up Environment Variables**

   Rename the `variables.txt` file to `development.env` and populate the required environment variables. If using AWS SES for sending emails, include the necessary AWS credentials (optional).

   ```bash
   mv variables.txt development.env
   ```

   Edit `development.env` to include the required environment variables, for example:

   ```plaintext
   # Example environment variables
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_SES_REGION=your_ses_region
   ```

   **Note**: AWS SES configuration is optional and only required if email functionality is needed.

4. **Start Docker Redis Server**

   Run a Redis server using Docker with the following command:

   ```bash
   sudo docker run -d -p 6379:6379 redis:7.4-alpine
   ```

   This starts a Redis container in detached mode, mapping port 6379 on the host to port 6379 in the container.

5. **Make Django Migrations**

   Generate and apply Django database migrations.

   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Run the Django Server and Celery**

   Start the Django development server.

   ```bash
   ./manage.py runserver
   celery -A backend worker -l INFO
   ```

   The server will run on `localhost:8000` by default.

7. **Access the API Documentation**

   Visit the API endpoint to view the Swagger UI documentation:

   ```
   http://localhost:8000/api/schema/swagger-ui/
   ```

## Notes

- Ensure Docker is running before starting the Redis server.
- If you encounter issues with AWS SES, verify your credentials and region in the `development.env` file.
- The virtual environment must be activated whenever running Django commands.