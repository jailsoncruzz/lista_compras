import Parse from "parse/node";
import session from "express-session";
import { User, InsertUser, ShoppingList, ListItem } from "@shared/schema";
import { IStorage } from "./storage-interface";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

// Initialize Parse
Parse.initialize(
  process.env.BACK4APP_APP_ID!,
  process.env.BACK4APP_JAVASCRIPT_KEY!,
  process.env.BACK4APP_MASTER_KEY
);
Parse.serverURL = "https://parseapi.back4app.com/";

export class Back4AppStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new SessionStore({
      checkPeriod: 86400000,
    });
  }

  private async getParseUser(id: number): Promise<Parse.Object> {
    const query = new Parse.Query("User");
    query.equalTo("localId", id);
    const user = await query.first();
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const parseUser = await this.getParseUser(id);
      return {
        id: parseUser.get("localId"),
        username: parseUser.get("username"),
        password: parseUser.get("password"),
      };
    } catch (error) {
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const query = new Parse.Query("User");
    query.equalTo("username", username);
    try {
      const user = await query.first();
      if (!user) return undefined;

      return {
        id: user.get("localId"),
        username: user.get("username"),
        password: user.get("password"),
      };
    } catch (error) {
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const query = new Parse.Query("User");
    query.descending("localId");
    const lastUser = await query.first();
    const nextId = (lastUser?.get("localId") || 0) + 1;

    const user = new Parse.Object("User");
    user.set("localId", nextId);
    user.set("username", insertUser.username);
    user.set("password", insertUser.password);
    await user.save(null, { useMasterKey: true });

    return {
      id: nextId,
      ...insertUser,
    };
  }

  async getLists(userId: number): Promise<ShoppingList[]> {
    const query = new Parse.Query("ShoppingList");
    query.equalTo("userId", userId);
    const lists = await query.find();

    return lists.map(list => ({
      id: list.get("localId"),
      userId: list.get("userId"),
      name: list.get("name"),
      date: list.get("date"),
      description: list.get("description"),
    }));
  }

  async getList(id: number): Promise<ShoppingList | undefined> {
    const query = new Parse.Query("ShoppingList");
    query.equalTo("localId", id);
    try {
      const list = await query.first();
      if (!list) return undefined;

      return {
        id: list.get("localId"),
        userId: list.get("userId"),
        name: list.get("name"),
        date: list.get("date"),
        description: list.get("description"),
      };
    } catch (error) {
      return undefined;
    }
  }

  async createList(userId: number, list: Omit<ShoppingList, "id" | "userId">): Promise<ShoppingList> {
    const query = new Parse.Query("ShoppingList");
    query.descending("localId");
    const lastList = await query.first();
    const nextId = (lastList?.get("localId") || 0) + 1;

    const newList = new Parse.Object("ShoppingList");
    newList.set("localId", nextId);
    newList.set("userId", userId);
    newList.set("name", list.name);
    newList.set("date", list.date);
    newList.set("description", list.description);
    await newList.save();

    return {
      id: nextId,
      userId,
      ...list,
    };
  }

  async updateList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList | undefined> {
    const query = new Parse.Query("ShoppingList");
    query.equalTo("localId", id);
    const list = await query.first();
    if (!list) return undefined;

    if (updates.name) list.set("name", updates.name);
    if (updates.date) list.set("date", updates.date);
    if (updates.description) list.set("description", updates.description);
    await list.save();

    return {
      id: list.get("localId"),
      userId: list.get("userId"),
      name: list.get("name"),
      date: list.get("date"),
      description: list.get("description"),
    };
  }

  async deleteList(id: number): Promise<void> {
    const query = new Parse.Query("ShoppingList");
    query.equalTo("localId", id);
    const list = await query.first();
    if (list) {
      await list.destroy();

      // Delete associated items
      const itemQuery = new Parse.Query("ListItem");
      itemQuery.equalTo("listId", id);
      const items = await itemQuery.find();
      await Parse.Object.destroyAll(items);
    }
  }

  async getItems(listId: number): Promise<ListItem[]> {
    const query = new Parse.Query("ListItem");
    query.equalTo("listId", listId);
    const items = await query.find();

    return items.map(item => ({
      id: item.get("localId"),
      listId: item.get("listId"),
      name: item.get("name"),
      price: item.get("price"),
      quantity: item.get("quantity"),
    }));
  }

  async createItem(listId: number, item: Omit<ListItem, "id" | "listId">): Promise<ListItem> {
    const query = new Parse.Query("ListItem");
    query.descending("localId");
    const lastItem = await query.first();
    const nextId = (lastItem?.get("localId") || 0) + 1;

    const newItem = new Parse.Object("ListItem");
    newItem.set("localId", nextId);
    newItem.set("listId", listId);
    newItem.set("name", item.name);
    newItem.set("price", item.price);
    newItem.set("quantity", item.quantity);
    await newItem.save();

    return {
      id: nextId,
      listId,
      ...item,
    };
  }

  async updateItem(id: number, updates: Partial<ListItem>): Promise<ListItem | undefined> {
    const query = new Parse.Query("ListItem");
    query.equalTo("localId", id);
    const item = await query.first();
    if (!item) return undefined;

    if (updates.name) item.set("name", updates.name);
    if (updates.price) item.set("price", updates.price);
    if (updates.quantity) item.set("quantity", updates.quantity);
    await item.save();

    return {
      id: item.get("localId"),
      listId: item.get("listId"),
      name: item.get("name"),
      price: item.get("price"),
      quantity: item.get("quantity"),
    };
  }

  async deleteItem(id: number): Promise<void> {
    const query = new Parse.Query("ListItem");
    query.equalTo("localId", id);
    const item = await query.first();
    if (item) {
      await item.destroy();
    }
  }
}