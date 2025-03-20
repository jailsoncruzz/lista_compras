import { IStorage } from "./storage.ts";
import createMemoryStore from "memorystore";
import session from "express-session";
import { User, InsertUser, ShoppingList, ListItem } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLists(userId: number): Promise<ShoppingList[]>;
  getList(id: number): Promise<ShoppingList | undefined>;
  createList(userId: number, list: Omit<ShoppingList, "id" | "userId">): Promise<ShoppingList>;
  updateList(id: number, list: Partial<ShoppingList>): Promise<ShoppingList | undefined>;
  deleteList(id: number): Promise<void>;
  
  getItems(listId: number): Promise<ListItem[]>;
  createItem(listId: number, item: Omit<ListItem, "id" | "listId">): Promise<ListItem>;
  updateItem(id: number, item: Partial<ListItem>): Promise<ListItem | undefined>;
  deleteItem(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private lists: Map<number, ShoppingList>;
  private items: Map<number, ListItem>;
  private currentUserId: number;
  private currentListId: number;
  private currentItemId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.lists = new Map();
    this.items = new Map();
    this.currentUserId = 1;
    this.currentListId = 1;
    this.currentItemId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getLists(userId: number): Promise<ShoppingList[]> {
    return Array.from(this.lists.values()).filter(list => list.userId === userId);
  }

  async getList(id: number): Promise<ShoppingList | undefined> {
    return this.lists.get(id);
  }

  async createList(userId: number, list: Omit<ShoppingList, "id" | "userId">): Promise<ShoppingList> {
    const id = this.currentListId++;
    const newList: ShoppingList = { ...list, id, userId };
    this.lists.set(id, newList);
    return newList;
  }

  async updateList(id: number, list: Partial<ShoppingList>): Promise<ShoppingList | undefined> {
    const existing = this.lists.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...list };
    this.lists.set(id, updated);
    return updated;
  }

  async deleteList(id: number): Promise<void> {
    this.lists.delete(id);
    // Delete associated items
    for (const [itemId, item] of this.items.entries()) {
      if (item.listId === id) {
        this.items.delete(itemId);
      }
    }
  }

  async getItems(listId: number): Promise<ListItem[]> {
    return Array.from(this.items.values()).filter(item => item.listId === listId);
  }

  async createItem(listId: number, item: Omit<ListItem, "id" | "listId">): Promise<ListItem> {
    const id = this.currentItemId++;
    const newItem: ListItem = { ...item, id, listId };
    this.items.set(id, newItem);
    return newItem;
  }

  async updateItem(id: number, item: Partial<ListItem>): Promise<ListItem | undefined> {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...item };
    this.items.set(id, updated);
    return updated;
  }

  async deleteItem(id: number): Promise<void> {
    this.items.delete(id);
  }
}

export const storage = new MemStorage();
