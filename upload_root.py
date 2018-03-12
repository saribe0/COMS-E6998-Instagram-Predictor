from boto.s3.connection import S3Connection
from boto.s3.key import Key
import sys, glob, os

DEBUG = False

# Set the bucket name
BUCKET_NAME = 'insta-analysis-ccbd-project'
AWS_ACCESS_KEY_ID = 'AKIAJYU5T7OJH5VTR5OA'
AWS_SECRET_ACCESS_KEY = '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'

# Create S3 connection and get the bucket
# - Create the bucket if it doesn't exist
# - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be defined enviroment variables
try:
    conn = S3Connection(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
except:
    print 'Error: Unable to connect, quiting.'
    sys.exit()
try:
    bucket = conn.get_bucket(BUCKET_NAME)
except Exception as e:
    if DEBUG:
        print e
    try:
        bucket = conn.create_bucket(BUCKET_NAME)
    except Exception as e:
        if DEBUG:
            print e
        print 'Error: Unable to get or create a bucket with the given name, quitting.'
        sys.exit()

bucket.set_acl('public-read')

for subdir, dirs, files in os.walk('./'):
    for file in files:
        if subdir[:6] == './root':
            path = os.path.join(subdir[6:], file)
            key = bucket.new_key(path)
            key.set_contents_from_file(os.path.join(subdir, file))
