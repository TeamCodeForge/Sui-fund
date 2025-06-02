from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage




    
    
class PDFMediaStorage(S3Boto3Storage):
    default_acl = 'public-read'
    file_overwrite = False

class ProductMediaStorage(S3Boto3Storage):
    default_acl = 'public-read'
    file_overwrite = False


class UserImagesMediaStorage(S3Boto3Storage):
    default_acl = 'public-read'
    file_overwrite = False

class CommunityMediaStorage(S3Boto3Storage):
    default_acl = 'public-read'
    file_overwrite = False


class QuizMediaStorage(S3Boto3Storage):
    default_acl = 'public-read'
    file_overwrite = False


class CertificateMediaStorage(S3Boto3Storage):
    default_acl = 'public-read'
    file_overwrite = False

class CourseImagesMediaStorage(S3Boto3Storage):
    default_acl = 'public-read'
    file_overwrite = False


def get_storage(name):
    if settings.USE_AWS:
        if name == 'course': 
            return CourseImagesMediaStorage()
        if name == 'product':
            return ProductMediaStorage()
        if name == 'pdf':
            return PDFMediaStorage()
        if name == 'user':
            return UserImagesMediaStorage()
        if name == 'quiz':
            return QuizMediaStorage()
        if name == 'community':
            return CommunityMediaStorage()
        if name == 'certificate':
            return CertificateMediaStorage()
    else:
        return None