import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { insertListSchema, insertItemSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, Plus, Eye, Trash2, Edit2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useState } from "react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedList, setSelectedList] = useState<any>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch all lists
  const { data: lists = [] } = useQuery({
    queryKey: ["/api/lists"],
    queryFn: () => apiRequest("GET", "/api/lists").then((res) => res.json()),
  });

  // Fetch items per list
  const { data: items = [] } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const allItems = [];
      for (const list of lists) {
        const listItems = await apiRequest("GET", `/api/lists/${list.id}/items`).then((res) => res.json());
        allItems.push(...listItems);
      }
      return allItems;
    },
    enabled: lists.length > 0,
  });

  const getListItems = (listId: number) => {
    return items.filter(item => item.listId === listId);
  };

  // Mutations
  const createListMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/lists", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setSelectedList(null);
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/lists/${selectedList.id}/items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${selectedList.id}/items`] });
      itemForm.reset();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/lists/${selectedList.id}/items/${editingItem.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${selectedList.id}/items`] });
      setEditingItem(null);
      itemForm.reset();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest("DELETE", `/api/lists/${selectedList.id}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lists/${selectedList.id}/items`] });
    },
  });

  const listForm = useForm({
    resolver: zodResolver(insertListSchema),
  });

  const itemForm = useForm({
    resolver: zodResolver(insertItemSchema),
  });

  const calculateTotal = (items: any[]) => {
    return items?.reduce((total, item) => total + item.price * item.quantity, 0) || 0;
  };

  const handleItemSubmit = (data: any) => {
    if (editingItem) {
      updateItemMutation.mutate(data);
    } else {
      createItemMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Lista de Compras</h1>
          <div className="flex items-center gap-4">
            <span>Olá, {user?.username}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Suas Listas</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Lista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Lista</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={listForm.handleSubmit((data) => createListMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" {...listForm.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    {...listForm.register("date")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    {...listForm.register("description")}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Criar Lista
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists?.map((list: any) => (
            <Card key={list.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{list.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedList(list);
                      setIsItemDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteListMutation.mutate(list.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {format(new Date(list.date), "dd/MM/yyyy")}
                </p>
                <p className="text-sm mb-4">{list.description}</p>
                <div className="flex justify-between text-sm">
                  <span>Items: {getListItems(list.id).length}</span>
                  <span>Total: R$ {calculateTotal(getListItems(list.id)).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedList?.name} - Itens</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <form
              onSubmit={itemForm.handleSubmit(handleItemSubmit)}
              className="grid grid-cols-4 gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Item</Label>
                <Input
                  id="name"
                  {...itemForm.register("name")}
                  defaultValue={editingItem?.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...itemForm.register("price", { valueAsNumber: true })}
                  defaultValue={editingItem?.price}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...itemForm.register("quantity", { valueAsNumber: true })}
                  defaultValue={editingItem?.quantity}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  {editingItem ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
            <div className="space-y-4">
              {items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingItem(item);
                        itemForm.reset({
                          name: item.name,
                          price: item.price,
                          quantity: item.quantity,
                        });
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {items.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">Total</p>
                    <p className="font-bold">R$ {calculateTotal(items).toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}