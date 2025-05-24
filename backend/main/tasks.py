import os
from main import models
from celery import shared_task
import time
from main.mailer import SesMailSender
from celery.utils.log import get_task_logger
from django.core.files.base import ContentFile

logger = get_task_logger(__name__)

@shared_task
def sample_task():
	time.sleep(5)
	return True

@shared_task
def celery_send_email(subject, 
	message, from_email,
	recipient_list,
	fail_silently,
	html_message
	):


	mailer = SesMailSender()
	mailer.send_email(
		source = from_email,
		destination= recipient_list,
		text = message,
  		html = html_message,
    	subject = subject
  
  
	)
	logger.debug('The email has been sent')
	return True



