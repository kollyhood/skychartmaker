import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json({ limit: '10mb' })); // Allows base64 poster uploads

// In-Memory App State
let appState = {
  backgroundImage: 'https://unsplash.com', // Default backup image
  theme: {
    bg: '#ffffff',
    text: '#111827'
  },
  products: [
    { id: 'p1', name: 'Potato Big', price: '0.275', top: 5, left: 5, width: 28, height: 28, isVisible: false },
    { id: 'p2', name: 'Cabbage', price: '0.175', top: 5, left: 36, width: 28, height: 28, isVisible: false },
    { id: 'p3', name: 'Pumpkin White', price: '0.225', top: 5, left: 67, width: 28, height: 28, isVisible: false }
  ]
};

// Route to serve our interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- REST API Endpoints ---

// Get current state
app.get('/api/state', (req, res) => {
  res.json(appState);
});

// Show a product box
app.post('/api/products/show', (req, res) => {
  const { id } = req.body;
  const product = appState.products.find(p => p.id === id);
  if (product) {
    product.isVisible = true;
    io.emit('stateUpdated', appState); // Instantly update frontend via websockets
    return res.json({ success: true, message: `Showing ${product.name}` });
  }
  res.status(404).json({ success: false, message: 'Product not found' });
});

// Hide a product box
app.post('/api/products/hide', (req, res) => {
  const { id } = req.body;
  const product = appState.products.find(p => p.id === id);
  if (product) {
    product.isVisible = false;
    io.emit('stateUpdated', appState);
    return res.json({ success: true, message: `Hiding ${product.name}` });
  }
  res.status(404).json({ success: false, message: 'Product not found' });
});

// Admin Poster Upload & Theme Updates
app.post('/api/poster', (req, res) => {
  const { image, theme } = req.body;
  if (image) appState.backgroundImage = image;
  if (theme) appState.theme = theme;
  
  io.emit('stateUpdated', appState);
  res.json({ success: true, message: 'Poster updated successfully' });
});

// WebSockets Connection
io.on('connection', (socket) => {
  console.log('Client display connected:', socket.id);
  socket.emit('stateUpdated', appState); // Sync current state immediately upon load
});

const port = process.env.PORT
httpServer.listen(port, () => {
  console.log(`🚀 Supermarket App running at http://localhost:${port}`);
});
