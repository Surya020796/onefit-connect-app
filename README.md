# OneFit Connect: App Prototype (Team 4)

Click-through prototype of the OneFit Connect platform. Plain HTML, CSS and JavaScript. No build step, no server, no password.

## Try it locally
Open `index.html` in a browser (or run `python3 -m http.server` in this folder and visit http://localhost:8000).

## Deploy free on GitHub Pages (no git commands needed)
1. Sign in at github.com, click **New repository**, name it `onefit-connect-app`, set it to **Public**, click **Create repository**.
2. On the empty repo page click **uploading an existing file**.
3. Unzip this package, open the folder, select EVERYTHING inside it (`index.html`, `css`, `js`, `README.md`) and drag it into the browser window. Wait for the upload to finish.
4. Click **Commit changes**.
5. Go to **Settings > Pages**. Under **Build and deployment** choose **Deploy from a branch**, branch **main**, folder **/ (root)**, click **Save**.
6. After 1 to 2 minutes your link appears at the top of that page: `https://YOUR-USERNAME.github.io/onefit-connect-app/`

## Link the dashboard inside the app (optional)
After the dashboard is published, open `js/config.js` on GitHub (pencil icon), paste its link into `DASHBOARD_URL`, and commit. A dashboard button then appears in the Manager screens.

## What is in the prototype
- Landing page with three no-password roles: Member, Front-desk staff, Manager
- Member: browse classes at any location, book, waitlist, cancel, check-in code, rate, reminders
- Staff: live roster per location, check-in, no-show, walk-ins, visiting members
- Manager: live KPIs, churn-risk alerts with explainable scores, win-back messages, data-flow pipeline and event log
- Validation rules (duplicate, time conflict, full class), waitlist auto-promotion
- Guided tour and a Tutorial page
- Data integration: all roles share one store (browser storage standing in for the Shared DB). Open two tabs to watch changes sync.

Demo data is synthetic and stays in the visitor's browser. Use **Data flow > Reset demo data** to start over.
