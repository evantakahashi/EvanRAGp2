from mangum import Mangum
from api import app

# Create the handler
handler = Mangum(app)