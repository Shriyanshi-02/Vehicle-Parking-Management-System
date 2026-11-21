from dotenv import load_dotenv
load_dotenv()
from flask import Flask, send_from_directory, jsonify
from flask_login import LoginManager
from backend.models import db
from backend.routes import api_bp
from backend.config import LocalDevelopmentConfig
import os
from flask import Flask
from backend.models import db, User, Role
from flask_security import Security, SQLAlchemyUserDatastore
from backend.config import LocalDevelopmentConfig
from backend.extentions import mail


app = Flask(__name__, static_folder="Frontend", static_url_path="/static")
app.config.from_object(LocalDevelopmentConfig)
db.init_app(app)
mail.init_app(app)
app.register_blueprint(api_bp, url_prefix='/api')

@app.route('/')
def index():
    return app.send_static_file('index.html')

from flask import jsonify, request

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({'message': 'Not found'}), 404
    return app.send_static_file('index.html')

@app.errorhandler(500)
def internal_error(e):
    if request.path.startswith('/api/'):
        return jsonify({'message': 'Internal server error'}), 500
    return app.send_static_file('index.html')


login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({'message': 'Unauthorized'}), 401

# Catch-all route for Vue history mode
@app.route('/<path:path>')
def static_proxy(path):
    # Serve static files from /static
    static_file = os.path.join(app.static_folder, path)
    if os.path.exists(static_file):
        return send_from_directory(app.static_folder, path)
    # Otherwise, serve index.html for Vue Router history mode
    return app.send_static_file('index.html')

user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)  # <-- Initialize Security BEFORE using hash_password

# ...existing code...
# ...existing code...
def create_initial_data():
    db.create_all()

    user_datastore.find_or_create_role(
        name='admin',
        description='superuser'
    )

    user_datastore.find_or_create_role(
        name='user',
        description='general user'
    )

    db.session.commit()


if __name__ == '__main__':
    with app.app_context():
        create_initial_data()

    app.run(debug=True)