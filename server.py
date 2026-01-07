from flask import Flask, render_template, request, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager, UserMixin, login_user,
    login_required, logout_user, current_user
)
from werkzeug.security import generate_password_hash, check_password_hash
from openpyxl import Workbook
import json, os

# ================= APP SETUP =================
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)

DB_PATH = os.path.join(INSTANCE_DIR, "appdata.db")

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY", "dev-secret")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + DB_PATH
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'signin'

# ================= MODELS =================
class Account(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class Grid(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(100))
    content = db.Column(db.Text)
    pinned = db.Column(db.Boolean, default=False)

@login_manager.user_loader
def load_user(user_id):
    return Account.query.get(int(user_id))

# ================= CREATE TABLES (RENDER SAFE) =================
with app.app_context():
    db.create_all()

# ================= HELPERS =================
def save_excel(account_id, grid_id, data):
    excel_dir = os.path.join(BASE_DIR, "excel_files")
    os.makedirs(excel_dir, exist_ok=True)

    path = os.path.join(excel_dir, f"user_{account_id}_grid_{grid_id}.xlsx")

    wb = Workbook()
    ws = wb.active
    ws.title = "Data"

    headers = [
        "Dated","Caller ID","Disposition","Cx Name",
        "Alt Phone #","Email","Remote","Call Back",
        "Agent Name","Other Details","Comments","Auditor Comments"
    ]
    ws.append(headers)

    for row in data:
        ws.append(row)

    wb.save(path)

# ================= ROUTES =================
@app.route('/')
def home():
    return redirect('/signin')

@app.route('/signup', methods=['GET','POST'])
def signup():
    if request.method == 'POST':
        acc = Account(
            email=request.form['email'],
            password=generate_password_hash(request.form['password'])
        )
        db.session.add(acc)
        db.session.commit()
        login_user(acc)
        return redirect('/create-grid')
    return render_template('signup.html')

@app.route('/signin', methods=['GET','POST'])
def signin():
    if request.method == 'POST':
        acc = Account.query.filter_by(email=request.form['email']).first()
        if acc and check_password_hash(acc.password, request.form['password']):
            login_user(acc)
            return redirect('/dashboard')
    return render_template('signin.html')

@app.route('/dashboard')
@login_required
def dashboard():
    grids = Grid.query.filter_by(account_id=current_user.id).all()
    if not grids:
        return redirect('/create-grid')
    return redirect(f"/workspace/{grids[0].id}")

@app.route('/create-grid')
@login_required
def create_grid():
    grid = Grid(
        account_id=current_user.id,
        title=f"Sheet {Grid.query.filter_by(account_id=current_user.id).count()+1}",
        content='[]'
    )
    db.session.add(grid)
    db.session.commit()
    return redirect(f"/workspace/{grid.id}")

@app.route('/rename-grid/<int:grid_id>', methods=['POST'])
@login_required
def rename_grid(grid_id):
    grid = Grid.query.filter_by(id=grid_id, account_id=current_user.id).first()
    if grid:
        grid.title = request.form['title']
        db.session.commit()
    return redirect(f"/workspace/{grid_id}")

@app.route('/pin-grid/<int:grid_id>')
@login_required
def pin_grid(grid_id):
    grid = Grid.query.filter_by(id=grid_id, account_id=current_user.id).first()
    if grid:
        grid.pinned = not grid.pinned
        db.session.commit()
    return redirect(f"/workspace/{grid_id}")

@app.route('/workspace/<int:grid_id>')
@login_required
def workspace(grid_id):
    grid = Grid.query.filter_by(id=grid_id, account_id=current_user.id).first()
    grids = Grid.query.filter_by(account_id=current_user.id).all()

    return render_template(
        'workspace.html',
        grid_id=grid.id,
        grid_data=grid.content,
        grids=grids
    )

@app.route('/autosave/<int:grid_id>', methods=['POST'])
@login_required
def autosave(grid_id):
    grid = Grid.query.filter_by(id=grid_id, account_id=current_user.id).first()
    data = request.json

    grid.content = json.dumps(data)
    db.session.commit()

    save_excel(current_user.id, grid_id, data)
    return {"status": "saved"}

@app.route('/delete-grid/<int:grid_id>')
@login_required
def delete_grid(grid_id):
    grid = Grid.query.filter_by(id=grid_id, account_id=current_user.id).first()
    if not grid:
        return redirect('/dashboard')

    db.session.delete(grid)
    db.session.commit()
    return redirect('/dashboard')

@app.route('/logout')
def logout():
    logout_user()
    return redirect('/signin')

# ================= START =================
if __name__ == "__main__":
    app.run()
