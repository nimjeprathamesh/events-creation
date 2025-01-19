import cors from "cors";
import dotenv from "dotenv";
import express from 'express';
import mysql from "mysql2";
import serveStatic from "serve-static";

const STATIC_PATH =
    process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

dotenv.config();
const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);

app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
      console.error("Error connecting to MySQL:", err);
      return;
  }
  console.log("Connected to MySQL database");
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type'
  );
  next();
});

app.get("/api/events", (req, res) => {
  const { max, search } = req.query;

  let query = "SELECT id, title, image, date, location, description FROM events";
  const queryParams = [];

  if (search) {
    query += " WHERE CONCAT(title, ' ', description, ' ', location) LIKE ?";
    queryParams.push(`%${search}%`);
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "An error occurred", error: err.message });
    }

    if (max) {
      results = results.slice(Math.max(0, results.length - parseInt(max)), results.length);
    }

    res.status(200).json({
      success: true,
      events: results.map((event) => ({
        id: event.id,
        title: event.title,
        image: event.image,
        date: event.date,
        location: event.location,
      })),
    });
  });
});

app.get("/api/events/:id", (req, res) => {
  const id = req.params.id;
  const query = "SELECT * FROM events WHERE id = ?";

  db.query(query, [id], (err, results) => {
      if (err) {
        console.log("error", err);
        return res.status(500).json({ error: "An error occurred" });
      }
      res.status(200).json(results);
  });
});

app.get('/api/images', async (req, res) => {
  const query = "SELECT * FROM images";

  db.query(query, (err, results) => {
      if (err) {
        console.log("error", err);
        return res.status(500).json({ error: "An error occurred" });
      }
      res.status(200).json(results);
  });
});

app.post('/api/events', (req, res) => {
  const { event } = req.body;

  if (!event) {
    return res.status(400).json({ message: 'Event is required' });
  }

  if (
    !event.title?.trim() ||
    !event.description?.trim() ||
    !event.date?.trim() ||
    !event.time?.trim() ||
    !event.image?.trim() ||
    !event.location?.trim()
  ) {
    return res.status(400).json({ message: 'Invalid data provided.' });
  }

  const query = `
    INSERT INTO events (title, description, date, time, image, location)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [
    event.title.trim(),
    event.description.trim(),
    event.date.trim(),
    event.time.trim(),
    event.image.trim(),
    event.location.trim(),
  ];

  db.query(query, values, (error, results) => {
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ message: 'An error occurred while saving the event.' });
    }

    res.json({
      event: {
        id: results.insertId,
        ...event,
      },
    });
  });
});

app.post('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { event } = req.body;

  if (!event) {
    return res.status(400).json({ message: 'Event is required' });
  }

  if (
    !event.title?.trim() ||
    !event.description?.trim() ||
    !event.date?.trim() ||
    !event.time?.trim() ||
    !event.image?.trim() ||
    !event.location?.trim()
  ) {
    return res.status(400).json({ message: 'Invalid data provided.' });
  }

  const query = `
    UPDATE events
    SET title = ?, description = ?, date = ?, time = ?, image = ?, location = ?
    WHERE id = ?
  `;
  const values = [
    event.title.trim(),
    event.description.trim(),
    event.date.trim(),
    event.time.trim(),
    event.image.trim(),
    event.location.trim(),
    id,
  ];

  db.query(query, values, (error, results) => {
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ message: 'An error occurred while updating the event.' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    setTimeout(() => {
      res.json({
        event: {
          id,
          ...event,
        },
      });
    }, 1000);
  });
});

app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM events WHERE id = ?';

  db.query(query, [id], (error, results) => {
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ message: 'An error occurred while deleting the event.' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    setTimeout(() => {
      res.json({ message: 'Event deleted' });
    }, 1000);
  });
});

app.use(serveStatic(STATIC_PATH, { index: false }));

app.listen(PORT, () => {
  console.log(`React app listening on port ${PORT}`);
});
