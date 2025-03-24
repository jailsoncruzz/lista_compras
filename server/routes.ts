import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Shopping Lists Routes
  app.get("/api/lists", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lists = await storage.getLists(req.user.id);
    res.json(lists);
  });

  app.post("/api/lists", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.createList(req.user.id, req.body);
    res.status(201).json(list);
  });

  app.patch("/api/lists/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.getList(parseInt(req.params.id));
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user.id) return res.sendStatus(403);
    
    const updated = await storage.updateList(parseInt(req.params.id), req.body);
    res.json(updated);
  });

  app.delete("/api/lists/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.getList(parseInt(req.params.id));
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user.id) return res.sendStatus(403);
    
    await storage.deleteList(parseInt(req.params.id));
    res.sendStatus(200);
  });

  // List Items Routes
  app.get("/api/lists/:id/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.getList(parseInt(req.params.id));
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user.id) return res.sendStatus(403);
    
    const items = await storage.getItems(parseInt(req.params.id));
    res.json(items);
  });

  app.post("/api/lists/:id/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.getList(parseInt(req.params.id));
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user.id) return res.sendStatus(403);
    
    const item = await storage.createItem(parseInt(req.params.id), req.body);
    res.status(201).json(item);
  });

  app.patch("/api/lists/:listId/items/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.getList(parseInt(req.params.listId));
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user.id) return res.sendStatus(403);
    
    const updated = await storage.updateItem(parseInt(req.params.itemId), req.body);
    if (!updated) return res.sendStatus(404);
    res.json(updated);
  });

  app.delete("/api/lists/:listId/items/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.getList(parseInt(req.params.listId));
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user.id) return res.sendStatus(403);
    
    await storage.deleteItem(parseInt(req.params.itemId));
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}
