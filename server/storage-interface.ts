import session from "express-session";
import { User, InsertUser, ShoppingList, ListItem } from "@shared/schema";

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
