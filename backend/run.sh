./manage.py makemigrations;
./manage.py migrate;
./manage.py test --exclude-tag=excluded --no-input;
celery -A backend worker -D -l ERROR
gunicorn --workers 2 backend.wsgi:application --bind 0.0.0.0:8000 

