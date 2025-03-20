import Parse from "parse/node";
import session from "express-session";
import { User, InsertUser, ShoppingList, ListItem } from "@shared/schema";
import { IStorage } from "./storage-interface";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

// Verificar se todas as credenciais necessárias estão presentes
if (!process.env.BACK4APP_APP_ID || !process.env.BACK4APP_JAVASCRIPT_KEY || !process.env.BACK4APP_MASTER_KEY) {
  throw new Error("Back4App credentials are missing");
}

// Inicializar Parse com as credenciais do Back4App
Parse.initialize(
  process.env.BACK4APP_APP_ID,
  process.env.BACK4APP_JAVASCRIPT_KEY,
  process.env.BACK4APP_MASTER_KEY
);
Parse.serverURL = "https://parseapi.back4app.com/";

// Criar as classes no Back4App se não existirem
async function ensureParseClasses() {
  try {
    // ShoppingList Class
    const shoppingListSchema = new Parse.Schema('ShoppingList');
    await shoppingListSchema.save({
      fields: {
        localId: { type: 'Number', required: true },
        userId: { type: 'Number', required: true },
        name: { type: 'String', required: true },
        date: { type: 'Date', required: true },
        description: { type: 'String' }
      }
    }, { useMasterKey: true });

    // ListItem Class
    const listItemSchema = new Parse.Schema('ListItem');
    await listItemSchema.save({
      fields: {
        localId: { type: 'Number', required: true },
        listId: { type: 'Number', required: true },
        name: { type: 'String', required: true },
        price: { type: 'Number', required: true },
        quantity: { type: 'Number', required: true }
      }
    }, { useMasterKey: true });

    console.log("Parse classes initialized successfully");
  } catch (error) {
    // Ignora erro se as classes já existirem
    if (error.code !== Parse.Error.INVALID_CLASS_NAME) {
      console.error("Error initializing Parse classes:", error);
    }
  }
}

