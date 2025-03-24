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

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  // Fetch all lists
  const { data: lists = [] } = useQuery({
    queryKey: ["/api/lists"],
    queryFn: () => apiRequest("GET", "/api/lists").then((res) => res.json()),
  });

  // Fetch all items for all lists
  const { data: allItems = [] } = useQuery({
    queryKey: ["/api/items"],
    queryFn: () => apiRequest("GET", "/api/items").then((res) => res.json()),
  });

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
    },
  });

  const listForm = useForm({
    resolver: zodResolver(insertListSchema),
  });

  const calculateTotal = (items: any[]) => {
    return items?.reduce((total, item) => total + item.price * item.quantity, 0) || 0;
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
                onSubmit={listForm.handleSubmit((data) =>
                  createListMutation.mutate(data)
                )}
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
          {lists?.map((list: any) => {
            // Filter items for the current list
            const listItems = allItems.filter((item: any) => item.listId === list.id);
            const total = calculateTotal(listItems);

            return (
              <Card key={list.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{list.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {}}
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
                    <span>Items: {listItems.length}</span>
                    <span>Total: R$ {total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}