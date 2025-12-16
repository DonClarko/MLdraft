# ML Draft AI

Mobile Legends Draft Simulator with AI-powered recommendations based on custom tier lists.

## Features

- 🎮 **Draft Simulator** - Full draft simulation with ban and pick phases
- 🤖 **AI Recommendations** - Smart hero suggestions based on tier lists, counters, and synergies
- 📊 **Tier Lists** - View and manage hero tier lists by role
- 🗡️ **Counter System** - Track which heroes counter others
- 🤝 **Synergy System** - Define hero combo synergies
- 👤 **Admin Panel** - Manage all data through a protected admin interface

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- React Router
- Zustand (State Management)
- Axios

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- SQLite/PostgreSQL
- JWT Authentication

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file from example:
```bash
cp .env.example .env
```

5. Run the server:
```bash
uvicorn main:app --reload
```

6. Seed the database with heroes:
```bash
python scripts/seed_data.py
```

The API will be available at `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
MLdraftAi/
├── backend/
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── models.py        # Database models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── database.py      # Database config
│   │   ├── auth.py          # JWT authentication
│   │   ├── ai_engine.py     # AI recommendation logic
│   │   └── config.py        # App configuration
│   ├── scripts/
│   │   └── seed_data.py     # Database seeder
│   ├── main.py              # FastAPI app
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── stores/          # Zustand stores
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md
```

## API Endpoints

### Heroes
- `GET /api/heroes` - Get all heroes
- `GET /api/heroes/{id}` - Get hero by ID
- `POST /api/heroes` - Create hero (admin)
- `PUT /api/heroes/{id}` - Update hero (admin)
- `DELETE /api/heroes/{id}` - Delete hero (admin)

### Tier Lists
- `GET /api/tier-lists` - Get all tier lists
- `GET /api/tier-lists/{role}` - Get tier list by role
- `POST /api/tier-lists` - Create tier list (admin)
- `PUT /api/tier-lists/{id}` - Update tier list (admin)

### Draft
- `POST /api/draft/suggest` - Get AI suggestions
- `POST /api/draft/analyze` - Analyze team compositions
- `POST /api/draft/save` - Save draft history

### Counters & Synergies
- `GET /api/counters/{hero_id}` - Get hero counters
- `POST /api/counters` - Add counter (admin)
- `GET /api/synergies/{hero_id}` - Get hero synergies
- `POST /api/synergies` - Add synergy (admin)

## Admin Access

Default credentials:
- Username: `admin`
- Password: `changeme123`

Change these in your `.env` file for production!

## Deployment

### Frontend (Vercel/Netlify)
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL=https://your-api.com/api`

### Backend (Railway/Render)
1. Connect your GitHub repository
2. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables from `.env`
4. Use PostgreSQL for production database

## License

MIT License
