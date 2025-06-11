import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import { OrderItem } from "@/hooks/useOrders";
import { useProductsForSale } from "@/hooks/useProductsForSale";
import { useToast } from "@/hooks/use-toast";

interface OrderItemsProps {
  items: OrderItem[];
  onItemsChange: (items: OrderItem[]) => void;
}

export function OrderItems({ items, onItemsChange }: OrderItemsProps) {
  const { products, loading: productsLoading, error: productsError, fetchProductsForSale } = useProductsForSale();
  const { toast } = useToast();
  const [newItem, setNewItem] = useState({
    productId: "",
    productName: "",
    quantity: 1,
    unitPrice: 0
  });

  const addItem = () => {
    try {
      if (!newItem.productId || !newItem.productName || newItem.unitPrice <= 0) {
        toast({
          title: "Erro ao adicionar item",
          description: "Por favor, selecione um produto e verifique o preço.",
          variant: "destructive",
        });
        return;
      }

      if (newItem.quantity <= 0) {
        toast({
          title: "Erro ao adicionar item",
          description: "A quantidade deve ser maior que zero.",
          variant: "destructive",
        });
        return;
      }

      const item: OrderItem = {
        id: Date.now().toString(),
        productId: parseInt(newItem.productId),
        productName: newItem.productName,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
        total: newItem.quantity * newItem.unitPrice
      };

      console.log('Adicionando item:', item);
      
      onItemsChange([...items, item]);
      setNewItem({ productId: "", productName: "", quantity: 1, unitPrice: 0 });
      
      toast({
        title: "Item adicionado",
        description: `${item.productName} foi adicionado ao pedido.`,
      });
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro ao adicionar item",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const removeItem = (id: string) => {
    try {
      onItemsChange(items.filter(item => item.id !== id));
      toast({
        title: "Item removido",
        description: "O item foi removido do pedido.",
      });
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast({
        title: "Erro ao remover item",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    try {
      const updatedItems = items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.total = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      });
      onItemsChange(updatedItems);
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro ao atualizar item",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const updateItemProduct = (id: string, productId: number) => {
    try {
      const selectedProduct = products.find(p => p.id === productId);
      if (!selectedProduct) {
        toast({
          title: "Produto não encontrado",
          description: "O produto selecionado não foi encontrado.",
          variant: "destructive",
        });
        return;
      }

      const updatedItems = items.map(item => {
        if (item.id === id) {
          const updated = { 
            ...item, 
            productId: selectedProduct.id,
            productName: selectedProduct.nome,
            unitPrice: Number(selectedProduct.preco_venda) || 0
          };
          updated.total = updated.quantity * updated.unitPrice;
          return updated;
        }
        return item;
      });
      onItemsChange(updatedItems);
    } catch (error) {
      console.error('Erro ao atualizar produto do item:', error);
      toast({
        title: "Erro ao atualizar produto",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleProductSelect = (productId: string) => {
    try {
      const selectedProduct = products.find(p => p.id === parseInt(productId));
      if (selectedProduct) {
        setNewItem(prev => ({
          ...prev,
          productId,
          productName: selectedProduct.nome,
          unitPrice: Number(selectedProduct.preco_venda) || 0
        }));
      }
    } catch (error) {
      console.error('Erro ao selecionar produto:', error);
      toast({
        title: "Erro ao selecionar produto",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshProducts = async () => {
    try {
      await fetchProductsForSale();
      toast({
        title: "Produtos atualizados",
        description: "A lista de produtos foi atualizada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a lista de produtos.",
        variant: "destructive",
      });
    }
  };

  const totalValue = items.reduce((sum, item) => sum + (item.total || 0), 0);

  // Log para debug
  console.log('OrderItems - Products:', products);
  console.log('OrderItems - Products loading:', productsLoading);
  console.log('OrderItems - Products error:', productsError);
  console.log('OrderItems - Current items:', items);

  if (productsError) {
    return (
      <div className="space-y-4">
        <Label>Itens do Pedido *</Label>
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <p className="text-red-700 mb-3">
            Erro ao carregar produtos: {productsError}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshProducts}
            disabled={productsLoading}
          >
            {productsLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Itens do Pedido *</Label>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefreshProducts}
          disabled={productsLoading}
        >
          {productsLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Atualizar produtos
        </Button>
      </div>
      
      {/* Add new item */}
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5">
          <Label htmlFor="productSelect" className="text-xs">Produto</Label>
          <Select value={newItem.productId} onValueChange={handleProductSelect}>
            <SelectTrigger>
              <SelectValue placeholder={productsLoading ? "Carregando..." : "Selecione um produto"} />
            </SelectTrigger>
            <SelectContent>
              {productsLoading ? (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando produtos...
                  </div>
                </div>
              ) : productsError ? (
                <div className="p-2 text-center text-sm text-red-500">
                  Erro ao carregar produtos
                </div>
              ) : !products || products.length === 0 ? (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Nenhum produto disponível
                </div>
              ) : (
                products.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        R$ {(Number(product.preco_venda) || 0).toFixed(2)} - Estoque: {product.quantidade_atual || 0} {product.unidade_medida || ''}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label htmlFor="quantity" className="text-xs">Qtd</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={newItem.quantity}
            onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
          />
        </div>
        <div className="col-span-3">
          <Label htmlFor="unitPrice" className="text-xs">Preço Unit.</Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            min="0"
            value={newItem.unitPrice}
            onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
            className="bg-gray-50"
            readOnly
          />
        </div>
        <div className="col-span-2">
          <Button 
            type="button" 
            onClick={addItem} 
            size="sm" 
            className="w-full"
            disabled={!newItem.productId || newItem.unitPrice <= 0 || productsLoading}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="w-20">Qtd</TableHead>
                <TableHead className="w-24">Preço Unit.</TableHead>
                <TableHead className="w-24">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Select 
                      value={item.productId ? item.productId.toString() : undefined} 
                      onValueChange={(value) => updateItemProduct(item.id, parseInt(value))}
                    >
                      <SelectTrigger className="border-0 p-0 h-auto focus:ring-0">
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{product.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                R$ {(Number(product.preco_venda) || 0).toFixed(2)} - Estoque: {product.quantidade_atual || 0}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="border-0 p-0 h-auto focus-visible:ring-0"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      R$ {(item.unitPrice || 0).toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      R$ {(item.total || 0).toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="font-bold text-right">Total Geral:</TableCell>
                <TableCell className="font-bold">R$ {totalValue.toFixed(2)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-center text-muted-foreground py-4 border rounded-md">
          Nenhum item adicionado ao pedido
        </p>
      )}
    </div>
  );
}
