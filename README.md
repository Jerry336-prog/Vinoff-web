# Vinoff Web 🍷

Vinoff Web is a modern, premium e-commerce web application tailored for wine enthusiasts. Built with a robust frontend architecture and integrated with powerful cloud services, Vinoff offers a seamless shopping and administration experience.

## 🚀 Features

- **Elegant Wine Catalog & Shop**: Filter and explore a curated collection of fine wines.
- **Dynamic Shopping Cart & Checkout**: Interactive shopping cart with smooth item management and a secure mock checkout flow.
- **User Authentication**: Secure user login, signup, and session management powered by **Firebase Auth**.
- **Real-Time Customer Chat**: Integrated chat interface powered by **Firebase Firestore** for real-time support.
- **PDF Invoice Generation**: Instant downloadable and printable PDF invoices generated dynamically using `@react-pdf/renderer`.
- **Cloud Media Uploads**: Secure image and asset hosting via **Cloudinary**.
- **Admin Dashboard**: Specialized management pages for inventory, orders, and user management.
- **Admin Promotion Utility**: Command-line script to easily promote any user account to an Administrator.

---

## 🛠️ Tech Stack

- **Frontend Core**: [React 19](https://react.dev/) & [Vite](https://vite.dev/) (Fast Hot Module Replacement)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [PostCSS](https://postcss.org/) for highly-customizable and responsive UI layout
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore database and Authentication SDK)
- **Image Hosting**: [Cloudinary API](https://cloudinary.com/)
- **PDF Documents**: [@react-pdf/renderer](https://react-pdf.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 💻 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) and [npm](https://www.npmjs.com/) installed.

### Installation

1. **Clone the repository** (or download the source code):
   ```bash
   git clone <your-repository-url>
   cd vinoff-web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment variables file and fill in your Cloudinary and Firebase credentials:
   ```bash
   cp .env.example .env
   ```
   Open the newly created `.env` file and replace the placeholder values with your actual API keys and endpoints.

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The application will be running locally at `http://localhost:5173`.

5. **Build for Production**:
   ```bash
   npm run build
   ```
   This generates a highly optimized production bundle in the `dist/` directory.

---

## 🛡️ Administrative Scripts

To promote an existing user account to the `"admin"` role, use the helper script provided in the root directory:

```bash
node promote_user.mjs <USER_UID>
```
*Note: Make sure your `.env` file contains your active Firebase configuration, or ensure credentials are set up in `src/services/firebase/config.js`.*

---

## 📄 License

This project is private and proprietary. All rights reserved.
