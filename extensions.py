"""
Extension instances created here (uninitialized) and bound to the app in
app.py's create_app(), following the standard Flask application-factory
pattern so nothing binds to a global app at import time.
"""

from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

cors = CORS()

limiter = Limiter(key_func=get_remote_address)
