# DailyTrack — Personal & Work Activity Tracker

DailyTrack is a simple, lightweight daily activity journal web application. It lets users quickly record what they did during the day, categorized by personal and work activity types.

This project is built using a React + Vite frontend, a PHP 8+ REST API backend, and MySQL database, designed for compatibility with cPanel/shared hosting environments.

---

## 1. Project Directory Structure

```text
Daylog/
├── api/                   # PHP REST API
│   ├── config/            # Backend Configurations
│   │   ├── config.example.php  # Template config file
│   │   ├── config.php          # Active config file (Git ignored)
│   │   ├── database.php        # PDO Database Connection provider
│   │   └── schema.sql          # MySQL Schema script
│   └── status.php         # API status and check connection endpoint
├── src/                   # React Frontend Source
│   ├── components/        # Reusable UI components
│   ├── services/          # API services
│   │   └── api.js         # API client functions
│   ├── App.jsx            # Main dashboard and status checker
│   ├── index.css          # Responsive styling rules
│   └── main.jsx           # React rendering entrypoint
├── index.html             # HTML layout template for Vite
├── package.json           # Frontend dependencies and npm scripts
├── vite.config.js         # Vite configuration with API proxy settings
└── README.md              # Documentation and guides
```

---

## 2. Local Setup and Installation

### Prerequisite

- Node.js (v18+)
- PHP (v8.0+)
- MySQL or MariaDB

### Database Configuration

1. Create a MySQL database named `dailytrack_db`.
2. Import the schema using standard command line client or phpMyAdmin:
   ```bash
   mysql -u root dailytrack_db < api/config/schema.sql
   ```
3. Set up the PHP config file by copying the template:
   ```bash
   cp api/config/config.example.php api/config/config.php
   ```
4. Edit `api/config/config.php` and fill in your local database credentials:
   ```php
   'db' => [
       'host' => '127.0.0.1',
       'dbname' => 'dailytrack_db',
       'username' => 'root',
       'password' => '',
       'charset' => 'utf8mb4'
   ]
   ```

### Running Backend API Locally

Start PHP's built-in server in the project root directory:
```bash
php -S localhost:8000
```
This serves the API endpoint on `http://localhost:8000/api/status.php`.

### Running React Frontend Locally

1. Install npm packages:
   ```bash
   npm install
   ```
2. Start Vite development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173/` in your browser. The connection check card will display the status of your connection to the PHP API and MySQL database.

---

## 3. Communication Architecture

- **Development Proxy**: During local development, the React Vite server running on `http://localhost:5173/` proxies all requests starting with `/api` to `http://localhost:8000/api`. This prevents CORS (Cross-Origin Resource Sharing) blockages during frontend testing.
- **Production Integration**: On production cPanel servers, the built static files of the React app and the `/api/` directory will live on the same domain and server directory. Therefore, standard relative HTTP fetch requests (`/api/...`) will point directly to the PHP API files natively without needing a proxy.

---

## 4. cPanel Deployment Strategy

When deploying to cPanel:

1. **Build React App**:
   ```bash
   npm run build
   ```
   This generates a static folder `dist/` containing HTML, CSS, and JS bundle files.
2. **Upload Static Files**:
   Upload the contents of the `dist/` folder directly to the `public_html/` folder of your cPanel account.
3. **Upload PHP API**:
   Upload the `api/` folder and its contents to `public_html/api/` folder on cPanel.
4. **Setup MySQL on cPanel**:
   - Use the **MySQL® Database Wizard** in cPanel to create `dailytrack_db` database and database user.
   - Assign all privileges to the user.
   - Import `api/config/schema.sql` via **phpMyAdmin**.
5. **Configure Production Credentials**:
   Edit `public_html/api/config/config.php` (created from `config.example.php`) with the production cPanel database details. Change `'env' => 'development'` to `'env' => 'production'`.
6. **Setup Apache Routing**:
   Create a `.htaccess` file in `public_html/` to route all page requests to `index.html` for single-page routing (React Router), ensuring pages refresh correctly without 404 errors.
