import psycopg2
import datetime
import argparse
import os
import platform

if platform.system() == "Linux":
  os.system('export FLASK_ENV=development && export FLASK_DEBUG=true && export FLASK_APP=microblog.py && python3 -m flask run')
else:
  os.system('set FLASK_ENV=development && set FLASK_DEBUG=true && set FLASK_APP=microblog.py && python -m flask run')
