import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Truck, AlertCircle } from 'lucide-react';

interface EstoqueStatusProps {
  produto?: {
    id: number;
    nome: string;
    quantidade_atual: number;
    quantidade_pronta_entrega: number;
    quantidade_encomenda: number;
    quantidade_minima: number;
    unidade_medida: string;
  };
  tipoPedido?: 'pronta_entrega' | 'encomenda';
}

export function EstoqueStatus({ produto, tipoPedido = 'pronta_entrega' }: EstoqueStatusProps) {
  if (!produto) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Selecione um produto para ver o status do estoque
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    nome,
    quantidade_atual,
    quantidade_pronta_entrega,
    quantidade_encomenda,
    quantidade_minima,
    unidade_medida
  } = produto;

  const getStatusColor = (quantidade: number, minima: number): "default" | "secondary" | "destructive" | "outline" => {
    if (quantidade === 0) return 'destructive';
    if (quantidade <= minima) return 'outline';
    return 'default';
  };

  const getStatusColorClass = (quantidade: number, minima: number): string => {
    if (quantidade === 0) return 'bg-red-100 text-red-800 border-red-200';
    if (quantidade <= minima) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'pronta_entrega':
        return <ShoppingCart className="w-4 h-4" />;
      case 'encomenda':
        return <Package className="w-4 h-4" />;
      default:
        return <Truck className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5" />
          Status do Estoque - {nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estoque Total */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-600" />
            <span className="font-medium">Estoque Total</span>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColorClass(quantidade_atual, quantidade_minima)}`}>
              {quantidade_atual} {unidade_medida}
            </div>
            {quantidade_atual <= quantidade_minima && (
              <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Estoque baixo
              </div>
            )}
          </div>
        </div>

        {/* Estoque Pronta Entrega */}
        <div className={`flex justify-between items-center p-3 rounded-lg ${
          tipoPedido === 'pronta_entrega' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-2">
            {getIcon('pronta_entrega')}
            <span className="font-medium">Pronta Entrega</span>
            {tipoPedido === 'pronta_entrega' && (
              <Badge variant="outline" className="text-xs">Disponível para este pedido</Badge>
            )}
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColorClass(quantidade_pronta_entrega, quantidade_minima)}`}>
              {quantidade_pronta_entrega} {unidade_medida}
            </div>
            {tipoPedido === 'pronta_entrega' && quantidade_pronta_entrega === 0 && (
              <div className="text-xs text-red-600 mt-1">
                Sem estoque disponível
              </div>
            )}
          </div>
        </div>

        {/* Estoque Encomenda */}
        <div className={`flex justify-between items-center p-3 rounded-lg ${
          tipoPedido === 'encomenda' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-2">
            {getIcon('encomenda')}
            <span className="font-medium">Encomenda</span>
            {tipoPedido === 'encomenda' && (
              <Badge variant="outline" className="text-xs text-blue-600">Será produzido</Badge>
            )}
          </div>
          <div className="text-right">
            <Badge variant="secondary">
              {quantidade_encomenda} {unidade_medida}
            </Badge>
            {tipoPedido === 'encomenda' && (
              <div className="text-xs text-blue-600 mt-1">
                Produto será produzido
              </div>
            )}
          </div>
        </div>

        {/* Explicação das Regras */}
        <div className="pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">💡 Regras de Estoque:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• <strong>Pronta Entrega:</strong> Produtos em estoque que saem imediatamente ao criar o pedido</p>
            <p>• <strong>Encomenda:</strong> Produtos entram no estoque quando produzidos (status: "Produzido")</p>
            <p>• <strong>Separação:</strong> Estoque de encomenda não é visível para pedidos de pronta entrega</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 