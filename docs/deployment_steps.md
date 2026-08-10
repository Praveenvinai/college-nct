Walkthrough: Render Deployment Configuration
This walkthrough summarizes the changes made to prepare the backend for Render deployment and provides instructions on how to configure your Render service.

Changes Made
1. Configuration Fallback for Firebase Admin Credentials
We modified 
firebase_config.py
 to read credentials from the FIREBASE_SERVICE_ACCOUNT_JSON environment variable:

If the environment variable exists, we parse it as JSON and pass it directly to credentials.Certificate.
If not, we fall back to reading the local 
firebase-service-account.json
 file.
This allows local development to work unchanged while enabling cloud deployments (Render, Heroku, etc.) to run securely without committing sensitive credential files to Git.
2. Procfile Dynamic Port Binding
We updated the 
Procfile
 to bind the Gunicorn server to 0.0.0.0:$PORT dynamically:

text

web: gunicorn -b 0.0.0.0:$PORT app:app
Verification Results
We verified the fallback logic using the test suite in the virtual environment:

Env Var Loading Test: Loaded the service account JSON contents into the environment variable and verified database connectivity:
powershell

$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content -Raw -Path .\firebase-service-account.json
.\.venv\Scripts\python.exe test_firebase_connection.py
Result: Connected successfully to Firebase and retrieved student & store slot records.
Fallback File Loading Test: Unset the environment variable and verified file fallback:
powershell

$env:FIREBASE_SERVICE_ACCOUNT_JSON = ""
.\.venv\Scripts\python.exe test_firebase_connection.py
Result: Successfully connected using the local credentials file.
Step-by-Step Render Deployment Instructions
To deploy your backend to Render:

Commit and Push changes: Make sure you commit and push the updated files (
firebase_config.py
 and 
Procfile
) to your remote Git repository.
Create Web Service:
Go to your Render Dashboard and click New > Web Service.
Connect your GitHub repository.
Configure Service Settings:
Name: e.g., smart-campus-backend
Root Directory: backend/backend
Language/Runtime: Python
Build Command: pip install -r requirements.txt
Start Command: gunicorn -b 0.0.0.0:$PORT app:app (Render will also automatically read this from the Procfile if left blank)
Configure Environment Variables: Under the Environment tab, click Add Environment Variable to set the following:
FIREBASE_DB_URL: https://smart-campus-demo-dd425-default-rtdb.asia-southeast1.firebasedatabase.app/
GROQ_API_KEY: your_groq_api_key
FIREBASE_SERVICE_ACCOUNT_JSON: Copy the exact, complete content of your local firebase-service-account.json file and paste it here as a single text value.
Deploy: Click Deploy Web Service.