export class Back4AppStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new SessionStore({
      checkPeriod: 86400000,
    });
    // Inicializar as classes do Parse
    ensureParseClasses().catch(console.error);
  }

  private async getParseUser(id: number): Promise<Parse.Object> {
    const query = new Parse.Query(Parse.User);
    query.equalTo("localId", id);
    const user = await query.first({ useMasterKey: true });
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const parseUser = await this.getParseUser(id);
      return {
        id: parseUser.get("localId"),
        username: parseUser.get("username"),
        password: parseUser.get("hashedPassword"),
      };
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const query = new Parse.Query(Parse.User);
    query.equalTo("username", username);
    try {
      const user = await query.first({ useMasterKey: true });
      if (!user) return undefined;

      return {
        id: user.get("localId"),
        username: user.get("username"),
        password: user.get("hashedPassword"),
      };
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const query = new Parse.Query(Parse.User);
    query.descending("localId");
    const lastUser = await query.first({ useMasterKey: true });
    const nextId = (lastUser?.get("localId") || 0) + 1;

    const user = new Parse.User();
    user.set("localId", nextId);
    user.set("username", insertUser.username);
    user.set("password", insertUser.password);
    // Salvar senha criptografada em um campo separado para nossa aplicação
    user.set("hashedPassword", insertUser.password);
    await user.signUp();

    return {
      id: nextId,
      ...insertUser,
    };
  }

  async getLists(userId: number): Promise<ShoppingList[]> {
    const query = new Parse.Query("ShoppingList");
    query.equalTo("userId", userId);
    try {
      const lists = await query.find({ useMasterKey: true });
      return lists.map(list => ({
        id: list.get("localId"),
        userId: list.get("userId"),
        name: list.get("name"),
        date: list.get("date"),
        description: list.get("description"),
      }));
    } catch (error) {
      console.error("Error getting lists:", error);
      return [];
    }
  }

  async getList(id: number): Promise<ShoppingList | undefined> {
    const query = new Parse.Query("ShoppingList");
    query.equalTo("localId", id);
    try {
      const list = await query.first({ useMasterKey: true });
      if (!list) return undefined;

      return {
        id: list.get("localId"),
        userId: list.get("userId"),
        name: list.get("name"),
        date: list.get("date"),
        description: list.get("description"),
      };
    } catch (error) {
      console.error("Error getting list:", error);
      return undefined;
    }
  }

  async createList(userId: number, list: Omit<ShoppingList, "id" | "userId">): Promise<ShoppingList> {
    const query = new Parse.Query("ShoppingList");
    query.descending("localId");
    const lastList = await query.first({ useMasterKey: true });
    const nextId = (lastList?.get("localId") || 0) + 1;

    const newList = new Parse.Object("ShoppingList");
    newList.set("localId", nextId);
    newList.set("userId", userId);
    newList.set("name", list.name);
    newList.set("date", new Date(list.date));
    newList.set("description", list.description);
    await newList.save(null, { useMasterKey: true });

    return {
      id: nextId,
      userId,
      ...list,
    };
  }

  async updateList(id: number, updates: Partial<ShoppingList>): Promise<ShoppingList | undefined> {
    const query = new Parse.Query("ShoppingList");
    query.equalTo("localId", id);
    try {
      const list = await query.first({ useMasterKey: true });
      if (!list) return undefined;

      if (updates.name) list.set("name", updates.name);
      if (updates.date) list.set("date", new Date(updates.date));
      if (updates.description) list.set("description", updates.description);
      await list.save(null, { useMasterKey: true });

      return {
        id: list.get("localId"),
        userId: list.get("userId"),
        name: list.get("name"),
        date: list.get("date"),
        description: list.get("description"),
      };
    } catch (error) {
      console.error("Error updating list:", error);
      return undefined;
    }
  }

  async deleteList(id: number): Promise<void> {
    const query = new Parse.Query("ShoppingList");
    query.equalTo("localId", id);
    try {
      const list = await query.first({ useMasterKey: true });
      if (list) {
        await list.destroy({ useMasterKey: true });

        // Delete associated items
        const itemQuery = new Parse.Query("ListItem");
        itemQuery.equalTo("listId", id);
        const items = await itemQuery.find({ useMasterKey: true });
        await Parse.Object.destroyAll(items, { useMasterKey: true });
      }
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  }

  async getItems(listId: number): Promise<ListItem[]> {
    const query = new Parse.Query("ListItem");
    query.equalTo("listId", listId);
    try {
      const items = await query.find({ useMasterKey: true });
      return items.map(item => ({
        id: item.get("localId"),
        listId: item.get("listId"),
        name: item.get("name"),
        price: item.get("price"),
        quantity: item.get("quantity"),
      }));
    } catch (error) {
      console.error("Error getting items:", error);
      return [];
    }
  }

  async createItem(listId: number, item: Omit<ListItem, "id" | "listId">): Promise<ListItem> {
    const query = new Parse.Query("ListItem");
    query.descending("localId");
    const lastItem = await query.first({ useMasterKey: true });
    const nextId = (lastItem?.get("localId") || 0) + 1;

    const newItem = new Parse.Object("ListItem");
    newItem.set("localId", nextId);
    newItem.set("listId", listId);
    newItem.set("name", item.name);
    newItem.set("price", item.price);
    newItem.set("quantity", item.quantity);
    await newItem.save(null, { useMasterKey: true });

    return {
      id: nextId,
      listId,
      ...item,
    };
  }

  async updateItem(id: number, updates: Partial<ListItem>): Promise<ListItem | undefined> {
    const query = new Parse.Query("ListItem");
    query.equalTo("localId", id);
    try {
      const item = await query.first({ useMasterKey: true });
      if (!item) return undefined;

      if (updates.name) item.set("name", updates.name);
      if (updates.price) item.set("price", updates.price);
      if (updates.quantity) item.set("quantity", updates.quantity);
      await item.save(null, { useMasterKey: true });

      return {
        id: item.get("localId"),
        listId: item.get("listId"),
        name: item.get("name"),
        price: item.get("price"),
        quantity: item.get("quantity"),
      };
    } catch (error) {
      console.error("Error updating item:", error);
      return undefined;
    }
  }

  async deleteItem(id: number): Promise<void> {
    const query = new Parse.Query("ListItem");
    query.equalTo("localId", id);
    try {
      const item = await query.first({ useMasterKey: true });
      if (item) {
        await item.destroy({ useMasterKey: true });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  }
}